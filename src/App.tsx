import { useState, useEffect } from 'react'
import LogView from './components/LogView'
import SummaryView from './components/SummaryView'
import SettingsView from './components/SettingsView'
import AuthButton from './components/AuthButton'
import { loadStoredUser, initGoogleAuth, signOut } from './auth'
import type { AuthUser } from './auth'

type View = { name: 'log'; date?: string } | { name: 'summary' } | { name: 'settings' }

export default function App() {
  const [view, setView] = useState<View>({ name: 'log' })
  const [catVersion, setCatVersion] = useState(0)
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser())
  const [gisReady, setGisReady] = useState(false)

  useEffect(() => {
    initGoogleAuth((u) => setUser(u), () => setGisReady(true))
  }, [])

  function handleSignOut() {
    signOut(user)
    setUser(null)
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
        {view.name === 'log' ? (
          <LogView
            key={`${view.date ?? 'today'}-${catVersion}`}
            initialDate={view.date}
            onSummary={() => setView({ name: 'summary' })}
          />
        ) : view.name === 'summary' ? (
          <SummaryView
            key={`summary-${catVersion}`}
            onBack={() => setView({ name: 'log' })}
            onNavigateToDay={(date) => setView({ name: 'log', date })}
          />
        ) : (
          <SettingsView
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
