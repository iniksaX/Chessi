/* Bot brain — enforces calibrated strength: UCI_LimitStrength / Skill Level /
   depth caps / deliberate blunder injection. INSTANT replies by design:
   no artificial think delays — the engine answers on the next frame. */

import { Chess } from 'chess.js';
import type { BotDef } from '../data/bots';
import { bootEngine, evaluatePosition, configureBotStrength, engineReady } from './index';
import { simpleEvaluate } from './uci';

/** Returns the bot's move as fast as the local engine can produce it. Never throws. */
export async function pickBotMove(fen: string, bot: BotDef): Promise<{ from: string; to: string; promotion?: string } | null> {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true }) as Array<{ from: string; to: string; promotion?: string }>;
  if (!legal.length) return null;

  const hasSf = await bootEngine();

  // Deliberate blunder injection keeps low-Elo bots fallible like real humans
  const blunder = Math.random() < bot.skill.blunderRate && legal.length > 1;

  let chosen: { from: string; to: string; promotion?: string } | null = null;

  if (blunder) {
    // prefer a "blunder-y" move: any move that isn't the best guess — here just a random legal move
    chosen = legal[Math.floor(Math.random() * legal.length)];
  } else if (hasSf && engineReady()) {
    configureBotStrength(bot.skill.uciElo, bot.skill.skillLevel);
    try {
      const r = await evaluatePosition(fen, bot.skill.depth, 1);
      const uci = r.bestMove;
      if (uci) {
        const from = uci.slice(0, 2), to = uci.slice(2, 4), promotion = uci[4];
        if (legal.some((m) => m.from === from && m.to === to)) {
          chosen = { from, to, promotion };
        }
      }
    } catch (e) {
      console.warn('[chessi] bot search failed, falling back', e);
    }
  }

  if (!chosen) {
    // Built-in fallback: 1-ply greedy material search with noise
    const ourColor = chess.turn();
    const scored = legal.map((m) => {
      const c2 = new Chess(fen);
      c2.move(m);
      const whitePerspective = simpleEvaluate(c2.fen()).cp;
      const s = ourColor === 'w' ? whitePerspective : -whitePerspective;
      return { m, s };
    });
    scored.sort((a, b) => b.s - a.s);
    // weaker bots sometimes pick a sub-optimal among the top few
    const noiseWindow = ourColor === 'w' || ourColor === 'b' ? (bot.elo < 700 ? 4 : 2) : 2;
    const pickIdx = Math.floor(Math.random() * Math.min(noiseWindow, scored.length));
    chosen = scored[pickIdx]?.m ?? scored[0].m;
  }

  return chosen;
}

/** Human-readable move description from UCI for chat/announce lines. */
export function uciToReadable(uci: string): string {
  return uci;
}
