/* Chessi app context — session, profile, stats, theme, sounds, toasts. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChessiAuth, loadAccount, loadStats, saveAccount, saveStats,
  type UserAccount, type UserStats,
} from '../storage';
import { applyTheme, loadTheme, saveTheme, validateTheme, DEFAULT_THEME, type ChessiTheme } from './theme';
import { setSoundEnabled, setSoundVolume, primeAudio } from '../audio';

export type Tab = 'play' | 'puzzles' | 'watch' | 'review' | 'profile';
export type ActiveGame =
  | { kind: 'computer'; botId: string; timeBase: number; timeInc: number; playerColor: 'w' | 'b' }
  | { kind: 'passplay'; timeBase: number; timeInc: number; variant: 'standard'; playerColor: 'w' | 'b' };

interface AppContextValue {
  account: UserAccount | null;
  stats: UserStats | null;
  ready: boolean;
  signUp: (username: string, password: string, displayName: string) => Promise<string | null>;
  signIn: (username: string, password: string) => Promise<string | null>;
  signOut: () => void;
  updateAccount: (patch: Partial<UserAccount>) => void;
  updateStats: (fn: (s: UserStats) => UserStats) => void;
  theme: ChessiTheme;
  applyThemeJson: (json: string) => { ok: boolean; errors: string[] };
  resetTheme: () => void;
  themeJson: string;
  tab: Tab;
  setTab: (t: Tab) => void;
  activeGame: ActiveGame | null;
  startGame: (g: ActiveGame) => void;
  endGame: () => void;
  reviewPgn: string | null;
  reviewTitle?: string;
  openReview: (pgn: string, title?: string) => void;
  toast: (msg: string) => void;
}

const Ctx = createContext<AppContextValue | null>(null);

const THEME_JSON_KEY = 'chessi.theme.json.v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<ChessiTheme>(() => loadTheme());
  const [tab, setTab] = useState<Tab>('play');
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [reviewPgn, setReviewPgn] = useState<string | null>(null);
  const [reviewTitle, setReviewTitle] = useState<string | undefined>(undefined);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // unlock the audio engine on the first user gesture, anywhere in the app
  useEffect(() => {
    const prime = () => primeAudio();
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  useEffect(() => {
    const session = ChessiAuth.currentSession();
    if (session) {
      const acc = loadAccount(session.username);
      if (acc) {
        setAccount(acc);
        setStats(loadStats(acc.username));
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    setSoundEnabled(theme.sounds.enabled);
    setSoundVolume(theme.sounds.volume);
    saveTheme(theme);
  }, [theme]);

  const signUp = useCallback(async (username: string, password: string, displayName: string) => {
    const r = await ChessiAuth.signUp(username, password, displayName);
    if (!r.ok) return r.error;
    const u = username.trim().toLowerCase();
    setAccount(loadAccount(u));
    setStats(loadStats(u));
    return null;
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const r = await ChessiAuth.signIn(username, password);
    if (!r.ok) return r.error;
    const u = username.trim().toLowerCase();
    setAccount(loadAccount(u));
    setStats(loadStats(u));
    return null;
  }, []);

  const signOut = useCallback(() => {
    ChessiAuth.signOut();
    setAccount(null);
    setStats(null);
    setActiveGame(null);
    setTab('play');
  }, []);

  const updateAccount = useCallback((patch: Partial<UserAccount>) => {
    setAccount((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveAccount(next);
      return next;
    });
  }, []);

  const updateStats = useCallback((fn: (s: UserStats) => UserStats) => {
    setStats((prev) => {
      const base = prev ?? loadStats(ChessiAuth.currentSession()?.username ?? '');
      const next = fn(base);
      const u = ChessiAuth.currentSession()?.username;
      if (u) saveStats(u, next);
      return next;
    });
  }, []);

  const themeJson = useMemo(() => JSON.stringify(theme, null, 2), [theme]);

  const applyThemeJson = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      const res = validateTheme(parsed);
      if (!res.ok || !res.theme) return { ok: false, errors: res.errors };
      setTheme(res.theme);
      try { localStorage.setItem(THEME_JSON_KEY, json); } catch { /* ignore */ }
      return { ok: true, errors: [] };
    } catch (e) {
      return { ok: false, errors: [e instanceof Error ? e.message : 'Invalid JSON'] };
    }
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(structuredClone(DEFAULT_THEME));
  }, []);

  const toastTimer = useRef<number | null>(null);
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const startGame = useCallback((g: ActiveGame) => setActiveGame(g), []);
  const endGame = useCallback(() => setActiveGame(null), []);
  const openReview = useCallback((pgn: string, title?: string) => {
    setReviewPgn(pgn);
    setReviewTitle(title);
    setTab('review');
  }, []);

  const value: AppContextValue = {
    account, stats, ready,
    signUp, signIn, signOut, updateAccount, updateStats,
    theme, applyThemeJson, resetTheme, themeJson,
    tab, setTab,
    activeGame, startGame, endGame,
    reviewPgn, reviewTitle, openReview,
    toast,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </Ctx.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
