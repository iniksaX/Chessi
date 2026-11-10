/* Review tab — unlimited engine-powered game review, offline.
   Paste any PGN (or tap a past game) → full analysis: classification badges,
   accuracy, eval graph, opening naming, engine-likelihood anti-cheat scan. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { useApp } from '../state/AppStore';
import { analyzeGamePgn, CLASS_META, type ReviewAnalysis, type MoveClass } from '../engine/review';
import { matchOpening } from '../data/openings';
import { EvalBar, EvalGraph } from '../components/bits';
import { Board } from '../components/Board';
import { playSound } from '../audio';
import { newlyUnlocked } from '../achievements';

const REVIEW_DEPTHS = [
  { depth: 10, label: 'Fast', sub: 'depth 10 · seconds' },
  { depth: 12, label: 'Balanced', sub: 'depth 12 · recommended' },
  { depth: 14, label: 'Deep', sub: 'depth 14 · thorough' },
];

export function ReviewScreen() {
  const app = useApp();
  const stats = app.stats;
  const [pgnInput, setPgnInput] = useState('');
  const [depthChoice, setDepthChoice] = useState(12);
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewTitle, setReviewTitle] = useState<string | undefined>(undefined);
  const [ply, setPly] = useState(0);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [counterFilter, setCounterFilter] = useState<MoveClass | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  /* auto-load the PGN handed over from another tab (end of game, history, famous game) */
  useEffect(() => {
    if (app.reviewPgn) {
      setPgnInput(app.reviewPgn);
      setReviewTitle(app.reviewTitle);
      setPhase('idle');
      setAnalysis(null);
      void runAnalysis(app.reviewPgn, depthChoice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.reviewPgn]);

  async function runAnalysis(pgn: string, depth: number) {
    setPhase('analyzing');
    setError(null);
    setProgress({ done: 0, total: 0 });
    try {
      const result = await analyzeGamePgn(pgn, {
        depth,
        onProgress: (done, total) => { if (mountedRef.current) setProgress({ done, total }); },
      });
      if (!mountedRef.current) return;
      const opening = matchOpening(result.moves.map((m) => m.uci));
      result.openingName = opening ? `${opening.name}` : undefined;
      setAnalysis(result);
      setPly(0);
      setPhase('done');
      playSound('success');

      // stats integration only for games from the user's own history (once per game).
      // Pasted third-party PGNs (e.g. famous games) are analyzed but never touch stats.
      let unlockedNow: string[] = [];
      app.updateStats((s) => {
        const rec = s.history.find((r) => r.pgn === pgn && r.myAccuracy === null);
        if (!rec) {
          return { ...s, totalReviews: s.totalReviews + 1 };
        }
        const ourColor = rec.myColor;
        const ourAcc = result.accuracy[ourColor];
        const suspected = result.suspectedEngine === ourColor;
        // [GENIUS] — brilliant (!!) sacrifices played by the user, engine-confirmed
        const brilliants = result.moves.filter((m) => m.cls === 'brilliant' && m.color === ourColor).length;
        const next = {
          ...s,
          history: s.history.map((r) =>
            r.pgn === pgn && r.myAccuracy === null
              ? { ...r, myAccuracy: Math.round(ourAcc), flagged: suspected || r.flagged }
              : r,
          ),
          accuracySum: s.accuracySum + ourAcc,
          accuracyCount: s.accuracyCount + 1,
          engineFlaggedGames: s.engineFlaggedGames + (suspected ? 1 : 0),
          totalReviews: s.totalReviews + 1,
          brilliantMoves: s.brilliantMoves + brilliants,
        };
        unlockedNow = newlyUnlocked(s, next).map((a) => a.titleId);
        return next;
      });
      if (unlockedNow.includes('genius')) {
        app.toast('🏅 Title unlocked: [GENIUS] — 3 brilliant sacrifices confirmed by review');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : 'Could not parse/analyze that PGN.');
      setPhase('error');
    }
  }

  const displayChess = useMemo(() => {
    if (!analysis) return null;
    const c = new Chess();
    for (let i = 0; i < ply && i < analysis.moves.length; i++) {
      const m = analysis.moves[i];
      c.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: (m.uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) });
    }
    return c;
  }, [analysis, ply]);

  const [displayKey, setDisplayKey] = useState(0);
  useEffect(() => { setDisplayKey((k) => k + 1); }, [displayChess]);

  const lastMove = analysis && ply > 0
    ? { from: analysis.moves[ply - 1].uci.slice(0, 2), to: analysis.moves[ply - 1].uci.slice(2, 4) }
    : null;
  const currentEval = analysis ? analysis.evals[ply] : 0;
  const currentMate = analysis && ply > 0 ? analysis.moves[ply - 1].mate : undefined;

  const recentGames = stats?.history.slice(0, 6) ?? [];

  const counts = useMemo(() => {
    if (!analysis) return null;
    const zero = (): Record<MoveClass, number> => ({ brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0 });
    const w = zero(); const b = zero();
    for (const m of analysis.moves) (m.color === 'w' ? w : b)[m.cls]++;
    return { w, b };
  }, [analysis]);

  const currentMove = analysis && ply > 0 ? analysis.moves[ply - 1] : null;

  return (
    <div className="screen screen-pad" style={{ position: 'relative' }}>
      <div className="h1" style={{ marginTop: 2 }}>Game Review</div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>Unlimited, offline, engine-powered. Accuracy, classifications, anti-cheat scan.</div>

      {/* depth + pasted PGN entry */}
      {phase === 'idle' || phase === 'error' ? (
        <>
          <div className="label" style={{ margin: '4px 2px 6px' }}>ANALYSIS DEPTH</div>
          <div className="seg" style={{ marginBottom: 12 }}>
            {REVIEW_DEPTHS.map((d) => (
              <button key={d.depth} className={depthChoice === d.depth ? 'active' : ''} onClick={() => setDepthChoice(d.depth)} title={d.sub}>
                {d.label}
              </button>
            ))}
          </div>

          <div className="label" style={{ margin: '0 2px 6px' }}>PASTE A PGN</div>
          <textarea
            className="textarea"
            placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 ...'}
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            spellCheck={false}
            aria-label="PGN to analyze"
          />
          {error && <div className="field-error" role="alert">{error}</div>}
          <button className="btn block" style={{ marginTop: 10 }} disabled={!pgnInput.trim()} onClick={() => void runAnalysis(pgnInput, depthChoice)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            Analyze game
          </button>

          {/* recent games to re-analyze */}
          {recentGames.length > 0 && (
            <>
              <div className="label" style={{ margin: '16px 2px 6px' }}>YOUR RECENT GAMES</div>
              <div className="card">
                {recentGames.map((g) => (
                  <button key={g.id} className="history-row history-row-btn" onClick={() => { setPgnInput(g.pgn); setReviewTitle(`vs ${g.opponentName}`); void runAnalysis(g.pgn, depthChoice); }}>
                    <span className="history-result" style={{ background: g.result === 'win' ? '#81b64c' : g.result === 'loss' ? '#e5533d' : '#e0a83d' }}>{g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}</span>
                    <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>vs {g.opponentName}{g.opponentElo ? ` (${g.opponentElo})` : ''}</div>
                      <div className="muted" style={{ fontSize: 10.5 }}>{new Date(g.date).toLocaleDateString()} · {g.category}{g.myAccuracy !== null ? ` · accuracy ${g.myAccuracy}%` : ''}{g.flagged ? ' · flagged' : ''}</div>
                    </div>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : null}

      {/* progress */}
      {phase === 'analyzing' && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div className="h2">Analyzing{reviewTitle ? ` · ${reviewTitle}` : ''}…</div>
          <div className="muted" style={{ fontSize: 12.5, margin: '6px 0 12px' }}>
            {progress.total > 0 ? `Position ${progress.done} of ${progress.total}` : 'Booting engine…'}
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '4%' }} /></div>
        </div>
      )}

      {/* results */}
      {phase === 'done' && analysis && counts && (
        <>
          {/* accuracy hero */}
          <div className="card card-pad" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div className="muted" style={{ fontSize: 10, letterSpacing: 1, fontWeight: 800 }}>WHITE</div>
                <div className="acc-number">{analysis.accuracy.w.toFixed(1)}<span style={{ fontSize: 16 }}>%</span></div>
                <div className="muted" style={{ fontSize: 10 }}>ACPL {analysis.acpl.w.toFixed(0)}</div>
              </div>
              <div style={{ textAlign: 'center', paddingBottom: 2 }}>
                <div className="label">ACCURACY</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div className="muted" style={{ fontSize: 10, letterSpacing: 1, fontWeight: 800 }}>BLACK</div>
                <div className="acc-number">{analysis.accuracy.b.toFixed(1)}<span style={{ fontSize: 16 }}>%</span></div>
                <div className="muted" style={{ fontSize: 10 }}>ACPL {analysis.acpl.b.toFixed(0)}</div>
              </div>
            </div>
            {analysis.openingName && <div className="dim" style={{ textAlign: 'center', fontSize: 12, marginTop: 8, borderTop: '1px solid #2e2b27', paddingTop: 8 }}>Opening: <b>{analysis.openingName}</b></div>}
            {analysis.suspectedEngine && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <span className="suspect-badge">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3l9 16H3z" strokeLinejoin="round" /><path d="M12 10v4M12 17h.01" /></svg>
                  Engine-like play detected ({analysis.suspectedEngine === 'w' ? 'White' : 'Black'}) · {(analysis.engineMatchRate[analysis.suspectedEngine] * 100).toFixed(0)}% top moves
                </span>
              </div>
            )}
          </div>

          {/* board + eval */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <EvalBar cp={currentEval} mate={currentMate} orientation={orientation} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {displayChess && (
                <Board
                  chess={displayChess}
                  positionKey={displayKey}
                  orientation={orientation}
                  humanColor={null}
                  interactive={false}
                  lastMove={lastMove}
                  showCoordinates={false}
                />
              )}
            </div>
          </div>

          {/* transport */}
          <div className="transport" style={{ marginTop: 8 }} role="group" aria-label="Move navigation">
            <button className="icon-btn" aria-label="Start" onClick={() => setPly(0)}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h2.5v14H6zM19 5v14L9.5 12z" /></svg></button>
            <button className="icon-btn" aria-label="Previous" onClick={() => setPly((p) => Math.max(0, p - 1))}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 5v14L7 12z" /></svg></button>
            <button className="icon-btn" aria-label="Flip board" onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4M7 4L3 8M7 4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></svg></button>
            <button className="icon-btn" aria-label="Next" onClick={() => setPly((p) => Math.min(analysis.moves.length, p + 1))}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8.5 5v14L17 12z" /></svg></button>
            <button className="icon-btn" aria-label="End" onClick={() => setPly(analysis.moves.length)}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 5H18v14h-2.5zM5 5v14l9.5-7z" /></svg></button>
          </div>

          <div style={{ marginTop: 8 }}>
            <EvalGraph evals={analysis.evals} current={ply} onSeek={setPly} />
          </div>

          {/* classification counters */}
          <div className="class-counters" style={{ marginTop: 10 }}>
            {(Object.keys(CLASS_META) as MoveClass[]).map((cls) => {
              const n = counts.w[cls] + counts.b[cls];
              if (n === 0) return null;
              const meta = CLASS_META[cls];
              return (
                <button key={cls} className={`counter-chip ${counterFilter === cls ? 'active' : ''}`} onClick={() => setCounterFilter(counterFilter === cls ? null : cls)} title={meta.blurb}>
                  <span className={`badge-glyph badge-${cls}`} style={{ width: 18, height: 18, fontSize: 10 }}>{meta.symbol}</span>
                  <b>{n}</b>
                  <span className="muted" style={{ fontSize: 10 }}>{meta.label}</span>
                </button>
              );
            })}
          </div>

          {/* coach line for current move */}
          {currentMove && (
            <div className="coach-line" role="status">
              <span className={`badge-glyph badge-${currentMove.cls}`} style={{ width: 26, height: 26, fontSize: 13 }}>{CLASS_META[currentMove.cls].symbol}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12.5 }}>
                  Move {Math.ceil(currentMove.ply / 2)}{currentMove.color === 'w' ? '.' : '…'} <span style={{ color: CLASS_META[currentMove.cls].color }}>{CLASS_META[currentMove.cls].label}</span>
                </div>
                <div style={{ fontSize: 12, color: '#d8d6d3', lineHeight: 1.4 }}>{currentMove.coach}</div>
              </div>
            </div>
          )}

          {/* move list */}
          <div className="label" style={{ margin: '12px 2px 6px' }}>MOVES {counterFilter ? `· ${CLASS_META[counterFilter].label.toUpperCase()} ONLY` : ''}</div>
          <div className="movelist review-moves">
            {analysis.moves.map((m) => {
              if (counterFilter && m.cls !== counterFilter) return null;
              const meta = CLASS_META[m.cls];
              const isCurrent = analysis.moves[ply - 1] === m;
              return (
                <div className="move-cell" key={m.ply}>
                  {m.color === 'w' && <span className="move-num">{Math.ceil(m.ply / 2)}.</span>}
                  <button className={`move-ply review-move-ply ${isCurrent ? 'current' : ''}`} onClick={() => setPly(m.ply)}>
                    <span className={`badge-glyph badge-${m.cls} move-badge`}>{meta.symbol}</span>
                    {m.san}
                    <span className="delta-cp mono">{m.delta >= 5 ? `−${(m.delta / 100).toFixed(1)}` : ''}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* footer actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn ghost small" style={{ flex: 1 }} onClick={() => { setPhase('idle'); setAnalysis(null); setPgnInput(''); }}>
              New review
            </button>
            <button className="btn ghost small" style={{ flex: 1 }} onClick={() => { if (app.reviewPgn) void runAnalysis(app.reviewPgn, depthChoice); else if (pgnInput.trim()) void runAnalysis(pgnInput, depthChoice); }}>
              Re-analyze
            </button>
            <button className="btn small" style={{ flex: 1 }} onClick={() => { navigator.clipboard?.writeText(pgnInput || app.reviewPgn || ''); app.toast('PGN copied to clipboard'); }}>
              Copy PGN
            </button>
          </div>
        </>
      )}
    </div>
  );
}
