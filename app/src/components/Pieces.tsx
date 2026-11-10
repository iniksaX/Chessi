/* Chessi "Neo" geometric vector piece set — original flat, angular artwork.
   Single primary shape per piece, two-tone fill, no gradients. */

export type NeoPiece = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

interface PieceProps {
  piece: NeoPiece;
  color: PieceColor;
  strokeWidth?: number;
}

const FILL: Record<PieceColor, string> = {
  w: '#f2efe2',
  b: '#2b2926',
};
const STROKE: Record<PieceColor, string> = {
  w: '#232019',
  b: '#e8e4d2',
};

export function NeoPieceSvg({ piece, color, strokeWidth = 1.6 }: PieceProps) {
  const fill = FILL[color];
  const stroke = STROKE[color];
  const common = {
    fill,
    stroke,
    strokeWidth,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };
  const detail = color === 'w' ? '#232019' : '#e8e4d2';

  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true">
      {piece === 'p' && (
        <g {...common}>
          <rect x="13.2" y="33" width="18.6" height="4.1" rx="1.1" />
          <rect x="16.6" y="28.2" width="11.8" height="3.1" rx="0.9" />
          <path d="M17.4 28.4 L19.6 15.4 L25.4 15.4 L27.6 28.4 Z" />
          <circle cx="22.5" cy="11.4" r="5.4" />
        </g>
      )}
      {piece === 'r' && (
        <g {...common}>
          <rect x="12.4" y="33.2" width="20.2" height="4" rx="1.1" />
          <path d="M14.8 33.2 L15.9 18.4 L29.1 18.4 L30.2 33.2 Z" />
          <path d="M13.6 18.4 V11.6 H17.8 V15.2 H21.4 V11.6 H23.6 V15.2 H27.2 V11.6 H31.4 V18.4 Z" />
          <line x1="15.9" y1="24" x2="29.1" y2="24" stroke={detail} strokeWidth={strokeWidth * 0.9} />
        </g>
      )}
      {piece === 'n' && (
        <g {...common}>
          <rect x="12.6" y="33.4" width="19.8" height="4" rx="1.1" />
          <path d="M14 33.6 L14.6 26.8 C15.1 22.2 17.8 19 21.6 15.9 L24.9 13.4 L22.4 11.6 L25.9 8.6 L31.6 14.2 C33.4 16.2 34 19.4 33.2 22.6 L31 29.4 C29.9 32.5 28.6 33.2 28.6 33.6 Z" />
          <path d="M21.4 12.2 L19.3 9.2 L24.6 9.8 Z" fill={detail} stroke="none" />
          <circle cx="27.6" cy="15.2" r="1.05" fill={detail} stroke="none" />
          <line x1="17.6" y1="24.5" x2="23.5" y2="24.5" stroke={detail} strokeWidth={strokeWidth * 0.85} />
        </g>
      )}
      {piece === 'b' && (
        <g {...common}>
          <rect x="13.6" y="33.2" width="17.8" height="4" rx="1.1" />
          <path d="M22.5 6.6 C27.6 12 30 16.6 30 21.4 C30 25.6 27.3 28.6 23.2 30 L27.2 33.2 H17.8 L21.8 30 C17.7 28.6 15 25.6 15 21.4 C15 16.6 17.4 12 22.5 6.6 Z" />
          <line x1="19.4" y1="21.6" x2="25.6" y2="16.8" stroke={detail} strokeWidth={strokeWidth * 1.05} />
        </g>
      )}
      {piece === 'q' && (
        <g {...common}>
          <rect x="13" y="33.2" width="19" height="4" rx="1.1" />
          <path d="M13.6 33.2 L14.5 22.4 L12.4 12.2 L18.4 18 L22.5 9.4 L26.6 18 L32.6 12.2 L30.5 22.4 L31.4 33.2 Z" />
          <circle cx="12.4" cy="11" r="1.55" />
          <circle cx="22.5" cy="8" r="1.7" />
          <circle cx="32.6" cy="11" r="1.55" />
          <line x1="15.6" y1="27.6" x2="29.4" y2="27.6" stroke={detail} strokeWidth={strokeWidth * 0.9} />
        </g>
      )}
      {piece === 'k' && (
        <g {...common}>
          <rect x="13" y="33.2" width="19" height="4" rx="1.1" />
          <path d="M15.2 33.2 C13.6 25.4 15.4 19.4 22.5 16.6 C29.6 19.4 31.4 25.4 29.8 33.2 Z" />
          <rect x="21.1" y="5.4" width="2.8" height="9.4" rx="0.6" stroke="none" />
          <rect x="17.8" y="8.7" width="9.4" height="2.8" rx="0.6" stroke="none" />
          <circle cx="22.5" cy="18.3" r="1.35" fill={detail} stroke="none" />
        </g>
      )}
    </svg>
  );
}

/** Small capturable piece glyph for trays (renders up to `count` icons). */
export function PieceGlyph({ piece, color, size = 17 }: { piece: NeoPiece; color: PieceColor; size?: number }) {
  return (
    <span style={{ width: size, height: size, display: 'inline-block' }}>
      <NeoPieceSvg piece={piece} color={color} strokeWidth={1.9} />
    </span>
  );
}
