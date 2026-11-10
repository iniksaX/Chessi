/* Watch tab — famous games, fully offline, with playback and engine review handoff. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { FAMOUS_GAMES, type FamousGame } from '../data/famousGames';
import { useApp } from '../state/AppStore';
import { Board, capturedPieces } from '../components/Board';
import { CapturedTray } from '../components/bits';

export function WatchScreen() {
  const app = useApp();
  const [active, setActive] = useState<FamousGame | null>(null);

  return (
    <div className="screen screen-pad" style={{ position: 'relative' }}>
      <div className="h1" style={{ marginTop: 2 }}>Watch</div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>Five legendary games, annotated — no internet required.</div>

      <div className="watch-list">
        {FAMOUS_GAMES.map((g) => (
          <button key={g.id} className="watch-card" onClick={() => setActive(g)} aria-label={`Watch ${g.title}`}>
            <div className="watch-year">{g.year}</div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div className="h2" style={{ fontSize: 15 }}>{g.title}</div>
              <div className="dim" style={{ fontSize: 12 }}>{g.white} vs {g.black}</div>
              <div className="muted" style={{ fontSize: 10.5 }}>{g.event} · {g.eco} · {g.result}</div>
            </div>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#81b64c" opacity="0.16" /><polygon points="10 8.5 16 12 10 15.5 10 8.5" fill="#81b64c" /></svg>
          </button>
        ))}
      </div>

      {active && <GameViewer game={active} onClose={() => setActive(null)} />}
    </div>
  );
}

/* ================= playback ================= */

function GameViewer({ game, onClose }: { game: FamousGame; onClose: () => void }) {
  const app = useApp();
  const { chess, sans } = useMemo(() => {
    const c = new Chess();
    c.loadPgn(game.pgn);
    const sans = c.history();
    return { chess: c, sans };
  }, [game]);

  const [ply, setPly] = useState(0);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [autoplay, setAutoplay] = useState(false);
  const [showStory, setShowStory] = useState(true);

  // rebuild the board position for the current ply
  const { fen, lastMove } = useMemo(() => {
    const c = new Chess();
    const hist = chess.history({ verbose: true });
    let lm: { from: string; to: string } | null = null;
    for (let i = 0; i < ply && i < hist.length; i++) {
      const m = hist[i];
      c.move({ from: m.from, to: m.to, promotion: m.promotion });
      lm = { from: m.from, to: m.to };
    }
    return { fen: c.fen(), lastMove: lm };
  }, [chess, ply]);

  // keep a display chess instance in sync (Board wants a Chess object)
  const [displayChess] = useState(() => new Chess(fen));
  useEffect(() => {
    displayChess.load(fen);
    setDisplayKey((k) => k + 1);
  }, [fen, displayChess]);
  const [displayKey, setDisplayKey] = useState(0);

  useEffect(() => {
    if (!autoplay) return;
    if (ply >= sans.length) { setAutoplay(false); return; }
    const t = setTimeout(() => setPly((p) => Math.min(p + 1, sans.length)), 820);
    return () => clearTimeout(t);
  }, [autoplay, ply, sans.length]);

  const { whiteLost, blackLost, material } = capturedPieces(fen);

  // precomputed move list rows (pairs)
  const rows: Array<{ num: number; white?: string; black?: string; whitePly: number; blackPly?: number }> = [];
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({ num: i / 2 + 1, white: sans[i], black: sans[i + 1], whitePly: i + 1, blackPly: sans[i + 1] ? i + 2 : undefined });
  }

  return (
    <div className="puzzle-overlay" role="dialog" aria-modal="true" aria-label={game.title}>
      <div className="topbar" style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
        <button className="icon-btn" aria-label="Back" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div className="h2" style={{ fontSize: 14, lineHeight: 1.15 }}>{game.title}</div>
          <div className="muted" style={{ fontSize: 10.5 }}>{game.white} vs {game.black} · {game.year}</div>
        </div>
        <button className="icon-btn" aria-label="Flip board" onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4M7 4L3 8M7 4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
        </button>
        <button className="btn small" onClick={() => app.openReview(game.pgn, game.title)}>Analyze</button>
      </div>

      <div className="screen" style={{ padding: '10px 12px 16px' }}>
        {/* story */}
        <button className="story-card" onClick={() => setShowStory((v) => !v)} aria-expanded={showStory}>
          <div className="label" style={{ marginBottom: 4 }}>THE STORY {showStory ? '▴' : '▾'}</div>
          {showStory && <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: '#e8e6e3' }}>{game.story}</p>}
        </button>

        {/* trays */}
        <div className="player-strip" style={{ padding: '4px 2px' }}>
          <CapturedTray pieces={orientation === 'w' ? blackLost : whiteLost} material={orientation === 'w' ? Math.max(0, material) : Math.max(0, -material)} color={orientation === 'w' ? 'w' : 'b'} />
          <div style={{ flex: 1 }} />
          <div className="dim" style={{ fontWeight: 800, fontSize: 12 }}>{orientation === 'w' ? game.black : game.white}</div>
        </div>

        <Board
          chess={displayChess}
          positionKey={displayKey}
          orientation={orientation}
          humanColor={null}
          interactive={false}
          lastMove={lastMove}
          showCoordinates
        />

        <div className="player-strip" style={{ padding: '4px 2px' }}>
          <div className="dim" style={{ fontWeight: 800, fontSize: 12 }}>{orientation === 'w' ? game.white : game.black}</div>
          <div style={{ flex: 1 }} />
          <CapturedTray pieces={orientation === 'w' ? whiteLost : blackLost} material={orientation === 'w' ? Math.max(0, -material) : Math.max(0, material)} color={orientation === 'w' ? 'b' : 'w'} />
        </div>

        {/* transport controls */}
        <div className="transport" role="group" aria-label="Playback controls">
          <button className="icon-btn" aria-label="Start" onClick={() => setPly(0)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h2.5v14H6zM19 5v14L9.5 12z" /></svg>
          </button>
          <button className="icon-btn" aria-label="Previous move" onClick={() => setPly((p) => Math.max(0, p - 1))}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 5v14L7 12z" /></svg>
          </button>
          <button className="icon-btn play-toggle" aria-label={autoplay ? 'Pause' : 'Play'} onClick={() => setAutoplay((v) => !v)}>
            {autoplay
              ? <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
              : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <button className="icon-btn" aria-label="Next move" onClick={() => setPly((p) => Math.min(sans.length, p + 1))}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8.5 5v14L17 12z" /></svg>
          </button>
          <button className="icon-btn" aria-label="End" onClick={() => setPly(sans.length)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 5H18v14h-2.5zM5 5v14l9.5-7z" /></svg>
          </button>
        </div>
        <div className="muted" style={{ textAlign: 'center', fontSize: 11, marginTop: 2 }}>{Math.ceil(ply / 2)}{ply % 2 === 1 ? '' : ''} / {Math.ceil(sans.length / 2)} · {ply}/{sans.length} plies</div>

        {/* move list */}
        <div className="movelist" style={{ marginTop: 10, maxHeight: 132, overflowY: 'auto', padding: '6px 4px' }}>
          {rows.map((row) => (
            <div className="move-cell" key={row.num}>
              <span className="move-num">{row.num}.</span>
              <button className={`move-ply ${ply === row.whitePly ? 'current' : ''}`} onClick={() => setPly(row.whitePly)}>{row.white}</button>
              {row.black && <button className={`move-ply ${ply === row.blackPly ? 'current' : ''}`} onClick={() => setPly(row.blackPly!)}>{row.black}</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
