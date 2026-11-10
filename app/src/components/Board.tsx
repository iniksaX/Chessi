/* Chessi board — flat geometric rendering, tap-to-move and pointer-drag,
   coordinates, check glow, legal-move dots, promotion picker. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { NeoPieceSvg, type NeoPiece, type PieceColor } from './Pieces';
import { useApp } from '../state/AppStore';

export interface LastMove { from: string; to: string }

interface BoardProps {
  /** mutable chess.js instance — Board re-renders when `positionKey` changes */
  chess: Chess;
  positionKey: number;
  orientation: PieceColor;
  /** which color the local human may move (null = both, e.g. pass & play) */
  humanColor: PieceColor | null;
  /** interactive board (false = spectator/review) */
  interactive: boolean;
  lastMove?: LastMove | null;
  onMove?: (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => void;
  className?: string;
  showCoordinates?: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

interface SquarePos { file: number; rank: number } // 0-indexed from White's perspective

function sqToPos(sq: string): SquarePos {
  return { file: sq.charCodeAt(0) - 97, rank: 8 - parseInt(sq[1], 10) };
}
function posToSq(file: number, rank: number): string {
  return 'abcdefgh'[file] + String(8 - rank);
}

export function Board({
  chess, positionKey, orientation, humanColor, interactive,
  lastMove, onMove, className, showCoordinates = true,
}: BoardProps) {
  const { theme } = useApp();
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: string; piece: NeoPiece; color: PieceColor; x: number; y: number; valid: boolean } | null>(null);
  const [promoChoice, setPromoChoice] = useState<{ from: string; to: string } | null>(null);

  const turn = chess.turn();
  const canMoveNow = interactive && (humanColor === null || humanColor === turn) && !chess.isGameOver();

  const board: Array<{ square: string; piece: { type: NeoPiece; color: PieceColor } | null; color: 'light' | 'dark' }> = useMemo(() => {
    const raw = chess.board(); // rank8..rank1, a..h
    const cells: Array<{ square: string; piece: { type: NeoPiece; color: PieceColor } | null; color: 'light' | 'dark' }> = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = 'abcdefgh'[f] + (8 - r);
        const piece = raw[r][f] as { type: NeoPiece; color: PieceColor } | null;
        cells.push({ square: sq, piece, color: (r + f) % 2 === 0 ? 'light' : 'dark' });
      }
    }
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, positionKey]);

  // orientation mapping: display row 0 = top
  const displayOrder = useMemo(() => {
    const bySq = new Map(board.map((c) => [c.square, c]));
    const order: typeof board = [];
    for (let dr = 0; dr < 8; dr++) {
      for (let df = 0; df < 8; df++) {
        const rank = orientation === 'w' ? dr : 7 - dr;
        const file = orientation === 'w' ? df : 7 - df;
        order.push(bySq.get(posToSq(file, rank))!);
      }
    }
    return order;
  }, [board, orientation]);

  const inCheckSquare = useMemo(() => {
    if (!chess.inCheck()) return null;
    const raw = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (raw[r][f]?.type === 'k' && raw[r][f]?.color === turn) return 'abcdefgh'[f] + (8 - r);
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, positionKey, turn]);

  const targetsFor = useCallback((sq: string): Array<{ to: string; promotion?: boolean }> => {
    if (!canMoveNow) return [];
    try {
      return chess.moves({ square: sq as never, verbose: true }).map((m) => ({
        to: m.to,
        promotion: !!m.promotion,
      }));
    } catch {
      return [];
    }
  }, [chess, canMoveNow]);

  const legalTargets = selected ? targetsFor(selected) : [];

  const attemptMove = useCallback((from: string, to: string): boolean => {
    const mvs = targetsFor(from).filter((t) => t.to === to);
    if (!mvs.length) return false;
    if (mvs.some((m) => m.promotion)) {
      setPromoChoice({ from, to });
      return false; // wait for picker
    }
    onMove?.(from, to);
    setSelected(null);
    return true;
  }, [targetsFor, onMove]);

  /* ---------- pointer gesture handling ---------- */
  const geomFromEvent = useCallback((clientX: number, clientY: number): { file: number; rank: number } | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (clientX < rect.left || clientX >= rect.right || clientY < rect.top || clientY >= rect.bottom) return null;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    const df = Math.min(7, Math.max(0, Math.floor(x * 8)));
    const dr = Math.min(7, Math.max(0, Math.floor(y * 8)));
    const rank = orientation === 'w' ? dr : 7 - dr;
    const file = orientation === 'w' ? df : 7 - df;
    return { rank, file };
  }, [orientation]);

  const pieceOn = useCallback((sq: string) => {
    const raw = chess.board();
    const { file, rank } = sqToPos(sq);
    return raw[rank][file] as { type: NeoPiece; color: PieceColor } | null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, positionKey]);

  const pointerState = useRef<{ startSq: string; startX: number; startY: number; dragging: boolean; color: PieceColor; type: NeoPiece } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent, sq: string) => {
    if (!canMoveNow) return;
    const piece = pieceOn(sq);
    // tap on an empty/opponent square while a piece is selected = attempt move
    if (selected && (!piece || piece.color !== turn)) {
      attemptMove(selected, sq);
      return;
    }
    if (!piece || piece.color !== turn) return;
    if (humanColor !== null && piece.color !== humanColor) return;
    e.preventDefault();
    pointerState.current = { startSq: sq, startX: e.clientX, startY: e.clientY, dragging: false, color: piece.color, type: piece.type };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [canMoveNow, selected, turn, humanColor, pieceOn, attemptMove]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const st = pointerState.current;
    if (!st) return;
    const dx = e.clientX - st.startX, dy = e.clientY - st.startY;
    if (!st.dragging && Math.hypot(dx, dy) > 6) {
      st.dragging = true;
      setSelected(st.startSq);
    }
    if (st.dragging) {
      const rect = boardRef.current?.getBoundingClientRect();
      if (rect) setDrag({ from: st.startSq, piece: st.type, color: st.color, x: e.clientX - rect.left, y: e.clientY - rect.top, valid: true });
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const st = pointerState.current;
    pointerState.current = null;
    setDrag(null);
    if (!st) return;
    const geom = geomFromEvent(e.clientX, e.clientY);
    const target = geom ? posToSq(geom.file, geom.rank) : null;

    if (st.dragging) {
      if (target && target !== st.startSq) attemptMove(st.startSq, target);
      return;
    }
    // tap behavior: toggle selection
    if (selected === st.startSq) setSelected(null);
    else setSelected(st.startSq);
  }, [geomFromEvent, attemptMove, selected]);

  /* ---------- render ---------- */
  const checkSq = inCheckSquare;
  const classesFor = (cell: (typeof board)[number]) => {
    const cls = ['square', cell.color];
    if (lastMove && theme.board.highlightLastMove && (cell.square === lastMove.from || cell.square === lastMove.to)) cls.push('last-move');
    if (selected === cell.square) cls.push('selected');
    if (checkSq === cell.square) cls.push('in-check');
    return cls.join(' ');
  };

  const targetMap = new Map(legalTargets.map((t) => [t.to, t.promotion]));

  return (
    <div className={`board-wrap ${className ?? ''}`}>
      <div
        ref={boardRef}
        className="board"
        style={{ borderRadius: theme.board.rounded }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pointerState.current = null; setDrag(null); }}
      >
        {displayOrder.map((cell, i) => {
          const isTarget = targetMap.has(cell.square);
          const isCaptureTarget = isTarget && !!cell.piece;
          const df = i % 8, dr = Math.floor(i / 8);
          const showFile = showCoordinates && theme.board.showCoordinates && dr === 7;
          const showRank = showCoordinates && theme.board.showCoordinates && df === 0;
          const originSquare = orientation === 'w' ? 'abcdefgh'[df] + String(8 - dr) : 'abcdefgh'[7 - df] + String(dr + 1);
          return (
            <div
              key={cell.square}
              className={classesFor(cell)}
              data-square={cell.square}
              onPointerDown={(e) => onPointerDown(e, cell.square)}
            >
              {showFile && <span className="coord file">{originSquare[0]}</span>}
              {showRank && <span className="coord rank">{originSquare[1]}</span>}
              {isTarget && !isCaptureTarget && <div className="legal-dot" />}
              {isTarget && isCaptureTarget && <div className="legal-capture" />}
              {cell.piece && !(drag && drag.from === cell.square) && (
                <div className="piece-holder" style={{ width: '88%', height: '88%', zIndex: 2, pointerEvents: 'none' }}>
                  <NeoPieceSvg piece={cell.piece.type} color={cell.piece.color} strokeWidth={theme.board.pieceStroke === 'bold' ? 2.4 : theme.board.pieceStroke === 'subtle' ? 1.3 : 0} />
                </div>
              )}
            </div>
          );
        })}

        {/* drag ghost */}
        {drag && (
          <div
            className="drag-ghost"
            style={{
              position: 'absolute',
              left: drag.x, top: drag.y,
              width: '12.5%', height: '12.5%',
              transform: 'translate(-50%, -50%)',
              zIndex: 30, pointerEvents: 'none',
              filter: 'drop-shadow(0 12px 12px rgba(0,0,0,0.5))',
            }}
          >
            <NeoPieceSvg piece={drag.piece} color={drag.color} strokeWidth={1.6} />
          </div>
        )}

        {/* promotion picker */}
        {promoChoice && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(12,10,8,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onPointerDown={() => setPromoChoice(null)}
          >
            <div
              style={{ display: 'flex', gap: 8, background: 'var(--panel)', borderRadius: 12, padding: 10, border: '1px solid #3a3835' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {(['q', 'r', 'b', 'n'] as const).map((p) => (
                <button
                  key={p}
                  className="icon-btn"
                  style={{ width: 62, height: 62 }}
                  onClick={() => {
                    onMove?.(promoChoice.from, promoChoice.to, p);
                    setPromoChoice(null);
                    setSelected(null);
                  }}
                  aria-label={`Promote to ${p}`}
                >
                  <NeoPieceSvg piece={p} color={turn} strokeWidth={1.6} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function capturedPieces(fen: string): { whiteLost: NeoPiece[]; blackLost: NeoPiece[]; material: number } {
  const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const remaining: Record<PieceColor, Record<string, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };
  for (const ch of fen.split(' ')[0]) {
    const lower = ch.toLowerCase();
    if (lower === 'k' || !start[lower]) continue;
    remaining[ch === lower ? 'b' : 'w'][lower]++;
  }
  const order: NeoPiece[] = ['q', 'r', 'b', 'n', 'p'];
  const value: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const whiteLost: NeoPiece[] = [];
  const blackLost: NeoPiece[] = [];
  let material = 0;
  for (const p of order) {
    for (let i = 0; i < start[p] - remaining.w[p]; i++) whiteLost.push(p);
    for (let i = 0; i < start[p] - remaining.b[p]; i++) blackLost.push(p);
    material += (remaining.w[p] - remaining.b[p]) * value[p];
  }
  return { whiteLost, blackLost, material };
}
