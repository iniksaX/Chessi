/* Chessi "Neo Classic" piece set — original vector artwork in the classic
   staunton-inspired style: solid white pieces with a dark outline, solid
   charcoal pieces with a light outline, bold readable silhouettes, zero
   gradients. Board-compatible with the reference look (filled Staunton
   shapes): ball-head pawn, crenellated rook, horse head, slitted bishop
   mitre, orb-tipped queen coronet and cross-crowned king. */

export type NeoPiece = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

interface PieceProps {
  piece: NeoPiece;
  color: PieceColor;
  strokeWidth?: number;
}

const FILL: Record<PieceColor, string> = {
  w: '#f8f5ea',
  b: '#35322c',
};
const STROKE: Record<PieceColor, string> = {
  w: '#251f16',
  b: '#14110d',
};
const DETAIL: Record<PieceColor, string> = {
  w: '#251f16',
  b: '#cfccc0',
};

export function NeoPieceSvg({ piece, color, strokeWidth = 1.6 }: PieceProps) {
  const fill = FILL[color];
  const stroke = STROKE[color];
  const detail = DETAIL[color];
  const g = {
    fill,
    stroke,
    strokeWidth,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };
  const dline = { stroke: detail, strokeWidth: strokeWidth * 0.85, strokeLinecap: 'round' as const };

  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true">
      {piece === 'p' && (
        <g {...g}>
          <circle cx="22.5" cy="10.6" r="4.7" />
          <path d="M17.5 28.2 L27.5 28.2 L25.7 19.4 C25.1 16.3 23.9 15.1 22.5 15.1 C21.1 15.1 19.9 16.3 19.3 19.4 Z" />
          <path d="M14.3 33.6 L30.7 33.6 L27.5 28.2 L17.5 28.2 Z" />
          <rect x="12.2" y="33.6" width="20.6" height="3.9" rx="1.15" />
          <line x1="16.3" y1="31" x2="28.7" y2="31" {...dline} />
        </g>
      )}
      {piece === 'r' && (
        <g {...g}>
          <path d="M13.1 10.8 H16.9 V15 H21 V10.8 H24 V15 H28.1 V10.8 H31.9 V20.9 L28.7 25.3 V32.9 H16.3 V25.3 L13.1 20.9 Z" />
          <rect x="13.2" y="32.9" width="18.6" height="3.7" rx="1" />
          <line x1="15.6" y1="17.8" x2="29.4" y2="17.8" {...dline} />
          <line x1="16.3" y1="28.9" x2="28.7" y2="28.9" {...dline} />
        </g>
      )}
      {piece === 'n' && (
        <g {...g}>
          <path d="M10.4 22.6
                   C8.5 20.7 9.2 16.9 12.6 15.4
                   L16.6 13.8
                   L18.2 8.6
                   L22.2 11.4
                   L24.8 5.2
                   L28.4 12.4
                   C32.7 17.9 33.6 24.8 30.6 33.2
                   L30.2 34.8
                   L14.3 34.8
                   L14 27.9
                   C13.8 25.5 12.3 23.9 10.4 22.6 Z" />
          <rect x="12.3" y="34.8" width="20.4" height="3.5" rx="1.05" />
          <circle cx="16.4" cy="14.6" r="1.05" fill={detail} stroke="none" />
          <circle cx="11.6" cy="20.6" r="0.8" fill={detail} stroke="none" />
          <path d="M21.6 10.6 L25.4 15.2" {...dline} strokeWidth={strokeWidth * 0.7} fill="none" />
          <path d="M24.2 9.2 L28.2 13.4" {...dline} strokeWidth={strokeWidth * 0.7} fill="none" />
        </g>
      )}
      {piece === 'b' && (
        <g {...g}>
          <circle cx="22.5" cy="7.6" r="2.15" />
          <path d="M22.5 11.4
                   C17.6 14.9 14.6 19.3 14.6 23.9
                   C14.6 27.3 17.1 28.9 17.1 28.9
                   H27.9
                   C27.9 28.9 30.4 27.3 30.4 23.9
                   C30.4 19.3 27.4 14.9 22.5 11.4 Z" />
          <line x1="19.4" y1="22.6" x2="26.2" y2="15.8" {...dline} strokeWidth={strokeWidth * 1.05} />
          <rect x="14.6" y="28.9" width="15.8" height="3" rx="0.95" />
          <path d="M13.4 35.6 H31.6 L28.7 31.9 H16.3 Z" />
          <rect x="12" y="35.6" width="21" height="3.4" rx="1.05" />
        </g>
      )}
      {piece === 'q' && (
        <g {...g}>
          <circle cx="11.4" cy="11.2" r="1.7" />
          <circle cx="17" cy="8" r="1.7" />
          <circle cx="22.5" cy="6.1" r="1.7" />
          <circle cx="28" cy="8" r="1.7" />
          <circle cx="33.6" cy="11.2" r="1.7" />
          <path d="M11.4 13.2
                   L15.4 19.6
                   L17 10
                   L20 18.2
                   L22.5 8
                   L25 18.2
                   L28 10
                   L29.6 19.6
                   L33.6 13.2
                   L30.6 24.6
                   H14.4 Z" />
          <rect x="14.4" y="24.6" width="16.2" height="2.4" rx="0.8" />
          <path d="M14.6 35.2 H30.4 L27.3 27 H17.7 Z" />
          <rect x="12.1" y="35.2" width="20.8" height="3.5" rx="1.05" />
          <path d="M17.6 31.2 C20.4 32.4 24.6 32.4 27.4 31.2" {...dline} fill="none" />
        </g>
      )}
      {piece === 'k' && (
        <g {...g}>
          <line x1="22.5" y1="3.6" x2="22.5" y2="10.6" stroke={stroke} strokeWidth={strokeWidth * 1.25} />
          <line x1="19" y1="6.7" x2="26" y2="6.7" stroke={stroke} strokeWidth={strokeWidth * 1.25} />
          <path d="M13.8 15.6
                   C13.8 12.2 15.5 10.6 18.2 10.6
                   H26.8
                   C29.5 10.6 31.2 12.2 31.2 15.6
                   V23.8
                   H13.8 Z" />
          <line x1="18.6" y1="13.6" x2="26.4" y2="13.6" {...dline} strokeWidth={strokeWidth * 0.75} />
          <rect x="13.8" y="23.8" width="17.4" height="2.4" rx="0.8" />
          <path d="M14.4 35.4 H30.6 L27.2 26.2 H17.8 Z" />
          <rect x="12" y="35.4" width="21" height="3.5" rx="1.05" />
          <path d="M18.4 31.4 C20.9 32.5 24.6 32.5 27.1 31.4" {...dline} fill="none" />
        </g>
      )}
    </svg>
  );
}
