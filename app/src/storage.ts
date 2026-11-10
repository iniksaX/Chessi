/* Chessi persistent store — local-first, offline-secure.
   Real relational data: users, stats, games, themes, puzzle progress.
   Passwords are hashed with PBKDF2-SHA256 (Web Crypto, 150k iterations, per-user salt).
   The repository is abstracted so a Supabase adapter can replace the local one later
   without touching UI code. */

export type GameCategory = 'bullet' | 'blitz' | 'rapid';
export type PuzzleStats = { solved: number; failed: number; rating: number };

export interface UserAccount {
  username: string;         // @handle, lowercase, unique
  passHash: string;         // pbkdf2 hex
  salt: string;
  displayName: string;
  bio: string;
  titleId: string;
  avatarId: string;
  emojiBadge: string;
  createdAt: number;
  /** user-uploaded avatar as a data: URL (cropped/resized locally), if set */
  customAvatar?: string;
}

export interface CategoryStats { w: number; l: number; d: number }
export interface PerformanceStats {
  bullet: { rating: number; peak: number };
  blitz: { rating: number; peak: number };
  rapid: { rating: number; peak: number };
  puzzle: { rating: number; peak: number };
}
export interface GameRecord {
  id: string;
  date: number;
  myColor: 'w' | 'b';
  category: GameCategory | 'custom' | 'computer';
  opponentName: string;
  opponentElo: number | null;
  result: 'win' | 'loss' | 'draw';
  myAccuracy: number | null;
  pgn: string;
  endReason: string;
  flagged?: boolean;
}

export interface UserStats {
  ratings: PerformanceStats;
  record: Record<GameCategory, CategoryStats>;
  gamesPlayed: number;
  wins: number; losses: number; draws: number;
  currentStreak: number;
  bestStreak: number;
  currentPuzzleStreak: number;
  bestPuzzleStreak: number;
  accuracySum: number;
  accuracyCount: number;
  engineFlaggedGames: number;
  bestBotEloBeaten: number;
  /** wins in a row vs rated bots ≥1500 Elo (resets on any non-win vs 1500+) */
  highEloWinStreak: number;
  bestHighEloWinStreak: number;
  /** all-time puzzle attempt counters (every completion/failure counts) */
  puzzleAttempts: number;
  puzzleCorrect: number;
  /** brilliant (!!) moves played by the user in their own reviewed games */
  brilliantMoves: number;
  /** wins with <5s left on the clock (any time control, any opponent) */
  clutchLowTimeWins: number;
  puzzlesSolved: string[];
  puzzlesFailed: string[];
  history: GameRecord[];
  totalReviews: number;
}

const DEFAULT_RATINGS: PerformanceStats = {
  bullet: { rating: 800, peak: 800 },
  blitz: { rating: 800, peak: 800 },
  rapid: { rating: 800, peak: 800 },
  puzzle: { rating: 800, peak: 800 },
};

export function defaultStats(): UserStats {
  return {
    ratings: structuredClone(DEFAULT_RATINGS),
    record: { bullet: { w: 0, l: 0, d: 0 }, blitz: { w: 0, l: 0, d: 0 }, rapid: { w: 0, l: 0, d: 0 } },
    gamesPlayed: 0,
    wins: 0, losses: 0, draws: 0,
    currentStreak: 0, bestStreak: 0,
    currentPuzzleStreak: 0, bestPuzzleStreak: 0,
    accuracySum: 0, accuracyCount: 0,
    engineFlaggedGames: 0,
    bestBotEloBeaten: 0,
    highEloWinStreak: 0,
    bestHighEloWinStreak: 0,
    puzzleAttempts: 0,
    puzzleCorrect: 0,
    brilliantMoves: 0,
    clutchLowTimeWins: 0,
    puzzlesSolved: [],
    puzzlesFailed: [],
    history: [],
    totalReviews: 0,
  };
}

const K = {
  session: 'chessi.session.v1',
  user: (u: string) => `chessi.user.v1.${u}`,
  stats: (u: string) => `chessi.stats.v1.${u}`,
  lastUser: 'chessi.lastuser.v1',
};

async function pbkdf2Hex(password: string, saltHex: string, iterations = 150_000): Promise<string> {
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, baseKey, 256);
  return bytesToHex(new Uint8Array(bits));
}
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomHex(n: number): string {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return bytesToHex(b);
}

