/* Play tab — home. Quick actions, ratings summary, bot picker, pass & play setup. */

import React, { useMemo, useState } from 'react';
import { useApp } from '../state/AppStore';
import { BOTS } from '../data/bots';
import { BotAvatar, UserAvatar } from '../components/bits';
import { ChessiAuth } from '../storage';

type ColorChoice = 'w' | 'b' | 'random';

const TIME_CONTROLS: Array<{ label: string; base: number; inc: number; cat: 'bullet' | 'blitz' | 'rapid' }> = [
  { label: '1+0', base: 60, inc: 0, cat: 'bullet' },
  { label: '2+1', base: 120, inc: 1, cat: 'bullet' },
  { label: '3+2', base: 180, inc: 2, cat: 'bullet' },
  { label: '5+3', base: 300, inc: 3, cat: 'blitz' },
  { label: '10+5', base: 600, inc: 5, cat: 'blitz' },
  { label: '10+10', base: 600, inc: 10, cat: 'rapid' },
  { label: '15+10', base: 900, inc: 10, cat: 'rapid' },
  { label: '30+0', base: 1800, inc: 0, cat: 'rapid' },
];

export function HomeScreen() {
  const app = useApp();
  const stats = app.stats;
  const account = app.account;

  const [botSheet, setBotSheet] = useState(false);
  const [passSheet, setPassSheet] = useState(false);
  const [selectedBot, setSelectedBot] = useState(BOTS[3].id); // Forked Freddy 800
  const [tc, setTc] = useState(TIME_CONTROLS[4]); // 10+5
  const [colorChoice, setColorChoice] = useState<ColorChoice>('random');
  const [passTc, setPassTc] = useState<number | null>(null); // null = unlimited

  const startComputerGame = () => {
    const bot = BOTS.find((b) => b.id === selectedBot)!;
    const playerColor: 'w' | 'b' = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice;
    app.startGame({ kind: 'computer', botId: bot.id, timeBase: tc.base, timeInc: tc.inc, playerColor });
    setBotSheet(false);
  };

  const startPassPlay = () => {
    app.startGame({ kind: 'passplay', timeBase: passTc ?? 0, timeInc: 0, variant: 'standard', playerColor: 'w' });
    setPassSheet(false);
  };

  const bot = BOTS.find((b) => b.id === selectedBot)!;

  const ratingFor = (cat: 'bullet' | 'blitz' | 'rapid') => stats?.ratings[cat]?.rating ?? 800;

  return (
    <div className="screen screen-pad" style={{ position: 'relative' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="logo-badge" aria-hidden="true">
          <svg viewBox="0 0 100 100" width="40" height="40">
            <rect width="100" height="100" rx="22" fill="#81b64c" />
            <path d="M38 74h24v-6H38z M35.5 62h29l-2-9c4-2 6.5-6.8 6.5-12.5C69 31 61.5 25 50 25s-19 6-19 15.5c0 2.3.5 4.5 1.6 6.5-4.2 2.6-6.6 7.4-6.6 12.3C26 61.5 29 63.7 31 64l-1.5 5z" fill="#eeeed2" />
          </svg>
        </div>
        <div>
          <div className="h1" style={{ lineHeight: 1 }}>Chessi</div>
          <div className="muted" style={{ fontSize: 10.5, letterSpacing: 0.4 }}>100% FREE · OPEN SOURCE · OFFLINE</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="icon-btn" aria-label="Sound on/off" onClick={() => app.applyThemeJson(JSON.stringify({ ...JSON.parse(app.themeJson), sounds: { ...JSON.parse(app.themeJson).sounds, enabled: !app.theme.sounds.enabled } }))}>
          {app.theme.sounds.enabled ? (
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.2 6a9 9 0 0 1 0 12" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
          )}
        </button>
        <button className="icon-btn" style={{ padding: 0 }} aria-label="Profile" onClick={() => app.setTab('profile')}>
          {account && <UserAvatar id={account.avatarId} size={38} />}
        </button>
      </div>

      {/* ratings */}
      <div className="stat-grid" style={{ marginBottom: 14 }}>
        {(['bullet', 'blitz', 'rapid'] as const).map((cat) => (
          <div className="stat-cell" key={cat}>
            <div className="v">{ratingFor(cat)}</div>
            <div className="k">{cat}</div>
          </div>
        ))}
        <div className="stat-cell">
          <div className="v">{stats?.ratings.puzzle.rating ?? 800}</div>
          <div className="k">puzzle</div>
        </div>
      </div>

      {/* hero CTA */}
      <button className="hero-play" onClick={() => setBotSheet(true)} aria-label="Play vs computer">
        <div>
          <div className="hero-kicker">QUICK PLAY</div>
          <div className="hero-title">Play vs Computer</div>
          <div className="hero-sub">14 offline bots · 250 to 2800 Elo · no wifi, no signup, no ads</div>
        </div>
        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#1c2a12" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </button>

      {/* secondary actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="action-tile" onClick={() => setPassSheet(true)}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.4" /><path d="M3.5 20c0-3.3 2.5-5.4 5.5-5.4s5.5 2.1 5.5 5.4" /><circle cx="17.5" cy="9.5" r="2.6" /><path d="M16 14.8c2.8.3 4.5 2.3 4.5 5" /></svg>
          <span className="action-tile-title">Pass &amp; Play</span>
          <span className="action-tile-sub">Two humans, one board</span>
        </button>
        <button className="action-tile" onClick={() => app.setTab('puzzles')}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 2-1 3-1 5h-3M12 2a7 7 0 0 0-7 7c0 2 1 3 1 5h3" /><path d="M9 18h6M10 22h4M12 14v4" /></svg>
          <span className="action-tile-title">Puzzles</span>
          <span className="action-tile-sub">Sharpen your tactics</span>
        </button>
        <button className="action-tile" onClick={() => app.setTab('watch')}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" opacity="0.9" /></svg>
          <span className="action-tile-title">Watch</span>
          <span className="action-tile-sub">Immortal games</span>
        </button>
      </div>

      {/* recent activity */}
      <div className="label" style={{ margin: '16px 2px 8px' }}>RECENT GAMES</div>
      <div className="card">
        {stats && stats.history.length > 0 ? (
          <div className="history-list">
            {stats.history.slice(0, 5).map((g) => {
              const color = g.result === 'win' ? '#81b64c' : g.result === 'loss' ? '#e5533d' : '#e0a83d';
              return (
                <div key={g.id} className="history-row">
                  <span className="history-result" style={{ background: color }}>{g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>vs {g.opponentName}{g.opponentElo ? ` (${g.opponentElo})` : ''}</div>
                    <div className="muted" style={{ fontSize: 10.5 }}>{new Date(g.date).toLocaleDateString()} · {g.category} · by {g.endReason}</div>
                  </div>
                  <button className="icon-btn small-icon" aria-label="Review this game" title="Review" onClick={() => app.openReview(g.pgn, `vs ${g.opponentName}`)}>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3.2" /></svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-pad" style={{ textAlign: 'center', padding: '22px 16px' }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>♟</div>
            <div className="h2">No games yet</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Play your first game against the computer — it works fully offline.</div>
          </div>
        )}
      </div>

      {/* ---------- bot picker sheet ---------- */}
      {botSheet && (
        <div className="sheet-backdrop" onClick={() => setBotSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Choose opponent" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="h2" style={{ marginBottom: 2 }}>Choose your opponent</div>
            <div className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>Rated game · win to gain Elo</div>

            <div className="bot-list">
              {BOTS.map((b) => (
                <button key={b.id} className={`bot-row ${selectedBot === b.id ? 'selected' : ''}`} onClick={() => setSelectedBot(b.id)}>
                  <BotAvatar hue={b.hue} piece={b.piece} size={46} />
                  <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                    <span className="pname" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {b.name} <span className="elo-pill">{b.elo}</span>
                    </span>
                    <span className="muted" style={{ display: 'block', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.tagline}</span>
                  </span>
                  {selectedBot === b.id && (
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#81b64c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  )}
                </button>
              ))}
            </div>

            <div className="label" style={{ margin: '12px 2px 6px' }}>TIME CONTROL</div>
            <div className="tc-chips">
              {TIME_CONTROLS.map((t) => (
                <button key={t.label} className={`tc-chip ${tc.label === t.label ? 'active' : ''}`} onClick={() => setTc(t)}>
                  {t.label}
                  <span className="tc-cat">{t.cat}</span>
                </button>
              ))}
            </div>

            <div className="label" style={{ margin: '12px 2px 6px' }}>YOUR SIDE</div>
            <div className="seg" style={{ marginBottom: 12 }}>
              {(['w', 'random', 'b'] as const).map((c) => (
                <button key={c} className={colorChoice === c ? 'active' : ''} onClick={() => setColorChoice(c)}>
                  {c === 'w' ? 'White' : c === 'b' ? 'Black' : 'Random'}
                </button>
              ))}
            </div>

            <button className="btn block" onClick={startComputerGame}>
              Start vs {bot.name} ({bot.elo}) · {tc.label}
            </button>
          </div>
        </div>
      )}

      {/* ---------- pass & play sheet ---------- */}
      {passSheet && (
        <div className="sheet-backdrop" onClick={() => setPassSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="h2" style={{ marginBottom: 2 }}>Pass &amp; Play</div>
            <div className="muted" style={{ fontSize: 11.5, marginBottom: 12 }}>Take turns on the same device. Board flips automatically.</div>
            <div className="label" style={{ margin: '0 2px 6px' }}>CLOCK</div>
            <div className="tc-chips">
              <button className={`tc-chip ${passTc === null ? 'active' : ''}`} onClick={() => setPassTc(null)}>∞<span className="tc-cat">casual</span></button>
              {TIME_CONTROLS.slice(0, 6).map((t) => (
                <button key={t.label} className={`tc-chip ${passTc === t.base ? 'active' : ''}`} onClick={() => setPassTc(t.base)}>
                  {t.label}
                </button>
              ))}
            </div>
            <button className="btn block" style={{ marginTop: 14 }} onClick={startPassPlay}>Start game</button>
          </div>
        </div>
      )}
    </div>
  );
}
