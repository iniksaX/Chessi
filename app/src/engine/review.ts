/* Chessi game review — move classification, coach lines, anti-cheat scan.
   Works off the PGN; evaluates every position with the local engine. */

import { Chess } from 'chess.js';
import { bootEngine, evaluatePosition, engineReady } from './index';
import { isBookMove } from '../data/openings';
import { cpToWinPercent } from '../storage';
import { COACH_LINES } from '../data/bots';

export type MoveClass =
  | 'brilliant' | 'great' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';

export interface ReviewedMove {
  ply: number;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  color: 'w' | 'b';
  evalCp: number;        // WHITE perspective AFTER the move
  mate?: number;         // WHITE perspective mate distance if any
  bestMove: string | null;
  delta: number;         // mover-perspective cp LOST (positive = worse)
  cls: MoveClass;
  isSacrifice: boolean;
  secondPvCp?: number;
  coach: string;
}

export interface ReviewAnalysis {
  moves: ReviewedMove[];
  evals: number[];               // WHITE perspective cp, index 0 = before move 1
  acpl: { w: number; b: number };
  accuracy: { w: number; b: number };
  accuracyOurs?: number;
  engineMatchRate: { w: number; b: number };
  suspectedEngine: 'w' | 'b' | null;
  openingName?: string;
  totalMoves: number;
  depth: number;
  source: 'stockfish' | 'builtin';
}

export const CLASS_META: Record<MoveClass, { label: string; symbol: string; color: string; blurb: string }> = {
  brilliant: { label: 'Brilliant', symbol: '!!', color: '#1bada6', blurb: 'A sound sacrifice' },
  great: { label: 'Great', symbol: '!', color: '#1f6f3d', blurb: 'The only saving move' },
  best: { label: 'Best', symbol: '✓', color: '#81b64c', blurb: 'Engine’s top choice' },
  book: { label: 'Book', symbol: '📖', color: '#a97b50', blurb: 'Opening theory' },
  good: { label: 'Good', symbol: '·', color: '#57a34c', blurb: 'Playable, slightly off-best' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', color: '#95bb4e', blurb: '0.5 – 1.0 drop' },
  mistake: { label: 'Mistake', symbol: '?', color: '#e0a83d', blurb: '1.0 – 2.0 drop' },
  blunder: { label: 'Blunder', symbol: '??', color: '#e5533d', blurb: '2.0+ drop' },
};

const PIECE_VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 10000 };
const COACH_PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function winPercent(cp: number, mate?: number): number {
  if (mate !== undefined) return mate > 0 ? 1 : 0;
  return cpToWinPercent(cp);
}

/** Find the most valuable undefended friendly/enemy piece for a side. */
export function findHangingPiece(fen: string, color: 'w' | 'b'): { piece: string; square: string; value: number } | null {
  const chess = new Chess(fen);
  const board = chess.board();
  // crude attack maps: use chess.js moves for attacker detection
  const enemy = color === 'w' ? 'b' : 'w';
  const attackerChess = new Chess(fen);
  let best: { piece: string; square: string; value: number } | null = null;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq || sq.color !== color) continue;
      const squareName = 'abcdefgh'[f] + (8 - r);
      const value = PIECE_VALUE[sq.type];
      if (value < 300) continue;
      // defenders: pieces of `color` that attack the square
      const defenders = countAttackers(fen, squareName, color);
      const attackers = countAttackers(fen, squareName, enemy);
      if (attackers > defenders && (!best || value > best.value)) {
        best = { piece: sq.type, square: squareName, value };
      }
    }
  }
  void attackerChess;
  return best;
}

function countAttackers(fen: string, square: string, byColor: 'w' | 'b'): number {
  const chess = new Chess(fen);
  // legal moves for byColor side attacking `square`: easiest is per-piece attack scan
  let count = 0;
  const board = chess.board();
  // use all pseudo-legal moves of both sides by flipping turn if needed
  if (chess.turn() !== byColor) {
    const parts = fen.split(' ');
    parts[1] = byColor;
    try {
      const flipped = new Chess(parts.join(' '));
      return countPseudoAttacks(flipped, square, byColor);
    } catch {
      return 0;
    }
  }
  return countPseudoAttacks(chess, square, byColor);
}

