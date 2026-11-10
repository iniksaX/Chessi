/* Puzzles tab — offline tactics database with ratings and streaks. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { useApp } from '../state/AppStore';
import { PUZZLES, PUZZLE_THEMES, type Puzzle } from '../data/puzzles';
import { Board } from '../components/Board';
import { expectedScore } from '../storage';
import { playSound } from '../audio';

export function PuzzlesScreen() {
  const app = useApp();
  const stats = app.stats;
  const [theme, setTheme] = useState<(typeof PUZZLE_THEMES)[number]>('All');
  const [active, setActive] = useState<Puzzle | null>(null);

  const filtered = useMemo(
    () => PUZZLES.filter((p) => theme === 'All' || p.theme === theme),
    [theme],
  );
  const solved = useMemo(() => new Set(stats?.puzzlesSolved ?? []), [stats?.puzzlesSolved]);
  const failed = useMemo(() => new Set(stats?.puzzlesFailed ?? []), [stats?.puzzlesFailed]);
  const solvedCount = PUZZLES.filter((p) => solved.has(p.id)).length;

  return (
    <div className="screen screen-pad" style={{ position: 'relative' }}>
      <div className="h1" style={{ marginTop: 2 }}>Puzzles</div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
        {solvedCount}/{PUZZLES.length} solved · rating {stats?.ratings.puzzle.rating ?? 800}
      </div>

      {/* streak + rating strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="streak-flame" style={{ fontSize: 12 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4-4 5.5-4 10a4 4 0 0 0 8 0c0-1.5-.5-2.5-1.5-4-.5 1.5-1.5 2-2.5 2 .8-2.2.5-5.2-0-8z" /></svg>
          {stats?.currentPuzzleStreak ?? 0} streak
        </div>
        <div className="puzzle-pill">Best {stats?.bestPuzzleStreak ?? 0}</div>
        <div className="puzzle-pill">Puzzle rating {stats?.ratings.puzzle.rating ?? 800}</div>
      </div>

      {/* theme filter */}
      <div className="theme-chips" role="tablist" aria-label="Puzzle themes">
        {PUZZLE_THEMES.map((t) => (
          <button key={t} role="tab" aria-selected={theme === t} className={`tc-chip ${theme === t ? 'active' : ''}`} onClick={() => setTheme(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* puzzle list */}
      <div className="label" style={{ margin: '14px 2px 8px' }}>
        {theme === 'All' ? 'ALL PUZZLES' : theme.toUpperCase()} · {filtered.length}
      </div>
      <div className="puzzle-list">
        {filtered.map((p) => {
          const isSolved = solved.has(p.id);
          const isFailed = failed.has(p.id);
          const difficulty = p.rating < 500 ? '#81b64c' : p.rating < 800 ? '#95bb4e' : p.rating < 1100 ? '#e0a83d' : '#e5533d';
          return (
            <button key={p.id} className="puzzle-row" onClick={() => setActive(p)} aria-label={`Puzzle ${p.id}, rating ${p.rating}`}>
              <div className="puzzle-badge" style={{ background: difficulty }}>{p.rating}</div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div className="pname" style={{ fontSize: 13 }}>{p.theme}</div>
                <div className="muted" style={{ fontSize: 10.5 }}>ID {p.id}</div>
              </div>
              {isSolved && (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#81b64c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              )}
              {isFailed && !isSolved && (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#e5533d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              )}
            </button>
          );
        })}
      </div>

      {active && <PuzzleSession puzzle={active} onClose={() => setActive(null)} />}
    </div>
  );
}

/* ================= puzzle solving session ================= */

function PuzzleSession({ puzzle, onClose }: { puzzle: Puzzle; onClose: () => void }) {
  const app = useApp();
  const [chess] = useState(() => new Chess(puzzle.fen));
  const [positionKey, setPositionKey] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [step, setStep] = useState(0); // index into solution
  const [outcome, setOutcome] = useState<'solving' | 'wrong' | 'solved'>('solving');
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const lockedRef = useRef(false);

  const orientation = chess.turn(); // player always moves the side to move at start

  const recordResult = (success: boolean) => {
    app.updateStats((s) => {
      const score = success ? 1 : 0;
      const exp = expectedScore(s.ratings.puzzle.rating, puzzle.rating);
      const k = 24;
      const delta = Math.round(k * (score - exp));
      const newRating = Math.max(100, s.ratings.puzzle.rating + delta);
      const puzzlesSolved = success
        ? Array.from(new Set([...s.puzzlesSolved, puzzle.id]))
        : s.puzzlesSolved;
      const puzzlesFailed = success
        ? s.puzzlesFailed.filter((id) => id !== puzzle.id)
        : Array.from(new Set([...s.puzzlesFailed, puzzle.id]));
      const currentPuzzleStreak = success ? s.currentPuzzleStreak + 1 : 0;
      return {
        ...s,
        ratings: { ...s.ratings, puzzle: { rating: newRating, peak: Math.max(s.ratings.puzzle.peak, newRating) } },
        puzzlesSolved,
        puzzlesFailed,
        currentPuzzleStreak,
        bestPuzzleStreak: Math.max(s.bestPuzzleStreak, currentPuzzleStreak),
      };
    });
  };

  const finishSolved = () => {
    setOutcome('solved');
    playSound('success');
    recordResult(true);
  };

  /* Auto-play opponent replies */
  useEffect(() => {
    if (outcome !== 'solving') return;
    if (step >= puzzle.solution.length) { finishSolved(); return; }
    // Solutions are stored player-first and alternate: odd steps are opponent replies.
    const isPlayerTurn = step % 2 === 0;
    if (!isPlayerTurn) {
      lockedRef.current = true;
      const expectedUci = puzzle.solution[step];
      const t = setTimeout(() => {
        try {
          const m = chess.move({ from: expectedUci.slice(0, 2), to: expectedUci.slice(2, 4), promotion: expectedUci[4] as 'q' | undefined });
          setLastMove({ from: m.from, to: m.to });
          setPositionKey((k) => k + 1);
          setStep((s) => s + 1);
        } catch (e) {
          console.error('[chessi] puzzle reply failed', e);
        } finally {
          lockedRef.current = false;
        }
      }, 550);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, outcome]);

  const handleMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
    if (lockedRef.current || outcome !== 'solving') return;
    const expectedUci = puzzle.solution[step];
    const played = from + to + (promotion ?? '');
    if (played === expectedUci) {
      chess.move({ from, to, promotion: promotion ?? 'q' });
      playSound('move');
      setLastMove({ from, to });
      setPositionKey((k) => k + 1);
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep >= puzzle.solution.length) finishSolved();
    } else {
      // wrong attempt — fail the puzzle
      playSound('illegal');
      setOutcome('wrong');
      recordResult(false);
    }
  };

  return (
    <div className="puzzle-overlay" role="dialog" aria-modal="true" aria-label={`Puzzle ${puzzle.id}`}>
      <div className="topbar" style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
        <button className="icon-btn" aria-label="Back to puzzles" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div className="h2" style={{ lineHeight: 1.1 }}>{puzzle.theme}</div>
          <div className="muted" style={{ fontSize: 11 }}>Puzzle rating {puzzle.rating}</div>
        </div>
        <button className="icon-btn" aria-label="Hint" onClick={() => setShowHint((v) => !v)}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.7c-.6.5-1 1.4-1 2.3h-6c0-.9-.4-1.8-1-2.3A7 7 0 0 1 12 2z" /></svg>
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 12px', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, minHeight: 22 }}>
          {outcome === 'solving' && (chess.turn() === 'w' ? 'White to move' : 'Black to move')}
          {outcome === 'wrong' && <span className="solver-status wrong">Not quite — the motif is revealed below</span>}
          {outcome === 'solved' && <span className="solver-status correct">Solved! Well played.</span>}
        </div>

        <div style={{ width: '100%', maxWidth: 440 }}>
          <Board
            chess={chess}
            positionKey={positionKey}
            orientation={orientation}
            humanColor={orientation}
            interactive={outcome === 'solving' && chess.turn() === orientation}
            lastMove={lastMove}
            onMove={handleMove}
            showCoordinates
          />
        </div>

        {showHint && (
          <div className="card card-pad" style={{ maxWidth: 440, width: '100%', fontSize: 13 }}>
            <span className="label" style={{ marginBottom: 4, display: 'block' }}>HINT</span>
            {puzzle.hint}
          </div>
        )}

        {outcome === 'wrong' && (
          <div className="card card-pad" style={{ maxWidth: 440, width: '100%', fontSize: 13 }}>
            <span className="label" style={{ marginBottom: 4, display: 'block' }}>SOLUTION</span>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
              {showSolution ? puzzle.solution.join('  ') : '••••••'}
            </div>
            {!showSolution && (
              <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => setShowSolution(true)}>Reveal moves</button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px calc(14px + env(safe-area-inset-bottom))', display: 'flex', gap: 8 }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>Back</button>
        <button className="btn" style={{ flex: 2 }} onClick={onClose}>{outcome === 'solved' ? 'Continue' : 'Skip puzzle'}</button>
      </div>
    </div>
  );
}
