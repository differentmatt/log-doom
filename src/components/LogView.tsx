import { useState, useCallback } from 'react'
import { categories } from '../categories'
import { getDayLog, setHours, resetDay, todayString, formatDate } from '../storage'
import DateNav from './DateNav'
import CategoryRow from './CategoryRow'

interface LogViewProps {
  initialDate?: string
  onSummary: () => void
}

export default function LogView({ initialDate, onSummary }: LogViewProps) {
  const [date, setDate] = useState(initialDate ?? todayString())
  const [log, setLog] = useState<Record<string, number>>(() => getDayLog(date))

  const refreshLog = useCallback((d: string) => {
    setDate(d)
    setLog(getDayLog(d))
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
      />
      <div>
        {categories.map((cat) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            value={log[cat.id] ?? 0}
            onChange={(h) => handleChange(cat.id, h)}
          />
        ))}
      </div>
      <div className="flex gap-3 mt-4 pb-8">
        {hasData && (
          <button
            onClick={handleReset}
            className="h-10 px-4 rounded text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500"
          >
            Reset day
          </button>
        )}
        <button
          onClick={onSummary}
          className="h-10 px-4 rounded text-sm text-zinc-100 bg-zinc-700 hover:bg-zinc-600 ml-auto"
        >
          Summary
        </button>
      </div>
    </div>
  )
}
