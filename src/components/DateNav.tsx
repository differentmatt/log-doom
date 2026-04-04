import { todayString } from '../storage'

interface DateNavProps {
  date: string
  totalHours: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSummary: () => void
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

export default function DateNav({ date, totalHours, onPrev, onNext, onToday, onSummary }: DateNavProps) {
  const isToday = date === todayString()

  return (
    <div className="py-3">
      <div className="flex items-center">
        <div className="w-20 flex items-center justify-start">
          <button
            onClick={onPrev}
            className="h-10 w-10 flex items-center justify-center text-lg text-blue-400 hover:text-blue-300"
            aria-label="Previous day"
          >
            &larr;
          </button>
        </div>
        <div className="text-sm font-medium text-zinc-100 text-center flex-1">{formatDisplay(date)}</div>
        <div className="w-20 flex items-center justify-end gap-1.5">
          {!isToday && (
            <button
              onClick={onToday}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Today
            </button>
          )}
          <button
            onClick={onNext}
            disabled={isToday}
            className="h-10 w-10 flex items-center justify-center text-lg text-blue-400 hover:text-blue-300 disabled:opacity-25 disabled:cursor-default shrink-0"
            aria-label="Next day"
          >
            &rarr;
          </button>
        </div>
      </div>
      <button
        onClick={onSummary}
        className="flex items-center justify-center mx-auto text-xs text-blue-400 hover:text-blue-300 mt-1"
      >
        {totalHours > 0 ? `${totalHours}h logged` : 'no hours logged'}
      </button>
    </div>
  )
}
