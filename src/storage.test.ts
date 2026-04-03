import { describe, it, expect } from 'vitest'
import {
  getDayLog,
  setHours,
  resetDay,
  getRecentDays,
  formatDate,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  reorderCategories,
} from './storage'
import { defaultCategories } from './categories'

// --- Day log functions ---

describe('getDayLog', () => {
  it('returns empty object when no data exists', () => {
    expect(getDayLog('2025-01-15')).toEqual({})
  })

  it('returns stored log data', () => {
    localStorage.setItem('logdoom:2025-01-15', JSON.stringify({ 'dr-1on1': 2 }))
    expect(getDayLog('2025-01-15')).toEqual({ 'dr-1on1': 2 })
  })

  it('returns empty object for invalid JSON', () => {
    localStorage.setItem('logdoom:2025-01-15', 'not-json')
    expect(getDayLog('2025-01-15')).toEqual({})
  })
})

describe('setHours', () => {
  it('stores hours for a category', () => {
    setHours('2025-01-15', 'dr-1on1', 2)
    expect(getDayLog('2025-01-15')).toEqual({ 'dr-1on1': 2 })
  })

  it('removes category when hours set to 0', () => {
    setHours('2025-01-15', 'dr-1on1', 2)
    setHours('2025-01-15', 'misc', 1)
    setHours('2025-01-15', 'dr-1on1', 0)
    expect(getDayLog('2025-01-15')).toEqual({ misc: 1 })
  })

  it('removes localStorage key when all categories zeroed out', () => {
    setHours('2025-01-15', 'dr-1on1', 2)
    setHours('2025-01-15', 'dr-1on1', 0)
    expect(localStorage.getItem('logdoom:2025-01-15')).toBeNull()
  })

  it('overwrites existing hours', () => {
    setHours('2025-01-15', 'dr-1on1', 2)
    setHours('2025-01-15', 'dr-1on1', 3)
    expect(getDayLog('2025-01-15')).toEqual({ 'dr-1on1': 3 })
  })
})

describe('resetDay', () => {
  it('removes all data for a day', () => {
    setHours('2025-01-15', 'dr-1on1', 2)
    setHours('2025-01-15', 'misc', 1)
    resetDay('2025-01-15')
    expect(getDayLog('2025-01-15')).toEqual({})
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
    setHours(today, 'dr-1on1', 2)
    const results = getRecentDays(7)
    expect(results).toHaveLength(1)
    expect(results[0].date).toBe(today)
    expect(results[0].log).toEqual({ 'dr-1on1': 2 })
  })

  it('returns empty array when no days have data', () => {
    expect(getRecentDays(14)).toEqual([])
  })

  it('returns days in reverse chronological order', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const todayStr = formatDate(today)
    const yesterdayStr = formatDate(yesterday)

    setHours(todayStr, 'dr-1on1', 1)
    setHours(yesterdayStr, 'misc', 2)

    const results = getRecentDays(7)
    expect(results).toHaveLength(2)
    expect(results[0].date).toBe(todayStr)
    expect(results[1].date).toBe(yesterdayStr)
  })
})

// --- Category functions ---

describe('getCategories', () => {
  it('seeds default categories on first call', () => {
    const cats = getCategories()
    expect(cats).toHaveLength(defaultCategories.length)
    expect(cats[0].id).toBe(defaultCategories[0].id)
    expect(cats[0].sortOrder).toBe(0)
    expect(cats[0].deleted).toBe(false)
  })

  it('persists seeded categories to localStorage', () => {
    getCategories()
    expect(localStorage.getItem('logdoom:categories')).not.toBeNull()
  })

  it('returns previously stored categories', () => {
    const cats = getCategories()
    cats[0].label = 'Modified'
    localStorage.setItem('logdoom:categories', JSON.stringify(cats))
    expect(getCategories()[0].label).toBe('Modified')
  })

  it('re-seeds on invalid JSON', () => {
    localStorage.setItem('logdoom:categories', 'bad-json')
    const cats = getCategories()
    expect(cats).toHaveLength(defaultCategories.length)
  })
})

describe('addCategory', () => {
  it('adds a new category with correct sortOrder', () => {
    const cats = getCategories()
    const maxOrder = cats.reduce((max, c) => Math.max(max, c.sortOrder), -1)
    const newCat = addCategory({ label: 'Custom', description: 'desc', color: '#ff0000' })
    expect(newCat.label).toBe('Custom')
    expect(newCat.sortOrder).toBe(maxOrder + 1)
    expect(newCat.deleted).toBe(false)
    expect(newCat.id).toBeTruthy()
  })

  it('persists the new category', () => {
    addCategory({ label: 'Custom', description: 'desc', color: '#ff0000' })
    const cats = getCategories()
    expect(cats.find((c) => c.label === 'Custom')).toBeDefined()
  })
})

describe('updateCategory', () => {
  it('updates label', () => {
    const cats = getCategories()
    updateCategory(cats[0].id, { label: 'New Label' })
    expect(getCategories()[0].label).toBe('New Label')
  })

  it('updates description and color', () => {
    const cats = getCategories()
    updateCategory(cats[0].id, { description: 'New desc', color: '#ff0000' })
    const updated = getCategories().find((c) => c.id === cats[0].id)!
    expect(updated.description).toBe('New desc')
    expect(updated.color).toBe('#ff0000')
  })

  it('is a no-op for unknown id', () => {
    const before = getCategories()
    updateCategory('nonexistent', { label: 'Nope' })
    expect(getCategories()).toEqual(before)
  })
})

describe('deleteCategory', () => {
  it('marks category as deleted', () => {
    const cats = getCategories()
    deleteCategory(cats[0].id)
    expect(getCategories().find((c) => c.id === cats[0].id)!.deleted).toBe(true)
  })

  it('is a no-op for unknown id', () => {
    const before = getCategories()
    deleteCategory('nonexistent')
    expect(getCategories()).toEqual(before)
  })
})

describe('restoreCategory', () => {
  it('restores a deleted category', () => {
    const cats = getCategories()
    deleteCategory(cats[0].id)
    expect(getCategories().find((c) => c.id === cats[0].id)!.deleted).toBe(true)
    restoreCategory(cats[0].id)
    expect(getCategories().find((c) => c.id === cats[0].id)!.deleted).toBe(false)
  })
})

describe('reorderCategories', () => {
  it('updates sort orders based on array position', () => {
    const cats = getCategories()
    const reversed = [...cats].reverse().map((c) => c.id)
    reorderCategories(reversed)
    const reordered = getCategories()
    expect(reordered.find((c) => c.id === reversed[0])!.sortOrder).toBe(0)
    expect(reordered.find((c) => c.id === reversed[1])!.sortOrder).toBe(1)
  })

  it('only updates categories in the provided list', () => {
    const cats = getCategories()
    const subset = [cats[2].id, cats[0].id]
    const originalOrder1 = cats[1].sortOrder
    reorderCategories(subset)
    const updated = getCategories()
    expect(updated.find((c) => c.id === cats[1].id)!.sortOrder).toBe(originalOrder1)
    expect(updated.find((c) => c.id === cats[2].id)!.sortOrder).toBe(0)
    expect(updated.find((c) => c.id === cats[0].id)!.sortOrder).toBe(1)
  })
})
