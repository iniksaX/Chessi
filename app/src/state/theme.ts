/* Chessi theme engine — the entire look of the app (board tiles, accents,
   move indicators, surfaces, sounds) is driven by a single JSON config file.
   The Settings screen exposes the raw JSON for power users; defaults ship here. */

export interface ChessiTheme {
  name: string;
  colors: {
    background: string;
    panel: string;
    panelRaised: string;
    boardLight: string;
    boardDark: string;
    accent: string;
    accentDeep: string;
    text: string;
    textDim: string;
    lastMove: string;
    selected: string;
    inCheck: string;
    legalDot: string;
    danger: string;
  };
  board: {
    showCoordinates: boolean;
    rounded: number;          // px radius of the board corners
    pieceStroke: 'none' | 'subtle' | 'bold';
    highlightLastMove: boolean;
  };
  sounds: {
    enabled: boolean;
    volume: number;           // 0..1
  };
  pieces: 'neo';              // geometric vector set (see Pieces.tsx)
}

export const DEFAULT_THEME: ChessiTheme = {
  name: 'Chessi Classic',
  colors: {
    background: '#312e2b',
    panel: '#262421',
    panelRaised: '#2b2926',
    boardLight: '#eeeed2',
    boardDark: '#81b64c',
    accent: '#81b64c',
    accentDeep: '#5d9948',
    text: '#ffffff',
    textDim: '#7b7b7b',
    lastMove: 'rgba(255,213,79,0.46)',
    selected: 'rgba(255,235,130,0.62)',
    inCheck: 'rgba(255,73,57,0.78)',
    legalDot: 'rgba(20,24,12,0.32)',
    danger: '#e5533d',
  },
  board: {
    showCoordinates: true,
    rounded: 6,
    pieceStroke: 'subtle',
    highlightLastMove: true,
  },
  sounds: { enabled: true, volume: 0.55 },
  pieces: 'neo',
};

export const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export interface ThemeValidationResult { ok: boolean; errors: string[]; theme?: ChessiTheme }

export function validateTheme(input: unknown): ThemeValidationResult {
  const errors: string[] = [];
  const t = input as Partial<ChessiTheme> | null;
  if (!t || typeof t !== 'object') return { ok: false, errors: ['Theme must be a JSON object.'] };
  if (typeof t.name !== 'string' || !t.name.trim()) errors.push('name must be a non-empty string.');
  const c = (t.colors ?? {}) as Partial<ChessiTheme['colors']>;
  const colorKeys: (keyof ChessiTheme['colors'])[] = [
    'background', 'panel', 'panelRaised', 'boardLight', 'boardDark', 'accent',
    'accentDeep', 'text', 'textDim', 'lastMove', 'selected', 'inCheck', 'legalDot', 'danger',
  ];
  const rgbaRe = /^rgba?\(\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?\s*(,\s*0?\.?\d+\s*)?\)$/i;
  const colorLike = (v: unknown): v is string => typeof v === 'string' && (HEX_RE.test(v) || rgbaRe.test(v));
  for (const k of colorKeys) {
    if (!colorLike(c[k])) errors.push(`colors.${k} must be a hex (#rgb, #rrggbb) or rgba() color, got: ${String(c[k])}`);
  }
  const b = (t.board ?? {}) as Partial<ChessiTheme['board']>;
  if (typeof b.showCoordinates !== 'boolean') errors.push('board.showCoordinates must be a boolean.');
  if (typeof b.highlightLastMove !== 'boolean') errors.push('board.highlightLastMove must be a boolean.');
  if (typeof b.rounded !== 'number' || b.rounded < 0 || b.rounded > 40) errors.push('board.rounded must be a number 0-40.');
  if (b.pieceStroke !== 'none' && b.pieceStroke !== 'subtle' && b.pieceStroke !== 'bold') errors.push("board.pieceStroke must be 'none' | 'subtle' | 'bold'.");
  const s = (t.sounds ?? {}) as Partial<ChessiTheme['sounds']>;
  if (typeof s.enabled !== 'boolean') errors.push('sounds.enabled must be a boolean.');
  if (typeof s.volume !== 'number' || s.volume < 0 || s.volume > 1) errors.push('sounds.volume must be a number between 0 and 1.');
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], theme: t as ChessiTheme };
}

function shade(hex: string, percent: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full.slice(0, 6), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const tgt = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const mix = (c: number) => Math.round((tgt - c) * p + c);
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function applyTheme(theme: ChessiTheme) {
  const r = document.documentElement.style;
  const c = theme.colors;
  r.setProperty('--bg', c.background);
  r.setProperty('--panel', c.panel);
  r.setProperty('--panel-2', c.panelRaised);
  r.setProperty('--panel-3', shade(c.panelRaised, 0.16));
  r.setProperty('--board-light', c.boardLight);
  r.setProperty('--board-dark', c.boardDark);
  r.setProperty('--accent', c.accent);
  r.setProperty('--accent-deep', c.accentDeep);
  r.setProperty('--accent-soft', c.accent.startsWith('#') ? `${c.accent}2b` : 'rgba(129,182,76,0.18)');
  r.setProperty('--text', c.text);
  r.setProperty('--text-dim', c.textDim);
  r.setProperty('--danger', c.danger);
  const boardEl = document.querySelectorAll<HTMLElement>('.board');
  boardEl.forEach((el) => {
    el.style.borderRadius = `${theme.board.rounded}px`;
  });
  document.body.style.background = `radial-gradient(1200px 800px at 50% -10%, ${shade(c.background, 0.09)} 0%, ${shade(c.background, -0.35)} 70%)`;
}

export function themeToCssVariables(theme: ChessiTheme): Record<string, string> {
  const c = theme.colors;
  return {
    '--board-light': c.boardLight,
    '--board-dark': c.boardDark,
    '--last-move': c.lastMove,
    '--selected': c.selected,
    '--in-check': c.inCheck,
    '--legal-dot': c.legalDot,
  };
}

const THEME_KEY = 'chessi.theme.v1';

export function loadTheme(): ChessiTheme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const res = validateTheme(parsed);
      if (res.ok && res.theme) return res.theme;
    }
  } catch { /* fall through to default */ }
  return structuredClone(DEFAULT_THEME);
}

export function saveTheme(theme: ChessiTheme) {
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
}

export function themeToJson(theme: ChessiTheme): string {
  return JSON.stringify(theme, null, 2);
}