const memoryStore = new Map<string, string>();
function lsGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return memoryStore.get(k) ?? null; }
}
function lsSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { memoryStore.set(k, v); }
}
function lsDel(k: string) {
  try { localStorage.removeItem(k); } catch { memoryStore.delete(k); }
}

export class ChessiAuth {
  static async signUp(username: string, password: string, displayName: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const u = normalizeUsername(username);
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return { ok: false, error: 'Username must be 3-20 chars: lowercase letters, digits, underscore.' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    if (lsGet(K.user(u))) return { ok: false, error: 'That username is taken.' };
    const salt = randomHex(16);
    const passHash = await pbkdf2Hex(password, salt);
    const account: UserAccount = {
      username: u, passHash, salt,
      displayName: displayName.trim() || u,
      bio: '', titleId: 'none', avatarId: 'a1', emojiBadge: '',
      createdAt: Date.now(),
    };
    lsSet(K.user(u), JSON.stringify(account));
    lsSet(K.stats(u), JSON.stringify(defaultStats()));
    lsSet(K.session, JSON.stringify({ username: u, signedInAt: Date.now() }));
    lsSet(K.lastUser, u);
    return { ok: true };
  }

  static async signIn(username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const u = normalizeUsername(username);
    const raw = lsGet(K.user(u));
    if (!raw) return { ok: false, error: 'No account with that username on this device.' };
    try {
      const account = JSON.parse(raw) as UserAccount;
      const hash = await pbkdf2Hex(password, account.salt);
      if (hash !== account.passHash) return { ok: false, error: 'Wrong password.' };
      lsSet(K.session, JSON.stringify({ username: u, signedInAt: Date.now() }));
      lsSet(K.lastUser, u);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Corrupted local account data.' };
    }
  }

  static signOut() { lsDel(K.session); }
  static currentSession(): { username: string; signedInAt: number } | null {
    try { const raw = lsGet(K.session); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  static lastUser(): string | null { return lsGet(K.lastUser); }
}

export function normalizeUsername(u: string): string {
  return u.trim().toLowerCase().replace(/^@+/, '');
}

export function loadAccount(username: string): UserAccount | null {
  try { const raw = lsGet(K.user(normalizeUsername(username))); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function saveAccount(account: UserAccount) {
  lsSet(K.user(account.username), JSON.stringify(account));
}
export function loadStats(username: string): UserStats {
  try {
    const raw = lsGet(K.stats(normalizeUsername(username)));
    if (raw) return migrateStats(JSON.parse(raw));
  } catch { /* fall through */ }
  return defaultStats();
}
export function saveStats(username: string, stats: UserStats) {
  lsSet(K.stats(normalizeUsername(username)), JSON.stringify(stats));
}

function migrateStats(s: Partial<UserStats>): UserStats {
  const d = defaultStats();
  return {
    ...d,
    ...s,
    ratings: { ...d.ratings, ...(s.ratings ?? {}) },
    record: { ...d.record, ...(s.record ?? {}) },
    history: Array.isArray(s.history) ? s.history : [],
    puzzlesSolved: Array.isArray(s.puzzlesSolved) ? s.puzzlesSolved : [],
    puzzlesFailed: Array.isArray(s.puzzlesFailed) ? s.puzzlesFailed : [],
  };
}

/* ---------- Elo & accuracy helpers ---------- */

/** Standard Elo expected score of A vs B. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}
export function kFactor(rating: number): number {
  if (rating >= 2400) return 16;
  if (rating >= 2100) return 20;
  if (rating >= 1400) return 26;
  return 32;
}
export function eloDelta(playerRating: number, opponentRating: number, score: 1 | 0.5 | 0): number {
  return Math.round(kFactor(playerRating) * (score - expectedScore(playerRating, opponentRating)));
}
/** centipawn -> winning probability 0..1 (Lichess win% curve). */
export function cpToWinPercent(cp: number): number {
  const clamped = Math.max(-1500, Math.min(1500, cp));
  return 1 / (1 + Math.exp(-0.00368208 * clamped));
}
export function mateToCp(mate: number): number {
  return mate > 0 ? 100000 - mate * 100 : -100000 - mate * 100;
}