function countPseudoAttacks(chess: Chess, square: string, byColor: 'w' | 'b'): number {
  let count = 0;
  // chess.js: attacked squares via moves to that square — iterate legal moves (may miss pinned attackers, acceptable heuristic)
  const moves = chess.moves({ verbose: true }) as Array<{ to: string; color: string }>;
  for (const m of moves) {
    if (m.to === square && m.color === byColor) count++;
  }
  return count;
}

/** Detect whether the move just played sacrificed material (moved piece now capturable & valuable). */
function detectSacrifice(fenAfter: string, moveUci: string, mover: 'w' | 'b'): boolean {
  const chess = new Chess(fenAfter);
  const board = chess.board();
  const to = moveUci.slice(2, 4);
  const f = to.charCodeAt(0) - 97, r = 8 - parseInt(to[1], 10);
  const sq = board[r][f];
  if (!sq || sq.color !== mover) return false;
  const value = PIECE_VALUE[sq.type];
  if (value < 320) return false; // sacrifices below a minor piece don't count
  const enemy = mover === 'w' ? 'b' : 'w';
  const attackers = countAttackers(fenAfter, to, enemy);
  const defenders = countAttackers(fenAfter, to, mover);
  return attackers > defenders;
}

function classifyMove(args: {
  isBook: boolean;
  isBest: boolean;
  deltaMover: number;      // cp lost from mover perspective (positive = worse)
  isSacrifice: boolean;
  onlyMove: boolean;
  mateDelivered: boolean;
}): MoveClass {
  const { isBook, isBest, deltaMover, isSacrifice, onlyMove, mateDelivered } = args;
  if (isBook) return 'book';
  if (mateDelivered) return isSacrifice ? 'brilliant' : 'best';
  if (isSacrifice && deltaMover <= 40) return 'brilliant';
  if (isBest) {
    if (onlyMove) return 'great';
    return 'best';
  }
  if (deltaMover < 50) return 'good';
  if (deltaMover < 100) return 'inaccuracy';
  if (deltaMover <= 200) return 'mistake';
  return 'blunder';
}

function coachLine(cls: MoveClass, deltaMover: number, hanging: { piece: string } | null, san: string): string {
  const d = (deltaMover / 100).toFixed(1);
  if (cls === 'blunder') {
    if (hanging) return `${COACH_LINES.blunder[0]} It leaves your ${COACH_PIECE[hanging.piece]} undefended — the opponent can simply take it. (${'-'}${d})`;
    return `${pick(COACH_LINES.blunder)} (−${d} vs. best play.)`;
  }
  if (cls === 'mistake') {
    if (hanging) return `This is a mistake: your ${COACH_PIECE[hanging.piece]} is left en prise or a tactic slips away. (−${d})`;
    return `${pick(COACH_LINES.mistake)} (−${d})`;
  }
  if (cls === 'inaccuracy') return `${pick(COACH_LINES.inaccuracy)} (−${d})`;
  if (cls === 'best') return pick(COACH_LINES.best);
  if (cls === 'great') return `${pick(COACH_LINES.great)} (${san})`;
  if (cls === 'brilliant') return pick(COACH_LINES.brilliant);
  if (cls === 'book') return pick(COACH_LINES.book);
  return 'A reasonable, playable move.';
}
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export interface ReviewOptions {
  depth?: number;
  onProgress?: (done: number, total: number) => void;
  ourColor?: 'w' | 'b' | null;
}

