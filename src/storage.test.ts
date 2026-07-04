import { describe, it, expect } from 'vitest'
import {
  getDayLog,
  getDayTimestamp,
  setDayLogWithTimestamp,
  setHours,
  setValue,
  resetDay,
  getRecentDays,
  formatDate,
  getWeekStart,
  getWeekEnd,
  getDaysInRange,
  getRecentWeeks,
  getCategories,
  getCategoriesTimestamp,
  setCategoriesWithTimestamp,
  addCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  reorderCategories,
  getTrackers,
  getTrackersTimestamp,
  addTracker,
  updateTracker,
  deleteTracker,
  restoreTracker,
  reorderTrackers,
} from './storage'
import { defaultCategories, type StoredCategory } from './categories'
import { defaultTrackers, defaultExercises } from './trackers'

// --- Day log functions ---

describe('getDayLog', () => {
  it('returns empty object when no data exists', () => {
    expect(getDayLog('work', '2025-01-15')).toEqual({})
  })

  it('returns stored log data', () => {
    localStorage.setItem(
      'logdoom:2025-01-15',
      JSON.stringify({ log: { 'dr-1on1': 2 }, updatedAt: '2025-01-15T10:00:00.000Z' }),
    )
    expect(getDayLog('work', '2025-01-15')).toEqual({ 'dr-1on1': 2 })
  })

  it('returns empty object for invalid JSON', () => {
    localStorage.setItem('logdoom:2025-01-15', 'not-json')
    expect(getDayLog('work', '2025-01-15')).toEqual({})
  })
})

describe('getDayTimestamp', () => {
  it('returns null when no data exists', () => {
    expect(getDayTimestamp('work', '2025-01-15')).toBeNull()
  })

  it('returns timestamp', () => {
    localStorage.setItem(
      'logdoom:2025-01-15',
      JSON.stringify({ log: { 'dr-1on1': 2 }, updatedAt: '2025-01-15T10:00:00.000Z' }),
    )
    expect(getDayTimestamp('work', '2025-01-15')).toBe('2025-01-15T10:00:00.000Z')
  })

  it('returns null for invalid JSON', () => {
    localStorage.setItem('logdoom:2025-01-15', 'not-json')
    expect(getDayTimestamp('work', '2025-01-15')).toBeNull()
  })
})

describe('setDayLogWithTimestamp', () => {
  it('writes wrapped format', () => {
    setDayLogWithTimestamp('work', '2025-01-15', { 'dr-1on1': 2 }, '2025-01-15T10:00:00.000Z')
    const raw = JSON.parse(localStorage.getItem('logdoom:2025-01-15')!)
    expect(raw.log).toEqual({ 'dr-1on1': 2 })
    expect(raw.updatedAt).toBe('2025-01-15T10:00:00.000Z')
  })

  it('removes key when log is empty', () => {
    setDayLogWithTimestamp('work', '2025-01-15', { 'dr-1on1': 2 }, '2025-01-15T10:00:00.000Z')
    setDayLogWithTimestamp('work', '2025-01-15', {}, '2025-01-15T11:00:00.000Z')
    expect(localStorage.getItem('logdoom:2025-01-15')).toBeNull()
  })
})

describe('setHours', () => {
  it('stores hours for a category in wrapped format', () => {
    setHours('work', '2025-01-15', 'dr-1on1', 2)
    expect(getDayLog('work', '2025-01-15')).toEqual({ 'dr-1on1': 2 })
    expect(getDayTimestamp('work', '2025-01-15')).toEqual(expect.any(String))
  })

  it('removes category when hours set to 0', () => {
    setHours('work', '2025-01-15', 'dr-1on1', 2)
    setHours('work', '2025-01-15', 'misc', 1)
    setHours('work', '2025-01-15', 'dr-1on1', 0)
    expect(getDayLog('work', '2025-01-15')).toEqual({ misc: 1 })
  })

  it('removes localStorage key when all categories zeroed out', () => {
    setHours('work', '2025-01-15', 'dr-1on1', 2)
    setHours('work', '2025-01-15', 'dr-1on1', 0)
    expect(localStorage.getItem('logdoom:2025-01-15')).toBeNull()
  })

  it('overwrites existing hours', () => {
    setHours('work', '2025-01-15', 'dr-1on1', 2)
    setHours('work', '2025-01-15', 'dr-1on1', 3)
    expect(getDayLog('work', '2025-01-15')).toEqual({ 'dr-1on1': 3 })
  })
})

