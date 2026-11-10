/* Shared game engine hook for Computer and Pass & Play screens. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { playSound } from '../audio';
import { useApp } from '../state/AppStore';
import { eloDelta, type GameCategory, type GameRecord, type UserStats } from '../storage';
import { newlyUnlocked } from '../achievements';

export interface GameConfig {
  kind: 'computer' | 'passplay';
  timeBase: number;      // seconds
  timeInc: number;       // seconds
  playerColor: 'w' | 'b'; // for passplay: which side YOU sit, cosmetic
  opponentName: string;
  opponentElo: number | null; // null => unrated opponent (pass & play)
  rated: boolean;
  category: GameCategory | 'computer';
  pgnTagEvent: string;
}

export interface GameEndInfo {
  result: 'win' | 'loss' | 'draw';
  winner: 'w' | 'b' | 'draw';
  reason: string;
  pgn: string;
  playerColor: 'w' | 'b';
}

function categoryFor(base: number): GameCategory {
  return base < 180 ? 'bullet' : base < 600 ? 'blitz' : 'rapid';
}

export function useGame(config: GameConfig) {
  const { updateStats, account, toast } = useApp();
  const [chess] = useState(() => {
    const c = new Chess();
    c.header('Event', config.pgnTagEvent, 'Site', 'Chessi (offline)', 'Date', new Date().toISOString().slice(0, 10));
    return c;
  });
  const [positionKey, setPositionKey] = useState(0);
  const [fen, setFen] = useState(chess.fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [endInfo, setEndInfo] = useState<GameEndInfo | null>(null);
  const [clocks, setClocks] = useState<{ w: number; b: number }>({ w: config.timeBase, b: config.timeBase });
  const [activeClock, setActiveClock] = useState<'w' | 'b'>('w');
  const [moveCount, setMoveCount] = useState(0);
  const startTimeRef = useRef(Date.now());
  const endRecordedRef = useRef(false);
  const lastTickRef = useRef(Date.now());

  const clocksRef = useRef({ w: config.timeBase, b: config.timeBase });
  useEffect(() => { clocksRef.current = clocks; }, [clocks]);

  const sideToMove = chess.turn();

  const evaluateResult = useCallback((): { outcome: 'w' | 'b' | 'draw'; reason: string } | null => {
    if (chess.isCheckmate()) return { outcome: chess.turn() === 'w' ? 'b' : 'w', reason: 'checkmate' };
    if (chess.isStalemate()) return { outcome: 'draw', reason: 'stalemate' };
    if (chess.isInsufficientMaterial()) return { outcome: 'draw', reason: 'insufficient material' };
    if (chess.isThreefoldRepetition()) return { outcome: 'draw', reason: 'threefold repetition' };
    if (chess.isDraw()) return { outcome: 'draw', reason: 'fifty-move rule' };
    return null;
  }, [chess]);

  const finalizeGame = useCallback((outcome: 'w' | 'b' | 'draw', reason: string, flagged?: 'w' | 'b') => {
    if (endRecordedRef.current) return;
    endRecordedRef.current = true;

    const playerColor = config.playerColor;
    const result: 'win' | 'loss' | 'draw' = outcome === 'draw' ? 'draw' : outcome === playerColor ? 'win' : 'loss';
    const resultTag = outcome === 'draw' ? '1/2-1/2' : outcome === 'w' ? '1-0' : '0-1';
    chess.header('Result', resultTag, 'White', playerColor === 'w' ? (account?.displayName || 'You') : config.opponentName,
      'Black', playerColor === 'b' ? (account?.displayName || 'You') : config.opponentName);

    const pgn = chess.pgn();

    setStatus('over');
    setEndInfo({ result, winner: outcome, reason, pgn, playerColor });
    playSound(result === 'win' ? 'success' : result === 'loss' ? 'fail' : 'end');

    if (config.rated && config.opponentElo !== null && account) {
      const cat: GameCategory = categoryFor(config.timeBase);
      const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
      let unlockedNow: string[] = [];
      updateStats((s) => {
        const cur = s.ratings[cat].rating;
        const delta = eloDelta(cur, config.opponentElo!, score as 1 | 0.5 | 0);
        const newRating = Math.max(100, cur + delta);
        const record = { ...s.record };
        const r = { ...record[cat] };
        if (result === 'win') r.w++; else if (result === 'loss') r.l++; else r.d++;
        record[cat] = r;
        const wins = s.wins + (result === 'win' ? 1 : 0);
        const losses = s.losses + (result === 'loss' ? 1 : 0);
        const draws = s.draws + (result === 'draw' ? 1 : 0);
        const currentStreak = result === 'win' ? s.currentStreak + 1 : result === 'loss' ? 0 : s.currentStreak;
        const bestStreak = Math.max(s.bestStreak, currentStreak);
        // [WNM] — wins in a row vs 1500+ Elo bots
        let highEloWinStreak = s.highEloWinStreak;
        if (config.opponentElo! >= 1500) {
          highEloWinStreak = result === 'win' ? s.highEloWinStreak + 1 : 0;
        }
        const bestHighEloWinStreak = Math.max(s.bestHighEloWinStreak, highEloWinStreak);
        const rec: GameRecord = {
          id: `g_${Date.now().toString(36)}`,
          date: Date.now(),
          myColor: playerColor,
          category: cat,
          opponentName: config.opponentName,
          opponentElo: config.opponentElo,
          result,
          myAccuracy: null,
          pgn,
          endReason: reason,
          flagged: false,
        };
        const history = [rec, ...s.history].slice(0, 100);
        const next = {
          ...s,
          ratings: {
            ...s.ratings,
            [cat]: { rating: newRating, peak: Math.max(s.ratings[cat].peak, newRating) },
          },
          record,
          gamesPlayed: s.gamesPlayed + 1,
          wins, losses, draws,
          currentStreak, bestStreak,
          highEloWinStreak, bestHighEloWinStreak,
          bestBotEloBeaten: result === 'win' ? Math.max(s.bestBotEloBeaten, config.opponentElo!) : s.bestBotEloBeaten,
          history,
        };
        unlockedNow = newlyUnlocked(s, next as UserStats).map((a) => a.titleId);
        return next as UserStats;
      });
      for (const id of unlockedNow) {
        toast(id === 'wnm' ? '🏅 Title unlocked: [WNM] — 5 wins in a row vs 1500+ Elo' : `🏅 Title unlocked: ${id}`);
      }
    }

    // [BLITZER] — any win with <5s on the clock (rated or not, any clock)
    if (result === 'win' && config.timeBase > 0 && account) {
      const myColor = config.playerColor;
      const left = clocksRef.current[myColor];
      if (left < 5) {
        let unlockedNow: string[] = [];
        updateStats((s) => {
          const next = { ...s, clutchLowTimeWins: s.clutchLowTimeWins + 1 };
          unlockedNow = newlyUnlocked(s, next).map((a) => a.titleId);
          return next;
        });
        if (unlockedNow.includes('blitzer')) {
          toast('🏅 Title unlocked: [BLITZER] — won with <5s on the clock');
        }
      }
    }
  }, [chess, config, account, updateStats, toast]);

  const applyMove = useCallback((from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
    if (status !== 'playing') return false;
    let mv;
    try {
      mv = chess.move({ from, to, promotion: promotion ?? 'q' });
    } catch {
      playSound('illegal');
      return false;
    }
    const isCapture = !!mv.captured;
    setFen(chess.fen());
    setPositionKey((k) => k + 1);
    setLastMove({ from, to });
    setMoveCount((n) => n + 1);

    // increment for the mover
    const mover = mv.color as 'w' | 'b';
    if (config.timeInc > 0) setClocks((c) => ({ ...c, [mover]: c[mover] + config.timeInc }));

    // sound
    if (chess.isCheckmate() || chess.inCheck()) playSound('check');
    else if (mv.flags.includes('p')) playSound('promote');
    else if (mv.flags.includes('k') || mv.flags.includes('q')) playSound('castle');
    else if (isCapture) playSound('capture');
    else playSound('move');

    const result = evaluateResult();
    if (result) finalizeGame(result.outcome, result.reason);
    return true;
  }, [chess, status, config.timeInc, evaluateResult, finalizeGame]);

  /* ---------- clock ticking ---------- */
  useEffect(() => {
    if (status !== 'playing' || config.timeBase <= 0) return;
    lastTickRef.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setClocks((c) => {
        const low = Math.max(0, c[sideToMove] - dt);
        if (low <= 0) {
          window.clearInterval(id);
          finalizeGame(sideToMove === 'w' ? 'b' : 'w', 'timeout', sideToMove);
          return { ...c, [sideToMove]: 0 };
        }
        return { ...c, [sideToMove]: low };
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [status, sideToMove, config.timeBase, finalizeGame]);

  const formatClock = (v: number) => {
    const total = Math.max(0, v);
    if (total >= 60) {
      const m = Math.floor(total / 60);
      const s = Math.floor(total % 60);
      return `${m}:${String(s).padStart(2, '0')}`;
    }
    const s = Math.floor(total);
    const tenths = Math.floor((total - s) * 10);
    return `${s}.${tenths}`;
  };

  return {
    chess, fen, positionKey, lastMove, status, endInfo, clocks, formatClock,
    activeClock: sideToMove, moveCount, sideToMove,
    applyMove, finalizeGame,
  };
}
