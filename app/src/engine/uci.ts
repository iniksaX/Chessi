/* Chessi engine — local Stockfish 19 (lite) via Emscripten WASM.
   Runs 100% offline on-device. The glue script is injected into the HTML at build
   time as a classic <script> (it assigns itself to document.currentScript._exports)
   together with the base64-inlined wasm binary — so no fetch() is ever needed and
   the engine works from file:// origins inside the Android WebView.

   Protocol notes (hard-won, do not "simplify"):
   - UCI lines arrive newline-free and may be glued into arbitrary chunks.
   - We re-frame them with a prefix tokenizer and keep a 1-line tail buffer.
   - ALL outbound commands are deferred out of the listener to avoid re-entering
     the wasm stack from inside a print callback. */

export interface EngineScore {
  /** centipawns, WHITE perspective */
  cp: number;
  /** mate distance in moves, WHITE perspective perspective; undefined if not mate */
  mate?: number;
  /** engine best move in UCI (e.g. "e2e4") */
  bestMove: string | null;
  /** full PV of the top line (UCI moves) */
  pv: string[];
  depth: number;
  /** top-2 score gap (MultiPV=2) when available, used for Great-move detection */
  secondPvCp?: number;
  secondPvMate?: number;
}

const LINE_STARTERS = ['id name ', 'id author ', 'option name ', 'uciok', 'readyok', 'info ', 'bestmove ', 'copyprotection ', 'registration ']
  .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const SPLIT_RE = new RegExp('(?=' + LINE_STARTERS.join('|') + ')');
const BESTMOVE_RE = /^bestmove [a-h][1-8][a-h][1-8][qrbn]?( ponder [a-h][1-8][a-h][1-8][qrbn]?)?$/;