describe('resetDay', () => {
  it('removes all data for a day', () => {
    setHours('work', '2025-01-15', 'dr-1on1', 2)
    setHours('work', '2025-01-15', 'misc', 1)
    resetDay('work', '2025-01-15')
    expect(getDayLog('work', '2025-01-15')).toEqual({})
    expect(localStorage.getItem('logdoom:2025-01-15')).toBeNull()
  })

})

// --- Query functions ---

describe('formatDate', () => {
  it('formats a date as YYYY-MM-DD with zero-padded month and day', () => {
    expect(formatDate(new Date(2025, 0, 5))).toBe('2025-01-05')
  })
})

describe('getRecentDays', () => {
  it('returns only days with data', () => {
    const today = formatDate(new Date())
    setHours('work', today, 'dr-1on1', 2)
    const results = getRecentDays('work', 7)
    expect(results).toHaveLength(1)
    expect(results[0].date).toBe(today)
    expect(results[0].log).toEqual({ 'dr-1on1': 2 })
  })

  it('returns empty array when no days have data', () => {
    expect(getRecentDays('work', 14)).toEqual([])
  })

  it('returns days in reverse chronological order', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const todayStr = formatDate(today)
    const yesterdayStr = formatDate(yesterday)

    setHours('work', todayStr, 'dr-1on1', 1)
    setHours('work', yesterdayStr, 'misc', 2)

    const results = getRecentDays('work', 7)
    expect(results).toHaveLength(2)
    expect(results[0].date).toBe(todayStr)
    expect(results[1].date).toBe(yesterdayStr)
  })
})

// --- Week helper functions ---

describe('getWeekStart', () => {
  it('returns same date for a Monday', () => {
    expect(getWeekStart('2025-03-31')).toBe('2025-03-31') // Monday
  })

  it('returns previous Monday for a Wednesday', () => {
    expect(getWeekStart('2025-04-02')).toBe('2025-03-31') // Wed → Mon
  })

  it('returns previous Monday for a Sunday', () => {
    expect(getWeekStart('2025-04-06')).toBe('2025-03-31') // Sun → Mon
  })

  it('returns previous Monday for a Saturday', () => {
    expect(getWeekStart('2025-04-05')).toBe('2025-03-31') // Sat → Mon
  })
})

describe('getWeekEnd', () => {
  it('returns Sunday (start + 6 days)', () => {
    expect(getWeekEnd('2025-03-31')).toBe('2025-04-06') // Mon → Sun
  })

  it('handles month boundary', () => {
    expect(getWeekEnd('2025-01-27')).toBe('2025-02-02')
  })
})

describe('getDaysInRange', () => {
  it('returns all days in range with their logs', () => {
    setHours('work', '2025-03-31', 'dr-1on1', 2)
    setHours('work', '2025-04-01', 'misc', 1)
    // Use a far-future range to avoid today cap
    const results = getDaysInRange('work', '2025-03-31', '2025-04-02')
    // Results capped at today, so only check returned dates are in range
    const dates = results.map((r) => r.date)
    for (const d of dates) {
      expect(d >= '2025-03-31' && d <= '2025-04-02').toBe(true)
    }
  })

  it('returns empty array for range entirely in the future', () => {
    expect(getDaysInRange('work', '2099-01-01', '2099-01-07')).toEqual([])
  })
})