export async function analyzeGamePgn(pgn: string, options: ReviewOptions = {}): Promise<ReviewAnalysis> {
  const depth = options.depth ?? 12;
  await bootEngine();
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true }) as Array<{
    san: string; from: string; to: string; piece: string; color: 'w' | 'b'; promotion?: string;
  }>;
  const totalMoves = history.length;

  // replay, collecting fens
  const replay = new Chess();
  const fens: string[] = [replay.fen()];
  const uciMoves: string[] = [];
  for (const m of history) {
    const mv = replay.move({ from: m.from, to: m.to, promotion: m.promotion });
    uciMoves.push(m.from + m.to + (m.promotion ?? ''));
    fens.push(replay.fen());
    void mv;
  }

  // evaluate every position (from white perspective)
  const evals: number[] = [];
  const mates: Array<number | undefined> = [];
  const bestMoves: Array<string | null> = [];
  const secondPvs: Array<number | undefined> = [];
  for (let i = 0; i < fens.length; i++) {
    const r = await evaluatePosition(fens[i], depth, 2);
    const cp = r.mate !== undefined ? (r.mate > 0 ? 100000 - Math.abs(r.mate) * 100 : -100000 + Math.abs(r.mate) * 100) : r.cp;
    evals.push(Math.max(-30000, Math.min(30000, cp)));
    mates.push(r.mate);
    bestMoves.push(r.bestMove);
    secondPvs.push(r.secondPvCp ?? r.secondPvMate);
    options.onProgress?.(i + 1, fens.length);
    // yield to keep the UI responsive between positions
    await new Promise((res) => setTimeout(res, 0));
  }

  const moves: ReviewedMove[] = [];
  const uciSeq: string[] = [];
  const deltas: { w: number[]; b: number[] } = { w: [], b: [] };
  const matchTop1: { w: number; b: number } = { w: 0, b: 0 };
  const counts: { w: number; b: number } = { w: 0, b: 0 };

  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    const color = m.color;
    const uci = uciMoves[i];
    uciSeq.push(uci);
    const isBook = isBookMove([...uciSeq]);
    const evalBeforeW = evals[i];
    const evalAfterW = evals[i + 1];
    const deltaMover = color === 'w' ? evalBeforeW - evalAfterW : evalAfterW - evalBeforeW;
    const delta = isBook ? 0 : Math.max(0, deltaMover);
    const best = bestMoves[i];
    const isBest = best !== null && best === uci;
    const secondCp = bestMoves[i] !== null ? secondPvs[i] : undefined;
    const mateDelivered = mates[i + 1] !== undefined && mates[i + 1]! > 0 === (color === 'w');
    const isSacrifice = detectSacrifice(fens[i + 1], uci, color);
    const onlyMove = secondCp !== undefined && Math.abs(secondCp - evalBeforeW) > 150;
    const cls = classifyMove({ isBook, isBest, deltaMover: Math.max(0, deltaMover), isSacrifice, onlyMove, mateDelivered });
    const hanging = cls === 'blunder' || cls === 'mistake' ? findHangingPiece(fens[i + 1], color) : null;
    const coach = coachLine(cls, Math.max(0, deltaMover), hanging, m.san);

    if (!isBook) {
      deltas[color].push(Math.max(0, deltaMover));
      counts[color]++;
      if (isBest || (best !== null && deltaMover < 10)) matchTop1[color]++;
    }

    moves.push({
      ply: i + 1,
      san: m.san,
      uci,
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
      color,
      evalCp: evalAfterW,
      mate: mates[i + 1],
      bestMove: bestMoves[i],
      delta,
      cls,
      isSacrifice,
      secondPvCp: secondPvs[i],
      coach,
    });
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const acplW = mean(deltas.w);
  const acplB = mean(deltas.b);

  const accFor = (color: 'w' | 'b'): number => {
    const parts: number[] = [];
    for (let i = 0; i < history.length; i++) {
      if (history[i].color !== color) continue;
      const before = winPercent(evals[i]);
      const after = winPercent(evals[i + 1]);
      const wpBefore = color === 'w' ? before : 1 - before;
      const wpAfter = color === 'w' ? after : 1 - after;
      const drop = Math.max(0, wpBefore - wpAfter) * 100;
      const acc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1668));
      parts.push(acc);
    }
    return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 100;
  };
  const accW = accFor('w');
  const accB = accFor('b');

  const rate = (c: 'w' | 'b') => (counts[c] ? matchTop1[c] / counts[c] : 0);
  const suspectedEngine: 'w' | 'b' | null =
    depth >= 12 && history.length >= 14
      ? (rate('w') >= 0.92 && acplW <= 12 ? 'w' : rate('b') >= 0.92 && acplB <= 12 ? 'b' : null)
      : null;

  return {
    moves,
    evals,
    acpl: { w: acplW, b: acplB },
    accuracy: { w: accW, b: accB },
    engineMatchRate: { w: rate('w'), b: rate('b') },
    suspectedEngine,
    openingName: undefined,
    totalMoves,
    depth,
    source: engineReady() ? 'stockfish' : 'builtin',
  };
}