function b64ToUint8(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

declare global {
  interface Window {
    __SF_FACTORY?: unknown;
    __SF_WASM_B64?: string;
  }
}

type UciHandler = (line: string) => void;

class UciStream {
  private buf = '';
  constructor(private onLine: UciHandler) {}
  feed(chunk: unknown) {
    this.buf += String(chunk ?? '').replace(/\r/g, '');
    const parts = this.buf.split(SPLIT_RE);
    this.buf = '';
    for (let i = 0; i < parts.length; i++) {
      const raw = parts[i];
      const t = (raw || '').trim();
      if (!t) continue;
      const isLast = i === parts.length - 1;
      const terminal = t === 'uciok' || t === 'readyok' || BESTMOVE_RE.test(t);
      if (isLast && !terminal) { this.buf = raw; continue; }
      this.onLine(t);
    }
  }
}

interface PendingSearch {
  resolve: (info: EngineScore) => void;
  multipv: number;
  lines: Map<number, { cp?: number; mate?: number; pv: string[]; depth: number }>;
  bestMove: string | null;
  depth: number;
}

export class StockfishEngine {
  private cfg: Record<string, unknown> = {};
  private outbox: string[] = [];
  private pumping = false;
  private pending: PendingSearch | null = null;
  private handshakeDone = false;
  private readyResolve!: () => void;
  private readonly ready: Promise<void>;
  private constructor() {
    this.ready = new Promise((res) => { this.readyResolve = res; });
  }

  static async create(): Promise<StockfishEngine | null> {
    try {
      const factory = window.__SF_FACTORY as undefined | ((cfg: Record<string, unknown>) => Promise<Record<string, unknown>>);
      const b64 = window.__SF_WASM_B64;
      if (typeof factory !== 'function' || !b64) return null;
      const engine = new StockfishEngine();
      const stream = new UciStream((line) => engine.handleLine(line));
      const cfg: Record<string, unknown> = {
        wasmBinary: b64ToUint8(b64),
        listener: (chunk: unknown) => stream.feed(chunk),
        locateFile: () => '',
      };
      const mod = await factory(cfg);
      engine.cfg = mod as Record<string, unknown>;
      engine.send('uci');
      await engine.ready;
      // keep threads/hash modest for phones
      engine.send('setoption name Hash value 24');
      engine.send('ucinewgame');
      return engine;
    } catch (e) {
      console.warn('[chessi] Stockfish init failed, fallback engine will be used:', e);
      return null;
    }
  }

  private send(cmd: string) {
    this.outbox.push(cmd);
    if (this.pumping) return;
    this.pumping = true;
    while (this.outbox.length) {
      const c = this.outbox.shift()!;
      try {
        (this.cfg.ccall as (f: string, r: unknown, a: string[], v: unknown[]) => void)(
          'command', null, ['string'], [c],
        );
      } catch (e) {
        console.warn('[chessi] engine command failed:', c, e);
      }
    }
    this.pumping = false;
  }

  private handleLine(line: string) {
    if (line === 'uciok') { this.send('isready'); return; }
    if (line === 'readyok') { this.handshakeDone = true; this.readyResolve(); return; }
    const p = this.pending;
    if (!p) return;
    if (line.startsWith('info ')) {
      const depthM = line.match(/depth (\d+)/);
      const mpvM = line.match(/multipv (\d+)/);
      const cpM = line.match(/score cp (-?\d+)/);
      const mateM = line.match(/score mate (-?\d+)/);
      const pvM = line.match(/ pv (.+)$/);
      const idx = mpvM ? parseInt(mpvM[1], 10) : 1;
      if (!depthM || (!cpM && !mateM)) return;
      const depth = parseInt(depthM[1], 10);
      const entry = p.lines.get(idx) ?? { pv: [], depth: 0 };
      entry.depth = depth;
      if (cpM) { entry.cp = parseInt(cpM[1], 10); entry.mate = undefined; }
      if (mateM) { entry.mate = parseInt(mateM[1], 10); entry.cp = undefined; }
      if (pvM) entry.pv = pvM[1].trim().split(/\s+/);
      p.lines.set(idx, entry);
      p.depth = Math.max(p.depth, depth);
      return;
    }
    if (line.startsWith('bestmove')) {
      const m = line.match(/^bestmove (\w+)/);
      p.bestMove = m ? m[1] : null;
      this.flushPending();
    }
  }

  private flushPending() {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    const top = p.lines.get(1);
    const second = p.lines.get(2);
    const res: EngineScore = {
      cp: top?.cp ?? 0,
      mate: top?.mate,
      bestMove: p.bestMove,
      pv: top?.pv ?? [],
      depth: top?.depth ?? p.depth,
      secondPvCp: second?.cp,
      secondPvMate: second?.mate,
    };
    p.resolve(res);
  }

  /** Evaluate a position. Scores returned in WHITE perspective. */
  evaluate(fen: string, depth: number, multipv = 1): Promise<EngineScore> {
    return new Promise((resolve) => {
      this.pending = {
        resolve,
        multipv,
        lines: new Map(),
        bestMove: null,
        depth: 0,
      };
      this.send(`setoption name MultiPV value ${multipv}`);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    }).then((raw) => this.toWhitePerspective(raw as EngineScore, fen));
  }

  private toWhitePerspective(raw: EngineScore, fen: string): EngineScore {
    const whiteToMove = fen.split(' ')[1] !== 'b';
    const s = whiteToMove ? 1 : -1;
    const out: EngineScore = { ...raw, pv: raw.pv };
    if (raw.cp !== undefined) out.cp = raw.cp * s;
    if (raw.mate !== undefined) out.mate = raw.mate * s;
    if (raw.secondPvCp !== undefined) out.secondPvCp = raw.secondPvCp * s;
    if (raw.secondPvMate !== undefined) out.secondPvMate = raw.secondPvMate * s;
    return out;
  }

  setLimitedStrength(elo: number | null) {
    if (elo === null) {
      this.send('setoption name UCI_LimitStrength value false');
    } else {
      const clamped = Math.min(3190, Math.max(1320, Math.round(elo)));
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${clamped}`);
    }
  }

  setSkillLevel(level: number) {
    this.send(`setoption name Skill Level value ${Math.min(20, Math.max(0, Math.round(level)))}`);
  }

  newGame() { this.send('ucinewgame'); }
  stop() { this.send('stop'); }
  isHandshakeDone() { return this.handshakeDone; }
}

/* ---------- Simple built-in fallback (alpha-beta + PSTs) ---------- */
export interface SimpleEval { cp: number; bestMove: string | null }

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const PST_PAWN = [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
const PST_KNIGHT = [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50];
const PST_KING = [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,30,0,0,0,0,30,20, 20,30,10,0,0,10,30,20];

import { Chess } from 'chess.js';

export function simpleEvaluate(fen: string): SimpleEval {
  const chess = new Chess(fen);
  const board = chess.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      const idx = sq.color === 'w' ? (7 - r) * 8 + f : r * 8 + f;
      let v = VAL[sq.type];
      if (sq.type === 'p') v += PST_PAWN[idx];
      else if (sq.type === 'n' || sq.type === 'b') v += PST_KNIGHT[idx] * 0.8;
      else if (sq.type === 'k') v += PST_KING[idx];
      score += sq.color === 'w' ? v : -v;
    }
  }
  // mobility term
  const moves = chess.moves().length;
  score += (chess.turn() === 'w' ? 1 : -1) * moves * 2;
  return { cp: score, bestMove: null }; // always WHITE perspective
}
