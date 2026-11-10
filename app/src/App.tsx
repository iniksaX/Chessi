/* Chessi — app shell: auth gate, five-tab layout, immersive game overlay. */

import React from 'react';
import { AppProvider, useApp, type Tab } from './state/AppStore';
import { HomeScreen } from './screens/HomeScreen';
import { PuzzlesScreen } from './screens/PuzzlesScreen';
import { WatchScreen } from './screens/WatchScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AuthScreen } from './screens/AuthScreen';
import { GameScreen } from './screens/GameScreen';

const NAV: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  {
    id: 'play',
    label: 'Play',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3l12 9-12 9z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'puzzles',
    label: 'Puzzles',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3a3 3 0 0 1 6 0v2h4v6h2a3 3 0 0 1 0 6h-2v4H9v-2a3 3 0 0 0-6 0H2v-6h3V5h4z" />
      </svg>
    ),
  },
  {
    id: 'watch',
    label: 'Watch',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.8-6.7 10-6.7S22 12 22 12s-3.8 6.7-10 6.7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3.1" />
      </svg>
    ),
  },
  {
    id: 'review',
    label: 'Review',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V9M10 20V4M16 20v-8M22 20H2" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
      </svg>
    ),
  },
];

function Shell() {
  const app = useApp();

  if (!app.ready) {
    return (
      <div className="auth-root" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" style={{ width: 34, height: 34 }} />
      </div>
    );
  }

  if (!app.account) {
    return (
      <div className="app-shell">
        <AuthScreen />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {app.activeGame ? (
        <GameScreen />
      ) : (
        <>
          {app.tab === 'play' && <HomeScreen />}
          {app.tab === 'puzzles' && <PuzzlesScreen />}
          {app.tab === 'watch' && <WatchScreen />}
          {app.tab === 'review' && <ReviewScreen />}
          {app.tab === 'profile' && <ProfileScreen />}
          <nav className="bottom-nav" aria-label="Main navigation">
            {NAV.map((item) => (
              <button
                key={item.id}
                className={`nav-btn ${app.tab === item.id ? 'active' : ''}`}
                onClick={() => app.setTab(item.id)}
                aria-current={app.tab === item.id ? 'page' : undefined}
                aria-label={item.label}
              >
                <span className="nav-ico">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
