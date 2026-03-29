import { useState } from 'react'
import LogView from './components/LogView'
import SummaryView from './components/SummaryView'

type View = { name: 'log'; date?: string } | { name: 'summary' }

export default function App() {
  const [view, setView] = useState<View>({ name: 'log' })

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-md mx-auto px-4">
        <header className="pt-4 pb-1 text-center">
          <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center justify-center gap-2">
            <img src="/favicon-32.svg" alt="" width={20} height={20} />
            Log Doom
          </h1>
        </header>
        {view.name === 'log' ? (
          <LogView
            key={view.date ?? 'today'}
            initialDate={view.date}
            onSummary={() => setView({ name: 'summary' })}
          />
        ) : (
          <SummaryView
            onBack={() => setView({ name: 'log' })}
            onNavigateToDay={(date) => setView({ name: 'log', date })}
          />
        )}
      </div>
    </div>
  )
}
