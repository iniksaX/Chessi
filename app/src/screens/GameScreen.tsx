/* Full-screen game — works for Computer opponents and local Pass & Play. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state/AppStore';
import { useGame } from '../hooks/useGame';
import { botById, type BotDef } from '../data/bots';
import { pickBotMove } from '../engine/botBrain';
import { Board, capturedPieces } from '../components/Board';
import { BotAvatar, CapturedTray, EvalBar, UserAvatar } from '../components/bits';
import { findHangingPiece } from '../engine/review';
import { evaluatePosition, bootEngine } from '../engine';
import { playSound } from '../audio';

const QUICK_CHAT = ['Good game', 'Nice move', 'Wow!', 'Oops', 'Thanks', 'Well played'];

export function GameScreen() {
  const [session, setSession] = useState(0);
  return <GameSession key={session} onRematch={() => setSession((s) => s + 1)} />;
}

function GameSession({ onRematch }: { onRematch: () => void }) {
  const app = useApp();
  const cfg = app.activeGame!;
  const isComputer = cfg.kind === 'computer';
  const bot: BotDef | null = isComputer ? botById((cfg as { botId: string }).botId) ?? null : null;

  const playerColor = cfg.playerColor;
  const [orientation, setOrientation] = useState<'w' | 'b'>(playerColor);
  const [showEval, setShowEval] = useState(true);
  const [evalCp, setEvalCp] = useState(0);
  const [evalMate, setEvalMate] = useState<number | undefined>(undefined);
  const [chat, setChat] = useState<Array<{ id: number; from: 'bot' | 'me'; text: string }>>([]);
  const [botThinking, setBotThinking] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [drawOffered, setDrawOffered] = useState(false);
  const chatId = useRef(0);
  const lastPlayerMovePly = useRef(0);

  const account = app.account;
  const opponentName = isComputer ? bot!.name : (orientation === 'w' ? 'Black' : 'White');

  const game = useGame({
    kind: cfg.kind,
    timeBase: cfg.timeBase,
    timeInc: cfg.timeInc,
    playerColor,
    opponentName: isComputer ? bot!.name : 'Pass & Play',
    opponentElo: isComputer ? bot!.elo : null,
    rated: isComputer,
    category: 'computer',
    pgnTagEvent: isComputer ? `Chessi • vs ${bot!.name}` : 'Chessi • Pass & Play',
  });

  // pass & play: flip board to side to move
  useEffect(() => {
    if (!isComputer) setOrientation(game.sideToMove);
  }, [isComputer, game.sideToMove, game.fen]);

  const pushChat = useCallback((from: 'bot' | 'me', text: string) => {
    setChat((c) => [...c.slice(-2), { id: ++chatId.current, from, text }]);
  }, []);

  /* Bot opening chatter */
  useEffect(() => {
    if (!isComputer || !bot) return;
    const t = setTimeout(() => {
      const lines = bot.chatter.start;
      pushChat('bot', lines[Math.floor(Math.random() * lines.length)]);
    }, 700 + Math.random() * 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Bot move engine */
  useEffect(() => {
    if (!isComputer || !bot || game.status !== 'playing') return;
    const botColor = playerColor === 'w' ? 'b' : 'w';
    if (game.sideToMove !== botColor) return;
    let cancelled = false;
    setBotThinking(true);
    pickBotMove(game.fen, bot).then((mv) => {
      if (cancelled || !mv) return;
      game.applyMove(mv.from, mv.to, mv.promotion as 'q' | 'r' | 'b' | 'n' | undefined);
      setBotThinking(false);
    }).catch((e) => {
      console.error('[chessi] bot error', e);
      setBotThinking(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.sideToMove, game.status, game.fen, isComputer, bot, playerColor]);

  /* Lightweight live eval for the eval bar (depth 8, human side only end of bar) */
  useEffect(() => {
    if (!showEval) return;
    let cancelled = false;
    bootEngine().then(async (ok) => {
      if (!ok || cancelled) return;
      const r = await evaluatePosition(game.fen, 8, 1);
      if (!cancelled) { setEvalCp(r.cp); setEvalMate(r.mate); }
    }).catch(() => { /* bar stays stale */ });
    return () => { cancelled = true; };
  }, [game.fen, game.positionKey, showEval]);

  /* Reactive chatter: hanging piece after the player's move */
  useEffect(() => {
    if (!isComputer || !bot || game.status !== 'playing') return;
    const ply = game.moveCount;
    if (ply === lastPlayerMovePly.current) return;
    const moverWasPlayer = game.sideToMove !== playerColor; // we just moved
    if (!moverWasPlayer) { lastPlayerMovePly.current = ply; return; }
    lastPlayerMovePly.current = ply;
    if (ply < 3) return;
    const t = setTimeout(() => {
      if (Math.random() > 0.45) return;
      const hanging = findHangingPiece(game.fen, playerColor);
      if (hanging) {
        const lines = bot.chatter.onPlayerBlunder;
        pushChat('bot', lines[Math.floor(Math.random() * lines.length)]);
      } else if (Math.random() < 0.3) {
        const lines = bot.chatter.onPlayerGood;
        pushChat('bot', lines[Math.floor(Math.random() * lines.length)]);
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.moveCount, game.status]);

  const { whiteLost, blackLost, material } = useMemo(() => capturedPieces(game.fen), [game.fen]);
  const myPiecesLost = orientation === 'w' ? whiteLost : blackLost;
  const opPiecesLost = orientation === 'w' ? blackLost : whiteLost;
  const myMaterial = orientation === 'w' ? material : -material;

  const topName = orientation === playerColor
    ? opponentName
    : (account?.displayName ?? 'You');
  const bottomName = orientation === playerColor
    ? (account?.displayName ?? 'You')
    : opponentName;
  const topIsBot = isComputer && orientation !== playerColor;
  const topElo = topIsBot ? bot!.elo : null;

  const clockFor = (color: 'w' | 'b') => game.clocks[color];
  const topColor = orientation === 'w' ? 'b' : 'w';

  const endTitle = game.endInfo
    ? game.endInfo.winner === 'draw'
      ? 'Draw'
      : isComputer
        ? (game.endInfo.result === 'win' ? 'You win!' : `${opponentName} wins`)
        : (game.endInfo.winner === 'w' ? 'White wins' : 'Black wins')
    : '';

  const endReason = game.endInfo?.reason ?? '';
  const lossReasonLine = endReason === 'timeout' ? 'on time' : endReason === 'checkmate' ? 'by checkmate' : `by ${endReason}`;

  return (
    <div className="game-root">
      {/* top bar */}
      <div className="topbar" style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
        <button className="icon-btn" aria-label="Back" onClick={() => app.endGame()}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="spacer" />
        {cfg.timeBase > 0 && <div className="rating-chip" style={{ fontSize: 12 }}>{Math.floor(cfg.timeBase / 60)}+{cfg.timeInc}</div>}
        <button className={`icon-btn ${showEval ? 'active' : ''}`} aria-label="Toggle evaluation bar" onClick={() => setShowEval((v) => !v)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
        </button>
        <button className="icon-btn" aria-label="Resign" onClick={() => setConfirmResign(true)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4" /><path d="M5 4h12l-2.5 4L17 12H5" /></svg>
        </button>
        <button className="icon-btn" aria-label="Offer draw" onClick={() => setConfirmDraw(true)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v18M16 3v18M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4" /></svg>
        </button>
      </div>

      {/* opponent strip */}
      <div className="player-strip" style={{ paddingLeft: 10, paddingRight: 10 }}>
        {topIsBot
          ? <BotAvatar hue={bot!.hue} piece={bot!.piece} size={38} />
          : isComputer
            ? <BotAvatar hue={210} piece="queen" size={38} />
            : <div className="avatar" style={{ width: 38, height: 38, borderRadius: 6, background: '#3a3835', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{topName.charAt(0).toUpperCase()}</div>}
        <div style={{ minWidth: 0 }}>
          <div className="name-line">
            <span className="pname">{topName}</span>
            {topElo !== null && <span className="elo-pill">{topElo}</span>}
            {botThinking && topIsBot && <span className="thinking-dots"><span /><span /><span /></span>}
          </div>
          <CapturedTray pieces={topIsBot || !isComputer ? opPiecesLost : opPiecesLost} material={orientation === 'w' ? Math.max(0, -material) : Math.max(0, material)} color={topColor} />
        </div>
        {cfg.timeBase > 0 && (
          <div className={`clock-box ${game.activeClock === topColor && game.status === 'playing' ? 'active' : ''} ${clockFor(topColor) < 10 ? 'low' : ''}`}>
            {game.formatClock(clockFor(topColor))}
          </div>
        )}
      </div>

      {/* board + eval bar */}
      <div className="board-area">
        {showEval && <EvalBar cp={evalCp} mate={evalMate} orientation={orientation} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Board
            chess={game.chess}
            positionKey={game.positionKey}
            orientation={orientation}
            humanColor={isComputer ? playerColor : null}
            interactive={game.status === 'playing'}
            lastMove={game.lastMove}
            onMove={(from, to, promotion) => { game.applyMove(from, to, promotion); }}
            showCoordinates
          />
        </div>
      </div>

      {/* chat overlay for computer games */}
      {isComputer && chat.length > 0 && (
        <div className="chat-overlay">
          {chat.map((c) => (
            <div key={c.id} className={`chat-bubble ${c.from === 'me' ? 'me' : ''}`}>{c.text}</div>
          ))}
          <div className="quick-chat">
            {QUICK_CHAT.map((q) => (
              <button key={q} onClick={() => { pushChat('me', q); playSound('chat'); }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* player strip */}
      <div className="player-strip" style={{ paddingLeft: 10, paddingRight: 10 }}>
        {
          account
            ? <UserAvatar id={account.avatarId} size={38} />
            : <div className="avatar" style={{ width: 38, height: 38, borderRadius: 6, background: '#3a3835' }} />
        }
        <div style={{ minWidth: 0 }}>
          <div className="name-line">
            <span className="pname">{bottomName}</span>
            {isComputer && <span className="elo-pill" style={{ color: '#81b64c' }}>You</span>}
          </div>
          <CapturedTray pieces={myPiecesLost} material={Math.max(0, myMaterial)} color={orientation} />
        </div>
        {cfg.timeBase > 0 && (
          <div className={`clock-box ${game.activeClock === orientation && game.status === 'playing' ? 'active' : ''} ${clockFor(orientation) < 10 ? 'low' : ''}`}>
            {game.formatClock(clockFor(orientation))}
          </div>
        )}
      </div>

      {drawOffered && <div className="game-toast">Draw offer sent…</div>}

      {/* ---------- end-of-game modal ---------- */}
      {game.status === 'over' && game.endInfo && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 6 }}>
              {game.endInfo.result === 'win' ? '🏆' : game.endInfo.result === 'loss' ? '💔' : '🤝'}
            </div>
            <div className="h1" style={{ marginBottom: 2 }}>{endTitle}</div>
            <div className="dim" style={{ fontSize: 13, marginBottom: 14 }}>
              {isComputer ? `${opponentName} • ${lossReasonLine}` : `by ${endReason}`}
            </div>
            {isComputer && (
              <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
                Rated game — your rating updates on the Play tab.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn block" onClick={() => app.openReview(game.endInfo!.pgn, isComputer ? `vs ${opponentName}` : 'Pass & Play')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3.2" /></svg>
                Review Game
              </button>
                <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost small" style={{ flex: 1 }} onClick={() => app.endGame()}>Home</button>
                <button className="btn small" style={{ flex: 1 }} onClick={onRematch}>Rematch</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* resign confirm */}
      {confirmResign && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="h2" style={{ marginBottom: 6 }}>Resign this game?</div>
            <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>{isComputer ? 'The bot will record the win against you.' : 'The other side takes the point.'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost small" style={{ flex: 1 }} onClick={() => setConfirmResign(false)}>Keep playing</button>
              <button className="btn danger small" style={{ flex: 1 }} onClick={() => { setConfirmResign(false); game.finalizeGame(playerColor === 'w' ? 'b' : 'w', 'resignation'); }}>Resign</button>
            </div>
          </div>
        </div>
      )}

      {/* draw offer confirm */}
      {confirmDraw && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="h2" style={{ marginBottom: 6 }}>Offer a draw?</div>
            <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>The game ends in a half point each.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost small" style={{ flex: 1 }} onClick={() => setConfirmDraw(false)}>Cancel</button>
              <button className="btn small" style={{ flex: 1 }} onClick={() => { setConfirmDraw(false); setDrawOffered(true); setTimeout(() => { setDrawOffered(false); game.finalizeGame('draw', 'draw agreement'); }, 900); }}>Offer draw</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
