import { useState } from 'react'
import { getCategories, getRecentWeeks, getWeekEnd, getDaysInRange, formatDate } from '../storage'

interface SummaryViewProps {
  onBack: () => void
  onNavigateToDay: (date: string) => void
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function weekLabel(weekStart: string, index: number): string {
  if (index === 0) return 'This Week'
  const [, month, day] = weekStart.split('-').map(Number)
  const d = new Date(2000, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDayDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const dow = DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1]
  return `${dow}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export default function SummaryView({ onBack, onNavigateToDay }: SummaryViewProps) {
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)

  const allCats = getCategories()
  const catMap = new Map(allCats.map((c) => [c.id, c]))
  const weeks = getRecentWeeks(4)

  // Compute totals per week for pill labels
  const weekTotals = weeks.map((weekStart) => {
    const end = getWeekEnd(weekStart)
    const days = getDaysInRange(weekStart, end)
    let total = 0
    for (const { log } of days) {
      for (const hours of Object.values(log)) total += hours
    }
    return total
  })

  // Selected week data
  const selectedWeekStart = weeks[selectedWeekIndex]
  const selectedWeekEnd = getWeekEnd(selectedWeekStart)
  const selectedDays = getDaysInRange(selectedWeekStart, selectedWeekEnd)
  const selectedTotal = weekTotals[selectedWeekIndex]

  // Stats
  const daysTracked = selectedDays.filter(
    ({ log }) => Object.keys(log).length > 0,
  ).length
  const avgPerDay = daysTracked > 0 ? (selectedTotal / daysTracked).toFixed(1) : '0'

  // Category breakdown for selected week
  const totals: Record<string, number> = {}
  for (const { log } of selectedDays) {
    for (const [catId, hours] of Object.entries(log)) {
      totals[catId] = (totals[catId] ?? 0) + hours
    }
  }
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const maxHours = sorted.length > 0 ? sorted[0][1] : 0

  // Build full Mon-Sun day list for selected week
  const today = formatDate(new Date())
  const allWeekDays: { date: string; log: Record<string, number> }[] = []
  const [sy, sm, sd] = selectedWeekStart.split('-').map(Number)
  for (let i = 0; i < 7; i++) {
    const d = new Date(sy, sm - 1, sd)
    d.setDate(d.getDate() + i)
    const date = formatDate(d)
    if (date > today) break
    const dayData = selectedDays.find((dd) => dd.date === date)
    allWeekDays.push({ date, log: dayData?.log ?? {} })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center py-3">
        <button
          onClick={onBack}
          className="h-10 w-10 flex items-center justify-center text-lg text-zinc-400 hover:text-zinc-100"
          aria-label="Back"
        >
          &larr;
        </button>
        <div className="flex-1 text-center">
          <div className="text-sm font-medium text-zinc-100">Weekly Trends</div>
          <div className="text-xs text-zinc-500">
            {selectedTotal > 0 ? `${selectedTotal}h total` : 'No data yet'}
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Week selector */}
      <div className="flex gap-2 mt-1">
        {weeks.map((weekStart, i) => (
          <button
            key={weekStart}
            onClick={() => setSelectedWeekIndex(i)}
            className={`flex-1 rounded-lg py-2 text-center transition-colors ${
              i === selectedWeekIndex
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <div className="text-xs font-medium">{weekLabel(weekStart, i)}</div>
            <div className="text-xs mt-0.5 opacity-70">{weekTotals[i]}h</div>
          </button>
        ))}
      </div>

      {/* Stats line */}
      <div className="mt-3 text-xs text-zinc-500 text-center">
        {daysTracked} {daysTracked === 1 ? 'day' : 'days'} tracked &middot; {selectedTotal}h total &middot; {avgPerDay}h avg/day
      </div>

      {/* Category breakdown */}
      {sorted.length > 0 && (
        <div className="mt-4 space-y-2">
          {sorted.map(([catId, hours]) => {
            const cat = catMap.get(catId)
            const label = cat ? cat.label : 'Unknown'
            const color = cat?.color ?? '#78716c'
            const isDeleted = cat?.deleted ?? false
            const pct = selectedTotal > 0 ? Math.round((hours / selectedTotal) * 100) : 0
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

      {/* Daily breakdown */}
      <div className="mt-6">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
          Daily Breakdown
        </h3>
        <div className="space-y-1">
          {allWeekDays.map(({ date, log }) => {
            const dayTotal = Object.values(log).reduce((s, v) => s + v, 0)
            const hasData = Object.keys(log).length > 0
            const top3 = hasData
              ? Object.entries(log)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([catId]) => catMap.get(catId)?.label ?? 'Unknown')
              : []
            return (
              <button
                key={date}
                onClick={() => onNavigateToDay(date)}
                className="w-full text-left px-2 py-2 rounded hover:bg-zinc-800 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className={`text-sm ${hasData ? 'text-zinc-200' : 'text-zinc-600'}`}>
                    {formatDayDisplay(date)}
                  </div>
                  {hasData && (
                    <div className="text-xs text-zinc-500 truncate">{top3.join(', ')}</div>
                  )}
                </div>
                <span className={`text-sm shrink-0 ml-2 ${hasData ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {dayTotal}h
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pb-8" />
    </div>
  )
}
