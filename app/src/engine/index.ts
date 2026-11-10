/* Engine facade — Stockfish WASM when available, neat fallback otherwise.
   All scores in WHITE perspective centipawns. */

import { Chess } from 'chess.js';
import { StockfishEngine, simpleEvaluate } from './uci';
import type { Chess as ChessType } from 'chess.js';

export interface EvalResult {
  cp: number;
  mate?: number;         // white perspective, positive = white mates
  bestMove: string | null;
  pv: string[];
  depth: number;
  secondPvCp?: number;   // white perspective
  secondPvMate?: number;
  source: 'stockfish' | 'builtin';
}

let sf: StockfishEngine | null = null;
let sfInit: Promise<StockfishEngine | null> | null = null;

/** All engine traffic funnels through this queue — concurrent searches on the
    single WASM instance would overwrite each other's pending state. */
let opQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T> | T): Promise<T> {
  const next = opQueue.then(fn, fn);
  opQueue = next.catch(() => undefined);
  return next;
}

export async function bootEngine(): Promise<boolean> {
  if (!sfInit) sfInit = StockfishEngine.create();
  sf = await sfInit;
  return !!sf;
}

export function engineReady(): boolean { return !!sf; }
export function resetEngineForNewGame() { sf?.newGame(); }

export async function evaluatePosition(fen: string, depth = 12, multipv = 1): Promise<EvalResult> {
  if (sf) {
    const r = await enqueue(() => sf!.evaluate(fen, depth, multipv));
    return { ...r, source: 'stockfish' };
  }
  const s = simpleEvaluate(fen);
  return { cp: s.cp, bestMove: s.bestMove, pv: [], depth: 1, source: 'builtin' };
}

export async function evaluateBestMove(fen: string, depth: number, multipv = 1): Promise<EvalResult> {
  return evaluatePosition(fen, depth, multipv);
}

export function configureBotStrength(elo: number | null, skillLevel: number): Promise<void> {
  return enqueue(() => {
    if (!sf) return;
    sf.setLimitedStrength(elo);
    sf.setSkillLevel(skillLevel);
  });
}

export { StockfishEngine };
export type { ChessType };
