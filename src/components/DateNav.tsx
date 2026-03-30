import { todayString } from '../storage'

interface DateNavProps {
  date: string
  totalHours: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
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

export default function DateNav({ date, totalHours, onPrev, onNext, onToday }: DateNavProps) {
  const isToday = date === todayString()

  return (
    <div className="flex items-center justify-between py-3">
      <button
        onClick={onPrev}
        className="h-10 w-10 flex items-center justify-center text-lg text-zinc-400 hover:text-zinc-100"
        aria-label="Previous day"
      >
        &larr;
      </button>
      <div className="text-center">
        <div className="text-sm font-medium text-zinc-100">{formatDisplay(date)}</div>
        <div className="text-xs text-zinc-500">
          {totalHours > 0 ? `${totalHours}h logged` : 'no hours logged'}
        </div>
        {!isToday && (
          <button
            onClick={onToday}
            className="text-xs text-blue-400 hover:text-blue-300 mt-0.5"
          >
            Go to today
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={isToday}
        className="h-10 w-10 flex items-center justify-center text-lg text-zinc-400 hover:text-zinc-100 disabled:opacity-25 disabled:cursor-default"
        aria-label="Next day"
      >
        &rarr;
      </button>
    </div>
  )
}
