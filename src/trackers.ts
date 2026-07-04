import type { Category } from './categories'

export type TrackerUnit = 'hours' | 'sets-reps'

export interface Tracker {
  id: string
  label: string
  unit: TrackerUnit
  icon?: string
  sortOrder: number
  deleted: boolean
}

// Sets-based trackers store one measurement per set (`amounts[i]` = the value logged
// for set i — reps, seconds, whatever the item's metric is), so a future per-set entry
// UI can vary them without a storage migration.
export type LogValue = number | { amounts: number[] }
export type DayLog = Record<string, LogValue>

export const defaultTrackers: Tracker[] = [
  { id: 'work', label: 'Work', unit: 'hours', icon: '\u{1F4BC}', sortOrder: 0, deleted: false },
  { id: 'exercise', label: 'Exercise', unit: 'sets-reps', icon: '\u{1F3CB}', sortOrder: 1, deleted: false },
]

export const defaultExercises: Category[] = [
  { id: 'push-ups', label: 'Push-ups', description: '', color: '#2563eb', metric: 'reps' },
  { id: 'squats', label: 'Squats', description: '', color: '#7c3aed', metric: 'reps' },
  { id: 'pull-ups', label: 'Pull-ups', description: '', color: '#db2777', metric: 'reps' },
  { id: 'plank', label: 'Plank', description: '', color: '#ea580c', metric: 'seconds' },
]

export function isAmounts(value: LogValue): value is { amounts: number[] } {
  return typeof value === 'object' && value !== null
}

export function hasContent(value: LogValue): boolean {
  return isAmounts(value) ? value.amounts.length > 0 : value > 0
}
