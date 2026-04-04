import { useState, useCallback, useRef } from 'react'
import { getCategories, getDayLog, setHours, resetDay, todayString, formatDate } from '../storage'
import DateNav from './DateNav'
import CategoryRow from './CategoryRow'

interface LogViewProps {
  initialDate?: string
  onSummary: () => void
}

function archivedIdsWithData(date: string): Set<string> {
  const log = getDayLog(date)
  const allCats = getCategories()
  return new Set(
    allCats.filter((c) => c.deleted && (log[c.id] ?? 0) > 0).map((c) => c.id)
  )
}

export default function LogView({ initialDate, onSummary }: LogViewProps) {
  const [date, setDate] = useState(initialDate ?? todayString())
  const [log, setLog] = useState<Record<string, number>>(() => getDayLog(date))
  const stickyArchivedIds = useRef<Set<string>>(archivedIdsWithData(initialDate ?? todayString()))

  const allCats = getCategories()
  const activeCats = allCats
    .filter((c) => !c.deleted)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const archivedVisible = allCats.filter(
    (c) => c.deleted && stickyArchivedIds.current.has(c.id)
  )

  const refreshLog = useCallback((d: string) => {
    setDate(d)
    setLog(getDayLog(d))
    stickyArchivedIds.current = archivedIdsWithData(d)
  }, [])

  function shiftDay(offset: number) {
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    d.setDate(d.getDate() + offset)
    refreshLog(formatDate(d))
  }

  function handleChange(categoryId: string, hours: number) {
    setHours(date, categoryId, hours)
    setLog(getDayLog(date))
  }

  function handleReset() {
    resetDay(date)
    setLog({})
  }

  const totalHours = Object.values(log).reduce((s, v) => s + v, 0)
  const hasData = totalHours > 0

  return (
    <div>
      <DateNav
        date={date}
        totalHours={totalHours}
        onPrev={() => shiftDay(-1)}
        onNext={() => shiftDay(1)}
        onToday={() => refreshLog(todayString())}
        onSummary={onSummary}
      />
      <div>
        {activeCats.map((cat) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            value={log[cat.id] ?? 0}
            onChange={(h) => handleChange(cat.id, h)}
          />
        ))}
      </div>
      {archivedVisible.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Archived
          </div>
          {archivedVisible.map((cat) => (
            <div key={cat.id} className="opacity-60">
              <CategoryRow
                category={cat}
                value={log[cat.id] ?? 0}
                onChange={(h) => handleChange(cat.id, h)}
              />
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
