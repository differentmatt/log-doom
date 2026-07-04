import { useState } from 'react'
import type { Category } from '../categories'

interface StepperRowProps {
  category: Category
  value: { amounts: number[] }
  onChange: (value: { amounts: number[] }) => void
}

const METRIC_LABEL = { reps: 'reps', seconds: 'sec' } as const
const METRIC_STEP = { reps: 1, seconds: 5 } as const

export default function StepperRow({ category, value, onChange }: StepperRowProps) {
  const [showDesc, setShowDesc] = useState(false)
  const metric = category.metric ?? 'reps'
  const metricLabel = METRIC_LABEL[metric]
  const amountStep = METRIC_STEP[metric]
  const amounts = value.amounts ?? []
  const sets = amounts.length
  // All sets share one amount in this uniform-entry UI; a future per-set UI
  // can vary amounts[i] independently without a storage migration.
  const amountPerSet = amounts[0] ?? 0

  function step(field: 'sets' | 'amount', delta: number) {
    if (field === 'sets') {
      const nextCount = Math.max(0, sets + delta)
      onChange({ amounts: nextCount > sets ? [...amounts, amountPerSet] : amounts.slice(0, nextCount) })
      return
    }
    if (sets === 0) {
      if (delta > 0) onChange({ amounts: [Math.max(0, delta)] })
      return
    }
    const next = Math.max(0, amountPerSet + delta)
    onChange({ amounts: amounts.map(() => next) })
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: category.color }}
        />
        <span className="text-sm font-medium text-zinc-200 flex-1 min-w-0 truncate">
          {category.label}
        </span>
        {category.description && (
          <button
            onClick={() => setShowDesc(!showDesc)}
            className="h-6 w-6 flex items-center justify-center text-xs text-blue-400 hover:text-blue-300 shrink-0"
            aria-label={`Info about ${category.label}`}
          >
            ?
          </button>
        )}
      </div>
      {showDesc && (
        <p className="text-xs text-zinc-200 mb-1.5 ml-5">{category.description}</p>
      )}
      <div className="flex items-center gap-3 ml-5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => step('sets', -1)}
            className="h-9 w-9 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium"
            aria-label={`Decrease sets for ${category.label}`}
          >
            &minus;
          </button>
          <div className="w-14 text-center text-sm text-zinc-200">
            <span className="font-medium">{sets}</span>
            <span className="text-zinc-500"> sets</span>
          </div>
          <button
            onClick={() => step('sets', 1)}
            className="h-9 w-9 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium"
            aria-label={`Increase sets for ${category.label}`}
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => step('amount', -amountStep)}
            className="h-9 w-9 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium"
            aria-label={`Decrease ${metricLabel} for ${category.label}`}
          >
            &minus;
          </button>
          <div className="w-14 text-center text-sm text-zinc-200">
            <span className="font-medium">{amountPerSet}</span>
            <span className="text-zinc-500"> {metricLabel}</span>
          </div>
          <button
            onClick={() => step('amount', amountStep)}
            className="h-9 w-9 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium"
            aria-label={`Increase ${metricLabel} for ${category.label}`}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
