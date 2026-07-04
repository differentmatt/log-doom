import { useState, useCallback, useRef } from 'react'
import { getCategories, getDayLog, setValue, resetDay, todayString, formatDate } from '../storage'
import { type Tracker, type LogValue, hasContent } from '../trackers'
import DateNav from './DateNav'
import CategoryRow from './CategoryRow'
import StepperRow from './StepperRow'

interface LogViewProps {
  tracker: Tracker
  initialDate?: string
  onSummary?: () => void
}

function archivedIdsWithData(trackerId: string, date: string): Set<string> {
  const log = getDayLog(trackerId, date)
  const allCats = getCategories(trackerId)
  return new Set(
    allCats.filter((c) => c.deleted && hasContent(log[c.id] ?? 0)).map((c) => c.id)
  )
}

export default function LogView({ tracker, initialDate, onSummary }: LogViewProps) {
  const [date, setDate] = useState(() => {
    const d = initialDate ?? sessionStorage.getItem('logdoom:date') ?? todayString()
    sessionStorage.setItem('logdoom:date', d)
    return d
  })
  const [log, setLog] = useState<Record<string, LogValue>>(() => getDayLog(tracker.id, date))
  const stickyArchivedIds = useRef<Set<string>>(archivedIdsWithData(tracker.id, date))

  const allCats = getCategories(tracker.id)
  const activeCats = allCats
    .filter((c) => !c.deleted)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const archivedVisible = allCats.filter(
    (c) => c.deleted && stickyArchivedIds.current.has(c.id)
  )

  const refreshLog = useCallback((d: string) => {
    setDate(d)
    sessionStorage.setItem('logdoom:date', d)
    setLog(getDayLog(tracker.id, d))
    stickyArchivedIds.current = archivedIdsWithData(tracker.id, d)
  }, [tracker.id])

  function shiftDay(offset: number) {
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    d.setDate(d.getDate() + offset)
    refreshLog(formatDate(d))
  }

  function handleChange(categoryId: string, value: LogValue) {
    setValue(tracker.id, date, categoryId, value)
    setLog(getDayLog(tracker.id, date))
  }

  function handleReset() {
    resetDay(tracker.id, date)
    setLog({})
  }

  const hasData = Object.keys(log).length > 0
  const summaryText =
    tracker.unit === 'hours'
      ? (() => {
          const total = (Object.values(log) as number[]).reduce((s, v) => s + v, 0)
          return total > 0 ? `${total}h logged` : 'no hours logged'
        })()
      : (() => {
          const count = Object.keys(log).length
          return count > 0 ? `${count} ${count === 1 ? 'exercise' : 'exercises'} logged` : 'no exercises logged'
        })()

  return (
    <div>
      <DateNav
        date={date}
        summaryText={summaryText}
        onPrev={() => shiftDay(-1)}
        onNext={() => shiftDay(1)}
        onToday={() => refreshLog(todayString())}
        onSummary={onSummary}
      />
      <div>
        {activeCats.map((cat) =>
          tracker.unit === 'hours' ? (
            <CategoryRow
              key={cat.id}
              category={cat}
              value={(log[cat.id] as number) ?? 0}
              onChange={(h) => handleChange(cat.id, h)}
            />
          ) : (
            <StepperRow
              key={cat.id}
              category={cat}
              value={(log[cat.id] as { amounts: number[] }) ?? { amounts: [] }}
              onChange={(v) => handleChange(cat.id, v)}
            />
          )
        )}
      </div>
      {archivedVisible.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Archived
          </div>
          {archivedVisible.map((cat) => (
            <div key={cat.id} className="opacity-60">
              {tracker.unit === 'hours' ? (
                <CategoryRow
                  category={cat}
                  value={(log[cat.id] as number) ?? 0}
                  onChange={(h) => handleChange(cat.id, h)}
                />
              ) : (
                <StepperRow
                  category={cat}
                  value={(log[cat.id] as { amounts: number[] }) ?? { amounts: [] }}
                  onChange={(v) => handleChange(cat.id, v)}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {hasData && (
        <div className="mt-4 pb-8">
          <button
            onClick={handleReset}
            className="h-10 px-4 rounded text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500"
          >
            Reset day
          </button>
        </div>
      )}
    </div>
  )
}
