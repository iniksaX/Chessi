/* Small shared components. */
import React from 'react';
import { NeoPieceSvg, type NeoPiece, type PieceColor } from './Pieces';
import { TITLES } from '../data/titles';
import type { UserAccount } from '../storage';
import { cpToWinPercent, mateToCp } from '../storage';

/* ---------- EvalBar: white at the bottom ---------- */
export function EvalBar({ cp, mate, orientation = 'w' }: { cp: number; mate?: number; orientation?: PieceColor }) {
  const p = mate !== undefined
    ? (mate >= 0 ? 1 : 0)
    : cpToWinPercent(cp);
  const whitePct = Math.round(p * 100);
  const score = mate !== undefined
    ? `M${Math.abs(mate)}`
    : `${cp >= 0 ? '+' : ''}${(Math.abs(cp) / 100).toFixed(1)}`;
  const whiteWinning = mate !== undefined ? mate > 0 : cp >= 0;
  return (
    <div className="eval-bar" aria-label="Evaluation">
      <div className="white-fill" style={{ height: `${whitePct}%` }} />
      <div
        className={`eval-score ${!whiteWinning ? 'light' : ''}`}
        style={whiteWinning ? { top: 4, left: 0, right: 0 } : { bottom: 4, left: 0, right: 0 }}
      >
        {score}
      </div>
    </div>
  );
}

/* ---------- Bot avatar: geometric identity tile ---------- */
const AVATAR_PIECES: Record<string, NeoPiece> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};

export function BotAvatar({ hue, piece, size = 46 }: { hue: number; piece: string; size?: number }) {
  const np = AVATAR_PIECES[piece] ?? 'n';
  return (
    <div
      className="bot-avatar"
      style={{
        width: size, height: size, borderRadius: 9,
        background: `radial-gradient(circle at 32% 28%, hsl(${hue} 48% 34%), hsl(${hue} 55% 17%) 78%)`,
        display: 'grid', placeItems: 'center',
        border: '1px solid rgba(255,255,255,0.09)',
      }}
      aria-hidden="true"
    >
      <div style={{ width: '76%', height: '76%' }}>
        <NeoPieceSvg piece={np} color="w" strokeWidth={1.1} />
      </div>
    </div>
  );
}

export const USER_AVATARS: Array<{ id: string; hue: number; piece: NeoPiece }> = [
  { id: 'a1', hue: 36, piece: 'n' },
  { id: 'a2', hue: 205, piece: 'r' },
  { id: 'a3', hue: 330, piece: 'q' },
  { id: 'a4', hue: 150, piece: 'b' },
  { id: 'a5', hue: 262, piece: 'k' },
  { id: 'a6', hue: 12, piece: 'p' },
  { id: 'a7', hue: 56, piece: 'n' },
  { id: 'a8', hue: 110, piece: 'r' },
  { id: 'a9', hue: 285, piece: 'q' },
  { id: 'a10', hue: 190, piece: 'b' },
  { id: 'a11', hue: 0, piece: 'k' },
  { id: 'a12', hue: 78, piece: 'p' },
];

export function UserAvatar({ id, size = 46, src }: { id: string; size?: number; src?: string | null }) {
  const a = USER_AVATARS.find((x) => x.id === id) ?? USER_AVATARS[0];
  if (src) {
    return (
      <div
        className="bot-avatar"
        style={{ width: size, height: size, borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.14)' }}
        aria-hidden="true"
      >
        <img className="custom-avatar-img" src={src} alt="" width={size} height={size} />
      </div>
    );
  }
  return <BotAvatar hue={a.hue} piece={pieceName(a.piece)} size={size} />;
}

/** The selected account title rendered as a colored pill, or null when 'none'. */
export function AccountTitlePill({ account, small = false }: { account: UserAccount | null; small?: boolean }) {
  if (!account) return null;
  const t = TITLES.find((x) => x.id === account.titleId);
  if (!t || t.id === 'none') return null;
  return (
    <span className={`title-pill${small ? ' sm' : ''}`} style={{ borderColor: t.hue, color: t.hue }}>
      {t.label}
    </span>
  );
}
function pieceName(p: NeoPiece): string {
  return { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[p];
}

/* ---------- Captured pieces tray ---------- */
export function CapturedTray({
  pieces, material, color,
}: {
  pieces: NeoPiece[];
  material: number; // from this tray's perspective perspective: raw sum advantage of captured side value
  color: PieceColor;
}) {
  const opponent: PieceColor = color === 'w' ? 'b' : 'w';
  if (!pieces.length && material <= 0) return <div className="captured-tray" />;
  return (
    <div className="captured-tray" aria-label="Captured pieces">
      {pieces.map((p, i) => (
        <span key={i} style={{ width: 17, height: 17, display: 'inline-block', opacity: 0.92 }}>
          <NeoPieceSvg piece={p} color={opponent} strokeWidth={2.1} />
        </span>
      ))}
      {material > 0 && <span className="captured-adv">+{material}</span>}
    </div>
  );
}

/* ---------- Eval graph (SVG) ---------- */
export function EvalGraph({ evals, current, onSeek }: { evals: number[]; current?: number; onSeek?: (ply: number) => void }) {
  const w = 330, h = 84, pad = 2;
  const n = evals.length;
  if (n < 2) return <div className="eval-graph-wrap" style={{ height: h }} />;
  const xs = (i: number) => pad + (i / (n - 1)) * (w - pad * 2);
  const ys = (cp: number) => {
    const clamped = Math.max(-1000, Math.min(1000, cp));
    // sigmoid compression for display
    const norm = Math.tanh(clamped / 400); // -1..1
    return h / 2 - norm * (h / 2 - pad);
  };
  const points = evals.map((cp, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(cp).toFixed(1)}`).join(' ');
  const area = `${points} L${xs(n - 1).toFixed(1)},${h} L${xs(0).toFixed(1)},${h} Z`;
  const zeroY = ys(0);
  const marker = current !== undefined && current < n ? xs(current) : null;
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(frac * (n - 1)));
  };
  return (
    <div className="eval-graph-wrap" onClick={handleSeek} role={onSeek ? 'slider' : undefined} aria-label={onSeek ? 'Seek through the game evaluation' : undefined} aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={current} tabIndex={onSeek ? 0 : -1}
      onKeyDown={onSeek ? (e) => {
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, (current ?? 0) - 1));
        if (e.key === 'ArrowRight') onSeek(Math.min(n - 1, (current ?? 0) + 1));
      } : undefined}
      style={onSeek ? { cursor: 'crosshair' } : undefined}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Evaluation graph">
        <rect x="0" y="0" width={w} height={h / 2} fill="#0f0d0b" opacity="0.35" />
        <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="#4a4844" strokeDasharray="4 3" strokeWidth="1" />
        <path d={area} fill="#81b64c" opacity="0.22" />
        <path d={points} fill="none" stroke="#81b64c" strokeWidth="2" strokeLinejoin="round" />
        {marker !== null && <line x1={marker} y1="0" x2={marker} y2={h} stroke="#ffd54f" strokeWidth="1.6" />}
      </svg>
    </div>
  );
}