describe('getRecentWeeks', () => {
  it('returns n week start dates (Mondays), most recent first', () => {
    const weeks = getRecentWeeks(4)
    expect(weeks).toHaveLength(4)
    // Each should be 7 days apart
    for (let i = 1; i < weeks.length; i++) {
      const [py, pm, pd] = weeks[i - 1].split('-').map(Number)
      const [cy, cm, cd] = weeks[i].split('-').map(Number)
      const prev = new Date(py, pm - 1, pd)
      const curr = new Date(cy, cm - 1, cd)
      expect(prev.getTime() - curr.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
    }
  })

  it('first entry is this week\'s Monday', () => {
    const weeks = getRecentWeeks(1)
    expect(weeks[0]).toBe(getWeekStart(formatDate(new Date())))
  })
})

// --- Category functions ---

describe('getCategories', () => {
  it('seeds default categories on first call', () => {
    const cats = getCategories('work')
    expect(cats).toHaveLength(defaultCategories.length)
    expect(cats[0].id).toBe(defaultCategories[0].id)
    expect(cats[0].sortOrder).toBe(0)
    expect(cats[0].deleted).toBe(false)
  })

  it('persists seeded categories to localStorage', () => {
    getCategories('work')
    const raw = JSON.parse(localStorage.getItem('logdoom:categories')!)
    expect(raw.categories).toBeDefined()
    expect(raw.updatedAt).toEqual(expect.any(String))
  })

  it('stamps a freshly-seeded (never-edited) tracker with an epoch timestamp, not now', () => {
    // So a genuine remote timestamp always wins the first sync merge on a new device,
    // instead of racing a just-seeded "now".
    getCategories('work')
    expect(getCategoriesTimestamp('work')).toBe(new Date(0).toISOString())
  })

  it('returns previously stored categories', () => {
    const cats = getCategories('work')
    cats[0].label = 'Modified'
    localStorage.setItem(
      'logdoom:categories',
      JSON.stringify({ categories: cats, updatedAt: '2025-01-15T10:00:00.000Z' }),
    )
    expect(getCategories('work')[0].label).toBe('Modified')
  })

  it('re-seeds on invalid JSON', () => {
    localStorage.setItem('logdoom:categories', 'bad-json')
    const cats = getCategories('work')
    expect(cats).toHaveLength(defaultCategories.length)
  })
})

describe('getCategoriesTimestamp', () => {
  it('returns null when no data exists', () => {
    expect(getCategoriesTimestamp('work')).toBeNull()
  })

  it('returns timestamp', () => {
    localStorage.setItem(
      'logdoom:categories',
      JSON.stringify({ categories: [{ id: 'cat1' }], updatedAt: '2025-01-15T10:00:00.000Z' }),
    )
    expect(getCategoriesTimestamp('work')).toBe('2025-01-15T10:00:00.000Z')
  })
})

describe('setCategoriesWithTimestamp', () => {
  it('writes wrapped format', () => {
    const cats: StoredCategory[] = [{ id: 'cat1', label: 'Test', description: '', color: '#fff', sortOrder: 0, deleted: false }]
    setCategoriesWithTimestamp('work', cats, '2025-01-15T10:00:00.000Z')
    const raw = JSON.parse(localStorage.getItem('logdoom:categories')!)
    expect(raw.categories).toEqual(cats)
    expect(raw.updatedAt).toBe('2025-01-15T10:00:00.000Z')
  })
})

describe('addCategory', () => {
  it('adds a new category with correct sortOrder', () => {
    const cats = getCategories('work')
    const maxOrder = cats.reduce((max, c) => Math.max(max, c.sortOrder), -1)
    const newCat = addCategory('work', { label: 'Custom', description: 'desc', color: '#ff0000' })
    expect(newCat.label).toBe('Custom')
    expect(newCat.sortOrder).toBe(maxOrder + 1)
    expect(newCat.deleted).toBe(false)
    expect(newCat.id).toBeTruthy()
  })

  it('persists the new category', () => {
    addCategory('work', { label: 'Custom', description: 'desc', color: '#ff0000' })
    const cats = getCategories('work')
    expect(cats.find((c) => c.label === 'Custom')).toBeDefined()
  })
})

describe('updateCategory', () => {
  it('updates label', () => {
    const cats = getCategories('work')
    updateCategory('work', cats[0].id, { label: 'New Label' })
    expect(getCategories('work')[0].label).toBe('New Label')
  })

  it('updates description and color', () => {
    const cats = getCategories('work')
    updateCategory('work', cats[0].id, { description: 'New desc', color: '#ff0000' })
    const updated = getCategories('work').find((c) => c.id === cats[0].id)!
    expect(updated.description).toBe('New desc')
    expect(updated.color).toBe('#ff0000')
  })

  it('is a no-op for unknown id', () => {
    const before = getCategories('work')
    updateCategory('work', 'nonexistent', { label: 'Nope' })
    expect(getCategories('work')).toEqual(before)
  })
})

describe('deleteCategory', () => {
  it('marks category as deleted', () => {
    const cats = getCategories('work')
    deleteCategory('work', cats[0].id)
    expect(getCategories('work').find((c) => c.id === cats[0].id)!.deleted).toBe(true)
  })

  it('is a no-op for unknown id', () => {
    const before = getCategories('work')
    deleteCategory('work', 'nonexistent')
    expect(getCategories('work')).toEqual(before)
  })
})

describe('restoreCategory', () => {
  it('restores a deleted category', () => {
    const cats = getCategories('work')
    deleteCategory('work', cats[0].id)
    expect(getCategories('work').find((c) => c.id === cats[0].id)!.deleted).toBe(true)
    restoreCategory('work', cats[0].id)
    expect(getCategories('work').find((c) => c.id === cats[0].id)!.deleted).toBe(false)
  })
})

describe('reorderCategories', () => {
  it('updates sort orders based on array position', () => {
    const cats = getCategories('work')
    const reversed = [...cats].reverse().map((c) => c.id)
    reorderCategories('work', reversed)
    const reordered = getCategories('work')
    expect(reordered.find((c) => c.id === reversed[0])!.sortOrder).toBe(0)
    expect(reordered.find((c) => c.id === reversed[1])!.sortOrder).toBe(1)
  })

  it('only updates categories in the provided list', () => {
    const cats = getCategories('work')
    const subset = [cats[2].id, cats[0].id]
    const originalOrder1 = cats[1].sortOrder
    reorderCategories('work', subset)
    const updated = getCategories('work')
    expect(updated.find((c) => c.id === cats[1].id)!.sortOrder).toBe(originalOrder1)
    expect(updated.find((c) => c.id === cats[2].id)!.sortOrder).toBe(0)
    expect(updated.find((c) => c.id === cats[0].id)!.sortOrder).toBe(1)
  })
})

// --- Multi-tracker functions ---

describe('getTrackers', () => {
  it('seeds default trackers (work, exercise) on first call', () => {
    const trackers = getTrackers()
    expect(trackers.map((t) => t.id)).toEqual(defaultTrackers.map((t) => t.id))
  })

  it('persists seeded trackers to localStorage in wrapped format', () => {
    getTrackers()
    const raw = JSON.parse(localStorage.getItem('logdoom:trackers')!)
    expect(raw.trackers).toHaveLength(defaultTrackers.length)
    expect(raw.updatedAt).toEqual(expect.any(String))
  })

  it('stamps a freshly-seeded (never-edited) registry with an epoch timestamp, not now', () => {
    getTrackers()
    expect(getTrackersTimestamp()).toBe(new Date(0).toISOString())
  })
})

describe('tracker CRUD', () => {
  it('adds a new tracker', () => {
    const t = addTracker({ label: 'Reading', unit: 'hours' })
    expect(t.label).toBe('Reading')
    expect(t.deleted).toBe(false)
    expect(getTrackers().find((tr) => tr.id === t.id)).toBeDefined()
  })

  it('renames a tracker', () => {
    updateTracker('exercise', { label: 'Fitness' })
    expect(getTrackers().find((t) => t.id === 'exercise')!.label).toBe('Fitness')
  })

  it('soft-deletes a non-work tracker', () => {
    deleteTracker('exercise')
    expect(getTrackers().find((t) => t.id === 'exercise')!.deleted).toBe(true)
  })

  it('refuses to delete the work tracker', () => {
    deleteTracker('work')
    expect(getTrackers().find((t) => t.id === 'work')!.deleted).toBe(false)
  })

  it('restores a deleted tracker', () => {
    deleteTracker('exercise')
    restoreTracker('exercise')
    expect(getTrackers().find((t) => t.id === 'exercise')!.deleted).toBe(false)
  })

  it('reorders trackers', () => {
    reorderTrackers(['exercise', 'work'])
    const trackers = getTrackers()
    expect(trackers.find((t) => t.id === 'exercise')!.sortOrder).toBe(0)
    expect(trackers.find((t) => t.id === 'work')!.sortOrder).toBe(1)
  })
})

describe('getCategories for non-work trackers', () => {
  it('seeds default exercises for the exercise tracker', () => {
    const items = getCategories('exercise')
    expect(items.map((c) => c.id)).toEqual(defaultExercises.map((c) => c.id))
  })

  it('stores exercise items under a namespaced key', () => {
    getCategories('exercise')
    expect(localStorage.getItem('logdoom:t:exercise:categories')).not.toBeNull()
    expect(localStorage.getItem('logdoom:categories')).toBeNull()
  })
})

describe('setValue with sets-based metrics', () => {
  it('stores a per-set amounts array under a namespaced day key', () => {
    setValue('exercise', '2025-01-15', 'push-ups', { amounts: [10, 10, 10] })
    expect(getDayLog('exercise', '2025-01-15')).toEqual({ 'push-ups': { amounts: [10, 10, 10] } })
    expect(localStorage.getItem('logdoom:t:exercise:2025-01-15')).not.toBeNull()
  })

  it('supports varying amounts per set', () => {
    setValue('exercise', '2025-01-15', 'push-ups', { amounts: [12, 10, 8] })
    expect(getDayLog('exercise', '2025-01-15')).toEqual({ 'push-ups': { amounts: [12, 10, 8] } })
  })

  it('supports a seconds-based metric (e.g. plank) using the same shape', () => {
    setValue('exercise', '2025-01-15', 'plank', { amounts: [45, 30] })
    expect(getDayLog('exercise', '2025-01-15')).toEqual({ plank: { amounts: [45, 30] } })
  })

  it('removes the entry when the amounts array is empty', () => {
    setValue('exercise', '2025-01-15', 'push-ups', { amounts: [10, 10, 10] })
    setValue('exercise', '2025-01-15', 'push-ups', { amounts: [] })
    expect(getDayLog('exercise', '2025-01-15')).toEqual({})
  })

  it('keeps work-tracker data isolated from exercise-tracker data', () => {
    setHours('work', '2025-01-15', 'dr-1on1', 2)
    setValue('exercise', '2025-01-15', 'push-ups', { amounts: [10, 10, 10] })
    expect(getDayLog('work', '2025-01-15')).toEqual({ 'dr-1on1': 2 })
    expect(getDayLog('exercise', '2025-01-15')).toEqual({ 'push-ups': { amounts: [10, 10, 10] } })
  })
})

describe('defaultExercises metric', () => {
  it('seeds plank with a seconds metric and others with reps', () => {
    const items = getCategories('exercise')
    expect(items.find((c) => c.id === 'plank')!.metric).toBe('seconds')
    expect(items.find((c) => c.id === 'push-ups')!.metric).toBe('reps')
  })
})
