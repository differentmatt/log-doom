import { useState } from 'react'
import { type Category, hourOptions } from '../categories'

interface CategoryRowProps {
  category: Category
  value: number
  onChange: (hours: number) => void
}

export default function CategoryRow({ category, value, onChange }: CategoryRowProps) {
  const [showDesc, setShowDesc] = useState(false)

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
        <button
          onClick={() => setShowDesc(!showDesc)}
          className="h-6 w-6 flex items-center justify-center text-xs text-zinc-200 shrink-0"
          aria-label={`Info about ${category.label}`}
        >
          ?
        </button>
      </div>
      {showDesc && (
        <p className="text-xs text-zinc-200 mb-1.5 ml-5">{category.description}</p>
      )}
      <div className="flex gap-1.5 ml-5">
        {hourOptions.map((h) => (
          <button
            key={h}
            onClick={() => onChange(value === h ? 0 : h)}
            className={`h-10 min-w-[2.5rem] flex-1 rounded text-sm font-medium transition-colors ${
              value === h
                ? 'text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            style={value === h ? { backgroundColor: category.color } : undefined}
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  )
}
