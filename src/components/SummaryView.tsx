import { getCategories, getRecentDays } from '../storage'

interface SummaryViewProps {
  onBack: () => void
  onNavigateToDay: (date: string) => void
}

function formatDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function SummaryView({ onBack, onNavigateToDay }: SummaryViewProps) {
  const days = getRecentDays(14)
  const allCats = getCategories()
  const catMap = new Map(allCats.map((c) => [c.id, c]))

  const totals: Record<string, number> = {}
  let grandTotal = 0
  for (const { log } of days) {
    for (const [catId, hours] of Object.entries(log)) {
      totals[catId] = (totals[catId] ?? 0) + hours
      grandTotal += hours
    }
  }

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const maxHours = sorted.length > 0 ? sorted[0][1] : 0

  return (
    <div>
      <div className="flex items-center py-3">
        <button
          onClick={onBack}
          className="h-10 w-10 flex items-center justify-center text-lg text-zinc-400 hover:text-zinc-100"
          aria-label="Back"
        >
          &larr;
        </button>
        <div className="flex-1 text-center">
          <div className="text-sm font-medium text-zinc-100">14-Day Summary</div>
          <div className="text-xs text-zinc-500">
            {grandTotal > 0 ? `${grandTotal}h total across ${days.length} days` : 'No data yet'}
          </div>
        </div>
        <div className="w-10" />
      </div>

      {sorted.length > 0 && (
        <div className="mt-2 space-y-2">
          {sorted.map(([catId, hours]) => {
            const cat = catMap.get(catId)
            const label = cat ? cat.label : catId
            const color = cat?.color ?? '#78716c'
            const isDeleted = cat?.deleted ?? false
            const pct = grandTotal > 0 ? Math.round((hours / grandTotal) * 100) : 0
            const barWidth = maxHours > 0 ? (hours / maxHours) * 100 : 0
            return (
              <div key={catId}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0${isDeleted ? ' ring-1 ring-zinc-600' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                    <span className={isDeleted ? 'text-zinc-500 truncate italic' : 'text-zinc-300 truncate'}>
                      {label}{isDeleted ? ' (archived)' : ''}
                    </span>
                  </div>
                  <span className="text-zinc-500 shrink-0 ml-2">
                    {hours}h &middot; {pct}%
                  </span>
                </div>
                <div className="h-3 bg-zinc-800 rounded overflow-hidden ml-4">
                  <div
                    className={`h-full rounded${isDeleted ? ' opacity-60' : ''}`}
                    style={{ width: `${barWidth}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {days.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Daily Breakdown
          </h3>
          <div className="space-y-1">
            {days.map(({ date, log }) => {
              const dayTotal = Object.values(log).reduce((s, v) => s + v, 0)
              const top3 = Object.entries(log)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([catId]) => catMap.get(catId)?.label ?? catId)
              return (
                <button
                  key={date}
                  onClick={() => onNavigateToDay(date)}
                  className="w-full text-left px-2 py-2 rounded hover:bg-zinc-800 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-200">{formatDisplay(date)}</div>
                    <div className="text-xs text-zinc-500 truncate">{top3.join(', ')}</div>
                  </div>
                  <span className="text-sm text-zinc-400 shrink-0 ml-2">{dayTotal}h</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6 pb-8">
        <button
          disabled
          className="w-full h-10 rounded text-sm text-zinc-600 border border-zinc-800 cursor-not-allowed"
        >
          Ask Claude to analyze (coming soon)
        </button>
      </div>
    </div>
  )
}
