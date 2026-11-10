/* Action-based achievement titles.
   Milestones are evaluated from the local stats store only — nothing is
   server-backed, everything works offline. An achievement title is unlocked
   permanently the moment its milestone is reached. */

import type { UserStats } from './storage';

export interface AchievementDef {
  /** matches the TITLES entry id in data/titles.ts */
  titleId: string;
  blurb: string;
  hue: string;
  /** current progress toward the milestone, for the lock UI */
  progress: (s: UserStats) => { current: number; target: number };
  /** secondary requirement text, if any (e.g. accuracy ≥ 90%) */
  requirement?: string;
  unlocked: (s: UserStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    titleId: 'wnm',
    blurb: 'Wired Norm Master — 5 wins in a row against 1500+ Elo bots.',
    hue: '#e0a83d',
    progress: (s) => ({ current: Math.min(s.highEloWinStreak, 5), target: 5 }),
    unlocked: (s) => s.bestHighEloWinStreak >= 5,
  },
  {
    titleId: 'tactician',
    blurb: 'Tactician — solve 100 puzzles with >90% accuracy.',
    hue: '#1bada6',
    requirement: 'Also needs ≥ 90% puzzle accuracy',
    progress: (s) => ({ current: Math.min(s.puzzleCorrect, 100), target: 100 }),
    unlocked: (s) => s.puzzleCorrect >= 100 && s.puzzleAttempts > 0 && (s.puzzleCorrect / s.puzzleAttempts) > 0.9,
  },
  {
    titleId: 'genius',
    blurb: 'Genius — execute 3 Brilliant (!!) sacrifices confirmed by game review.',
    hue: '#c9a0ff',
    progress: (s) => ({ current: Math.min(s.brilliantMoves, 3), target: 3 }),
    unlocked: (s) => s.brilliantMoves >= 3,
  },
  {
    titleId: 'blitzer',
    blurb: 'Blitzer — win a match with less than 5 seconds left on your clock.',
    hue: '#ff6b5b',
    progress: (s) => ({ current: Math.min(s.clutchLowTimeWins, 1), target: 1 }),
    unlocked: (s) => s.clutchLowTimeWins >= 1,
  },
];

export const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.titleId));

export function achievementFor(titleId: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.titleId === titleId);
}

/** ids of every achievement whose milestone has been reached in `s`. */
export function unlockedAchievementIds(s: UserStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.unlocked(s)).map((a) => a.titleId);
}

export function isTitleUnlocked(titleId: string, s: UserStats | null): boolean {
  const ach = achievementFor(titleId);
  if (!ach) return true; // regular, non-achievement title
  if (!s) return false;
  return ach.unlocked(s);
}

/** achievements that flipped from locked → unlocked between two stats snapshots. */
export function newlyUnlocked(before: UserStats, after: UserStats): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !a.unlocked(before) && a.unlocked(after));
}

/** fractional accuracy for puzzle display, or null when no attempts yet. */
export function puzzleAccuracy(s: UserStats): number | null {
  return s.puzzleAttempts > 0 ? s.puzzleCorrect / s.puzzleAttempts : null;
}
