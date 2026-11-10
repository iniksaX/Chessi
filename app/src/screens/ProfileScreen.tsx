/* Profile tab — identity, stats, achievements, theme JSON customizer, account. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state/AppStore';
import { TITLES } from '../data/titles';
import { AccountTitlePill, USER_AVATARS, UserAvatar } from '../components/bits';
import { ACHIEVEMENTS, ACHIEVEMENT_IDS, puzzleAccuracy } from '../achievements';
import { DEFAULT_THEME } from '../state/theme';


/* Circular avatar crop: drag to reposition, slider to zoom, 160px JPEG out. */
function AvatarCropModal({ src, onDone, onCancel }: { src: string; onDone: (dataUrl: string) => void; onCancel: () => void }) {
  const STAGE = 220;
  const [base, setBase] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const clampOffset = (x: number, y: number, scale: number, natW: number, natH: number) => {
    const maxX = Math.max(0, (natW * scale - STAGE) / 2);
    const maxY = Math.max(0, (natH * scale - STAGE) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const cover = Math.max(STAGE / img.naturalWidth, STAGE / img.naturalHeight);
    setBase(cover);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!drag.current || !imgRef.current) return;
    const nat = imgRef.current;
    const scale = base * zoom;
    const next = clampOffset(
      drag.current.ox + (e.clientX - drag.current.px),
      drag.current.oy + (e.clientY - drag.current.py),
      scale, nat.naturalWidth, nat.naturalHeight,
    );
    setOffset(next);
  };
  const onPointerUp = () => { drag.current = null; };

  const save = () => {
    const img = imgRef.current;
    if (!img) return;
    const scale = base * zoom;
    const view = STAGE / scale;
    const cx = img.naturalWidth / 2 - offset.x / scale;
    const cy = img.naturalHeight / 2 - offset.y / scale;
    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, cx - view / 2, cy - view / 2, view, view, 0, 0, 160, 160);
    onDone(canvas.toDataURL('image/jpeg', 0.86));
  };

  const scale = base * zoom;

  return (
    <div className="crop-backdrop" role="dialog" aria-modal="true" aria-label="Crop your profile photo">
      <div className="crop-panel">
        <div className="label" style={{ marginBottom: 2 }}>CROP PHOTO</div>
        <p className="muted" style={{ fontSize: 11, margin: '2px 0 0' }}>Drag to reposition · slider to zoom</p>
        <div className="crop-stage">
          <img
            ref={imgRef}
            src={src}
            alt="Avatar preview"
            onLoad={onImgLoad}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            draggable={false}
            style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})` }}
          />
        </div>
        <input className="crop-zoom" type="range" min={1} max={3} step={0.01} value={zoom} aria-label="Zoom" onChange={(e) => {
          const z = Number(e.target.value);
          setZoom(z);
          if (imgRef.current) setOffset((o) => clampOffset(o.x, o.y, base * z, imgRef.current!.naturalWidth, imgRef.current!.naturalHeight));
        }} />
        <div className="crop-row">
          <button className="btn ghost small block" onClick={onCancel}>Cancel</button>
          <button className="btn small block" onClick={save}>Use photo</button>
        </div>
      </div>
    </div>
  );
}

export function ProfileScreen() {
  const app = useApp();
  const account = app.account;
  const stats = app.stats;
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [displayName, setDisplayName] = useState(account?.displayName ?? '');
  const [bio, setBio] = useState(account?.bio ?? '');
  const [themeDraft, setThemeDraft] = useState(app.themeJson);
  const [themeErrors, setThemeErrors] = useState<string[]>([]);
  const [themeSaved, setThemeSaved] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const title = TITLES.find((t) => t.id === account?.titleId) ?? TITLES[0];
  const winRate = stats && stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  const avgAccuracy = stats && stats.accuracyCount > 0 ? Math.round(stats.accuracySum / stats.accuracyCount) : null;
  const flaggedGames = stats?.engineFlaggedGames ?? 0;

  const badges = useMemo(() => {
    if (!stats) return [];
    const out: Array<{ icon: string; label: string; sub: string }> = [];
    if (stats.gamesPlayed >= 1) out.push({ icon: '♟', label: 'First Steps', sub: 'Played your first rated game' });
    if (stats.wins >= 10) out.push({ icon: '⚔', label: 'Battle-Tested', sub: '10 rated wins' });
    if (stats.wins >= 50) out.push({ icon: '👑', label: 'Chess Connoisseur', sub: '50 rated wins' });
    if (stats.bestStreak >= 5) out.push({ icon: '🔥', label: 'On Fire', sub: `${stats.bestStreak}-game win streak` });
    if (stats.puzzlesSolved.length >= 10) out.push({ icon: '🧩', label: 'Tactician', sub: '10 puzzles solved' });
    if (stats.puzzlesSolved.length >= 25) out.push({ icon: '🧠', label: 'Calculator', sub: '25 puzzles solved' });
    if (stats.bestBotEloBeaten >= 1200) out.push({ icon: '🤖', label: 'Bot Breaker', sub: `Beat a ${stats.bestBotEloBeaten}-Elo bot` });
    if (stats.bestBotEloBeaten >= 1800) out.push({ icon: '🛑', label: 'Machine Slayer', sub: `Beat a ${stats.bestBotEloBeaten}-Elo bot` });
    if (avgAccuracy !== null && avgAccuracy >= 85) out.push({ icon: '🎯', label: 'Accuracy Robot', sub: `${avgAccuracy}% average accuracy` });
    if (stats.ratings.bullet.peak >= 1200 || stats.ratings.blitz.peak >= 1200 || stats.ratings.rapid.peak >= 1200) out.push({ icon: '🚀', label: 'Rating Rocket', sub: 'Peak 1200+ in a rated mode' });
    return out;
  }, [stats, avgAccuracy]);

  if (!account) return null;

  const saveIdentity = () => {
    app.updateAccount({ displayName: displayName.trim() || account.username, bio: bio.trim() });
    setEditingIdentity(false);
    app.toast('Profile saved');
  };

  const saveTheme = () => {
    const result = app.applyThemeJson(themeDraft);
    if (result.ok) {
      setThemeErrors([]);
      setThemeSaved(true);
      app.toast('Theme applied');
      window.setTimeout(() => setThemeSaved(false), 1600);
    } else {
      setThemeErrors(result.errors);
      setThemeSaved(false);
    }
  };

  const downloadTheme = () => {
    const blob = new Blob([themeDraft], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chessi-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setThemeDraft(text);
      const result = app.applyThemeJson(text);
      setThemeErrors(result.ok ? [] : result.errors);
      if (result.ok) app.toast('Theme imported and applied');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="screen screen-pad">
      {/* identity card */}
      <div className="card card-pad" style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
        <UserAvatar id={account.avatarId} size={84} src={account.customAvatar} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="h1" style={{ fontSize: 20, lineHeight: 1.15 }}>{account.displayName}</div>
          <div className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>@{account.username}</span>
            <AccountTitlePill account={account} small />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {title.id !== 'none' && <span className="title-pill" style={{ borderColor: title.hue, color: title.hue }}>{title.label}</span>}
            <span className="streak-flame">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2c1 4-4 5.5-4 10a4 4 0 0 0 8 0c0-1.5-.5-2.5-1.5-4-.5 1.5-1.5 2-2.5 2 .8-2.2.5-5.2-0-8z" /></svg>
              {stats?.currentStreak ?? 0} win streak
            </span>
          </div>
        </div>
        <button className="icon-btn" aria-label="Edit identity" onClick={() => { setDisplayName(account.displayName); setBio(account.bio); setEditingIdentity((v) => !v); }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4z" /></svg>
        </button>
      </div>

      {editingIdentity && (
        <div className="card card-pad" style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 6 }}>EDIT PROFILE</div>
          <input className="input" style={{ marginBottom: 8 }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" maxLength={40} aria-label="Display name" />
          <textarea className="input" style={{ minHeight: 64, fontSize: 13 }} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio — a line about your chess style…" maxLength={180} aria-label="Bio" />
          <button className="btn small block" style={{ marginTop: 8 }} onClick={saveIdentity}>Save</button>
        </div>
      )}

      {/* anti-cheat badge */}
      {flaggedGames > 0 && (
        <div className="card card-pad" style={{ marginBottom: 12, borderColor: '#6b3327' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="suspect-badge">SUSPECT</span>
            <div style={{ fontSize: 12, color: '#ffb59d', lineHeight: 1.4 }}>
              Engine-like play detected in {flaggedGames} reviewed game{flaggedGames === 1 ? '' : 's'}. Inter-player integrity matters — play your own game!
            </div>
          </div>
        </div>
      )}

      {/* ratings */}
      <div className="label" style={{ margin: '2px 2px 6px' }}>RATINGS</div>
      <div className="stat-grid" style={{ marginBottom: 12 }}>
        {(['bullet', 'blitz', 'rapid', 'puzzle'] as const).map((cat) => (
          <div className="stat-cell" key={cat}>
            <div className="v">{stats?.ratings[cat].rating ?? 800}</div>
            <div className="k">{cat}</div>
            <div className="muted" style={{ fontSize: 9 }}>peak {stats?.ratings[cat].peak ?? 800}</div>
          </div>
        ))}
      </div>

      {/* record */}
      <div className="stat-grid" style={{ marginBottom: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-cell"><div className="v">{stats?.gamesPlayed ?? 0}</div><div className="k">Games</div></div>
        <div className="stat-cell"><div className="v">{winRate}%</div><div className="k">Win rate</div></div>
        <div className="stat-cell"><div className="v">{avgAccuracy !== null ? `${avgAccuracy}%` : '—'}</div><div className="k">Avg accuracy</div></div>
      </div>

      {/* win/loss/draw bars per mode */}
      <div className="card card-pad" style={{ marginBottom: 12 }}>
        <div className="label" style={{ marginBottom: 8 }}>RECORD BY TIME CONTROL</div>
        {(['bullet', 'blitz', 'rapid'] as const).map((cat) => {
          const r = stats?.record[cat] ?? { w: 0, l: 0, d: 0 };
          const total = r.w + r.l + r.d;
          return (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 44, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-mid)' }}>{cat}</div>
              <div className="record-bar" aria-label={`${cat}: ${r.w} wins, ${r.l} losses, ${r.d} draws`}>
                {total > 0 ? (
                  <>
                    <div style={{ width: `${(r.w / total) * 100}%`, background: '#81b64c' }} />
                    <div style={{ width: `${(r.d / total) * 100}%`, background: '#e0a83d' }} />
                    <div style={{ width: `${(r.l / total) * 100}%`, background: '#e5533d' }} />
                  </>
                ) : <div style={{ width: '100%', background: '#2e2b27' }} />}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-mid)', width: 64, textAlign: 'right' }}>{r.w}W {r.l}L {r.d}D</div>
            </div>
          );
        })}
      </div>

      {/* badges */}
      {badges.length > 0 && (
        <>
          <div className="label" style={{ margin: '2px 2px 6px' }}>ACHIEVEMENTS</div>
          <div className="badge-shelf" style={{ marginBottom: 12 }}>
            {badges.map((b) => (
              <div key={b.label} className="badge-tile" title={b.sub}>
                <div style={{ fontSize: 24 }}>{b.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 800, marginTop: 2 }}>{b.label}</div>
                <div className="muted" style={{ fontSize: 8.5 }}>{b.sub}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* achievement titles — earned by play, stored locally */}
      <div className="label" style={{ margin: '2px 2px 6px' }}>ACHIEVEMENT TITLES</div>
      <div className="title-cloud" style={{ marginBottom: 12 }}>
        {ACHIEVEMENTS.map((a) => {
          const t = TITLES.find((x) => x.id === a.titleId)!;
          const prog = stats ? a.progress(stats) : { current: 0, target: 1 };
          const un = stats ? a.unlocked(stats) : false;
          const acc = stats ? puzzleAccuracy(stats) : null;
          return (
            <button
              key={t.id}
              className={`title-chip ${account.titleId === t.id ? 'selected' : ''} ${un ? '' : 'locked'}`}
              style={un && account.titleId === t.id ? { borderColor: t.hue, color: t.hue } : un ? { borderColor: t.hue, color: t.hue } : undefined}
              title={un ? t.blurb : `${t.blurb}${a.requirement ? ' · ' + a.requirement : ''}${acc !== null && a.titleId === 'tactician' ? ` (accuracy ${(acc * 100).toFixed(0)}%)` : ''}`}
              disabled={!un}
              aria-pressed={account.titleId === t.id}
              onClick={() => {
                if (!un) return;
                app.updateAccount({ titleId: t.id });
                app.toast(`Title set: ${t.label}`);
              }}
            >
              {!un && (
                <svg className="lock-ico" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
              <span>{t.label}</span>
              {!un && <span className="achievement-progress">{prog.current}/{prog.target}</span>}
            </button>
          );
        })}
      </div>
      {account.titleId !== 'none' && ACHIEVEMENT_IDS.has(account.titleId) && (
        <p className="muted" style={{ fontSize: 11, margin: '-6px 2px 10px' }}>
          Earned title — rendered next to your @username in matches and profile.
        </p>
      )}

      {/* regular titles */}
      <div className="label" style={{ margin: '2px 2px 6px' }}>TITLE</div>
      <div className="title-cloud" style={{ marginBottom: 12 }}>
        {TITLES.filter((t) => !ACHIEVEMENT_IDS.has(t.id)).map((t) => (
          <button
            key={t.id}
            className={`title-chip ${account.titleId === t.id ? 'selected' : ''}`}
            style={account.titleId === t.id ? { borderColor: t.hue, color: t.hue } : undefined}
            title={t.blurb}
            onClick={() => { app.updateAccount({ titleId: t.id }); app.toast(t.id === 'none' ? 'Title cleared' : `Title set: ${t.label}`); }}
          >
            {t.id === 'none' ? 'None' : t.label}
          </button>
        ))}
      </div>

      <div className="label" style={{ margin: '0 2px 6px' }}>AVATAR</div>
      <div className="avatar-grid" style={{ marginBottom: account.customAvatar ? 6 : 14 }}>
        <label className="avatar-upload" aria-label="Upload a photo from your gallery">
          <input type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            if (!/^image\//.test(file.type)) { app.toast('Please choose an image file'); return; }
            const reader = new FileReader();
            reader.onload = () => setCropSrc(String(reader.result ?? ''));
            reader.readAsDataURL(file);
          }} />
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></svg>
          <span style={{ fontSize: 9.5, fontWeight: 800, marginTop: 2 }}>UPLOAD</span>
        </label>
        {USER_AVATARS.map((a) => (
          <button key={a.id} className={`avatar-choice ${account.avatarId === a.id && !account.customAvatar ? 'selected' : ''}`} aria-label={`Avatar ${a.id}`} aria-pressed={account.avatarId === a.id && !account.customAvatar} onClick={() => app.updateAccount({ avatarId: a.id, customAvatar: undefined })}>
            <UserAvatar id={a.id} size={44} />
          </button>
        ))}
      </div>
      {account.customAvatar && (
        <button className="btn ghost small" style={{ marginBottom: 14 }} onClick={() => { app.updateAccount({ customAvatar: undefined }); app.toast('Custom photo removed'); }}>
          Remove custom photo
        </button>
      )}
      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onDone={(dataUrl) => { setCropSrc(null); app.updateAccount({ customAvatar: dataUrl }); app.toast('Avatar updated'); }}
        />
      )}

      {/* theme JSON customizer */}
      <div className="label" style={{ margin: '0 2px 6px' }}>APPEARANCE — THEME JSON</div>
      <div className="card card-pad" style={{ marginBottom: 12 }}>
        <p className="dim" style={{ fontSize: 12, marginTop: 0 }}>
          Chessi's entire look — board colors, accents, highlights, sounds — is driven by one JSON file. Edit it, import a friend's, or reset it.
        </p>
        <textarea className="textarea" style={{ minHeight: 150 }} value={themeDraft} onChange={(e) => setThemeDraft(e.target.value)} spellCheck={false} aria-label="Theme JSON" />
        {themeErrors.length > 0 && (
          <div className="field-error" role="alert" style={{ marginTop: 6 }}>
            {themeErrors.slice(0, 6).map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn small" onClick={saveTheme}>{themeSaved ? 'Applied ✓' : 'Apply theme'}</button>
          <button className="btn ghost small" onClick={downloadTheme}>Export</button>
          <label className="btn ghost small" style={{ cursor: 'pointer' }}>
            Import
            <input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImportTheme} />
          </label>
          <button className="btn ghost small" onClick={() => { setThemeDraft(JSON.stringify(DEFAULT_THEME, null, 2)); app.resetTheme(); setThemeErrors([]); app.toast('Theme reset to Chessi Classic'); }}>Reset</button>
        </div>
      </div>

      {/* sign out */}
      <button className="btn danger block" style={{ marginBottom: 'calc(10px + env(safe-area-inset-bottom))' }} onClick={() => app.signOut()}>
        Sign out
      </button>
      <div className="muted" style={{ textAlign: 'center', fontSize: 10.5, marginBottom: 8 }}>
        Account stored securely on this device · passwords PBKDF2-SHA256 · Chessi v1.0.0
      </div>
    </div>
  );
}
