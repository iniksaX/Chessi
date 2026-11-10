/* Auth gate — local-first account system. Shown when no session exists.
   Accounts never leave the device; passwords are PBKDF2-hashed. */

import React, { useState } from 'react';
import { useApp } from '../state/AppStore';
import { ChessiAuth } from '../storage';

export function AuthScreen() {
  const app = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastUser = ChessiAuth.lastUser();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const err = mode === 'signup'
      ? await app.signUp(username, password, displayName)
      : await app.signIn(username, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="auth-root">
      <div className="auth-hero">
        <div className="auth-logo" aria-hidden="true">
          <svg viewBox="0 0 100 100" width="96" height="96">
            <rect width="100" height="100" rx="24" fill="#81b64c" />
            <path d="M38 76h24v-6.5H38z M35.5 64h29l-2-9.2c4-2.1 6.6-7 6.6-12.8C69.1 32.6 61.7 26 50 26S30.9 32.6 30.9 42c0 2.3.6 4.6 1.7 6.7-4.3 2.7-6.7 7.6-6.7 12.6C26 61.8 29.2 64 31.3 64.3L29.8 70z" fill="#eeeed2" />
          </svg>
        </div>
        <div className="auth-title">Chessi</div>
        <div className="auth-tagline">Chess for everyone. Forever free.<br />No ads, no paywalls, no internet needed.</div>
      </div>

      <form className="auth-card" onSubmit={submit}>
        <div className="seg" role="tablist" aria-label="Sign in or create account" style={{ marginBottom: 14 }}>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(null); }}>Create account</button>
          <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(null); }}>Sign in</button>
        </div>

        {mode === 'signup' && (
          <>
            <label className="label" htmlFor="displayName" style={{ marginBottom: 5 }}>DISPLAY NAME</label>
            <input id="displayName" className="input" style={{ marginBottom: 10 }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Magnus, but friendlier" maxLength={40} autoComplete="nickname" />
          </>
        )}

        <label className="label" htmlFor="username" style={{ marginBottom: 5 }}>USERNAME</label>
        <input id="username" className="input" style={{ marginBottom: 10 }} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={lastUser ? `@${lastUser}` : '@chessfan'} autoCapitalize="none" autoComplete="username" spellCheck={false} required minLength={3} />

        <label className="label" htmlFor="password" style={{ marginBottom: 5 }}>PASSWORD</label>
        <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={6} />

        {error && <div className="field-error" role="alert" style={{ marginTop: 8 }}>{error}</div>}

        <button className="btn block" type="submit" style={{ marginTop: 14 }} disabled={busy}>
          {busy ? 'Checking…' : mode === 'signup' ? 'Create account & play' : 'Sign in & play'}
        </button>

        <p className="muted" style={{ fontSize: 10.5, lineHeight: 1.5, margin: '12px 2px 0' }}>
          Chessi accounts live <b>only on this device</b>. Passwords are salted &amp; PBKDF2-SHA256 hashed (150,000 rounds) — they are never stored in plain text and never leave your phone. No email, no tracking, no cloud required.
        </p>
      </form>
    </div>
  );
}
