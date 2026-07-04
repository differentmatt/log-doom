import { useState, useEffect } from 'react'
import LogView from './components/LogView'
import SummaryView from './components/SummaryView'
import SettingsView from './components/SettingsView'
import AuthButton from './components/AuthButton'
import { loadStoredUser, initGoogleAuth, signOut } from './auth'
import type { AuthUser } from './auth'
import { initSync, updateSyncUser, refreshSync } from './sync'
import { getTrackers } from './storage'

type View = { name: 'log'; date?: string } | { name: 'summary' } | { name: 'settings' }

function initialTrackerId(): string {
  const stored = sessionStorage.getItem('logdoom:tracker')
  const active = getTrackers().filter((t) => !t.deleted)
  if (stored && active.some((t) => t.id === stored)) return stored
  return active[0]?.id ?? 'work'
}

export default function App() {
  const [view, setView] = useState<View>({ name: 'log' })
  const [catVersion, setCatVersion] = useState(0)
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser())
  const [gisReady, setGisReady] = useState(false)
  const [syncVersion, setSyncVersion] = useState(0)
  const [trackerId, setTrackerId] = useState<string>(initialTrackerId)

  const trackers = getTrackers().filter((t) => !t.deleted).sort((a, b) => a.sortOrder - b.sortOrder)
  const activeTracker = trackers.find((t) => t.id === trackerId) ?? trackers[0]

  useEffect(() => {
    initSync(user, () => setSyncVersion((v) => v + 1))
    initGoogleAuth((u) => setUser(u), () => setGisReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    updateSyncUser(user)
  }, [user])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshSync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  function handleSignOut() {
    signOut(user)
    setUser(null)
  }

  function handleSelectTracker(id: string) {
    setTrackerId(id)
    sessionStorage.setItem('logdoom:tracker', id)
    if (view.name === 'summary') setView({ name: 'log' })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-md mx-auto px-4">
        <header className="pt-4 pb-1 flex items-center justify-center relative">
          <AuthButton
            user={user}
            onSignOut={handleSignOut}
            gisReady={gisReady}
          />
          <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center justify-center gap-2">
            <img src="/favicon-32.svg" alt="" width={20} height={20} />
            Log Doom
          </h1>
          {view.name !== 'settings' && (
            <button
              onClick={() => setView({ name: 'settings' })}
              className="absolute right-0 h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-200"
              aria-label="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </header>
        {view.name !== 'settings' && trackers.length > 1 && (
          <div className="flex gap-1 pb-2">
            {trackers.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTracker(t.id)}
                className={`flex-1 h-8 rounded text-xs font-medium transition-colors ${
                  t.id === activeTracker.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {t.icon ? `${t.icon} ` : ''}{t.label}
              </button>
            ))}
          </div>
        )}
        {view.name === 'log' ? (
          <LogView
            key={`${activeTracker.id}-${view.date ?? 'today'}-${catVersion}-${syncVersion}`}
            tracker={activeTracker}
            initialDate={view.date}
            onSummary={activeTracker.id === 'work' ? () => setView({ name: 'summary' }) : undefined}
          />
        ) : view.name === 'summary' ? (
          <SummaryView
            key={`summary-${catVersion}-${syncVersion}`}
            onBack={() => setView({ name: 'log' })}
            onNavigateToDay={(date) => setView({ name: 'log', date })}
          />
        ) : (
          <SettingsView
            trackerId={activeTracker.id}
            onBack={() => {
              setCatVersion((v) => v + 1)
              setView({ name: 'log' })
            }}
          />
        )}
      </div>
    </div>
  )
}
