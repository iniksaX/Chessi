/* Bot brain — enforces calibrated strength: UCI_LimitStrength / Skill Level /
   depth caps / deliberate blunder injection / human-feeling think times. */

import { Chess } from 'chess.js';
import type { BotDef } from '../data/bots';
import { bootEngine, evaluatePosition, configureBotStrength, engineReady } from './index';
import { simpleEvaluate } from './uci';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Returns the bot's move after a human-feeling delay. Never throws. */
export async function pickBotMove(fen: string, bot: BotDef): Promise<{ from: string; to: string; promotion?: string } | null> {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true }) as Array<{ from: string; to: string; promotion?: string }>;
  if (!legal.length) return null;

  const delayMs = rand(bot.skill.thinkMs[0], bot.skill.thinkMs[1]);
  const think = new Promise<void>((res) => setTimeout(res, delayMs));

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

  await think; // keep the human-feeling pacing even if search was instant
  return chosen;
}

/** Human-readable move description from UCI for chat/announce lines. */
export function uciToReadable(uci: string): string {
  return uci;
}
