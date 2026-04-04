import { type StoredCategory, defaultCategories } from './categories'
import { syncDayLog, syncSettings } from './sync'

const PREFIX = 'logdoom'
const CATEGORIES_KEY = `${PREFIX}:categories`

function key(date: string): string {
  return `${PREFIX}:${date}`
}

function now(): string {
  return new Date().toISOString()
}

// --- Day log functions ---

export function getDayLog(date: string): Record<string, number> {
  const raw = localStorage.getItem(key(date))
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    // Legacy format: plain log object; new format: { log, updatedAt }
    return parsed.log ?? parsed
  } catch {
    return {}
  }
}

export function getDayTimestamp(date: string): string | null {
  const raw = localStorage.getItem(key(date))
  if (!raw) return null
  try {
    return JSON.parse(raw).updatedAt ?? null
  } catch {
    return null
  }
}

export function setDayLogWithTimestamp(
  date: string,
  log: Record<string, number>,
  updatedAt: string,
): void {
  if (Object.keys(log).length === 0) {
    localStorage.removeItem(key(date))
  } else {
    localStorage.setItem(key(date), JSON.stringify({ log, updatedAt }))
  }
}

export function setHours(date: string, categoryId: string, hours: number): void {
  const log = getDayLog(date)
  if (hours === 0) {
    delete log[categoryId]
  } else {
    log[categoryId] = hours
  }
  const updatedAt = now()
  if (Object.keys(log).length === 0) {
    localStorage.removeItem(key(date))
  } else {
    localStorage.setItem(key(date), JSON.stringify({ log, updatedAt }))
  }
  syncDayLog(date, log, updatedAt)
}

export function resetDay(date: string): void {
  localStorage.removeItem(key(date))
  const updatedAt = now()
  syncDayLog(date, {}, updatedAt)
}

export function getRecentDays(n: number): { date: string; log: Record<string, number> }[] {
  const results: { date: string; log: Record<string, number> }[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = formatDate(d)
    const log = getDayLog(date)
    if (Object.keys(log).length > 0) {
      results.push({ date, log })
    }
  }
  return results
}

export function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayString(): string {
  return formatDate(new Date())
}

// --- Category functions ---

function seedCategories(): StoredCategory[] {
  const cats: StoredCategory[] = defaultCategories.map((c, i) => ({
    ...c,
    sortOrder: i,
    deleted: false,
  }))
  const updatedAt = now()
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify({ categories: cats, updatedAt }))
  return cats
}

export function getCategories(): StoredCategory[] {
  const raw = localStorage.getItem(CATEGORIES_KEY)
  if (!raw) return seedCategories()
  try {
    const parsed = JSON.parse(raw)
    // Legacy format: plain array; new format: { categories, updatedAt }
    return parsed.categories ?? parsed
  } catch {
    return seedCategories()
  }
}

export function getCategoriesTimestamp(): string | null {
  const raw = localStorage.getItem(CATEGORIES_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw).updatedAt ?? null
  } catch {
    return null
  }
}

export function setCategoriesWithTimestamp(cats: StoredCategory[], updatedAt: string): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify({ categories: cats, updatedAt }))
}

function saveCategories(cats: StoredCategory[]): void {
  const updatedAt = now()
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify({ categories: cats, updatedAt }))
  syncSettings(cats, updatedAt)
}

export function addCategory(cat: { label: string; description: string; color: string }): StoredCategory {
  const cats = getCategories()
  const maxOrder = cats.reduce((max, c) => Math.max(max, c.sortOrder), -1)
  const newCat: StoredCategory = {
    id: crypto.randomUUID(),
    label: cat.label,
    description: cat.description,
    color: cat.color,
    sortOrder: maxOrder + 1,
    deleted: false,
  }
  cats.push(newCat)
  saveCategories(cats)
  return newCat
}

export function updateCategory(id: string, updates: Partial<Pick<StoredCategory, 'label' | 'description' | 'color'>>): void {
  const cats = getCategories()
  const cat = cats.find((c) => c.id === id)
  if (!cat) return
  if (updates.label !== undefined) cat.label = updates.label
  if (updates.description !== undefined) cat.description = updates.description
  if (updates.color !== undefined) cat.color = updates.color
  saveCategories(cats)
}

export function deleteCategory(id: string): void {
  const cats = getCategories()
  const cat = cats.find((c) => c.id === id)
  if (!cat) return
  cat.deleted = true
  saveCategories(cats)
}

export function restoreCategory(id: string): void {
  const cats = getCategories()
  const cat = cats.find((c) => c.id === id)
  if (!cat) return
  cat.deleted = false
  saveCategories(cats)
}

export function reorderCategories(orderedIds: string[]): void {
  const cats = getCategories()
  orderedIds.forEach((id, index) => {
    const cat = cats.find((c) => c.id === id)
    if (cat) cat.sortOrder = index
  })
  saveCategories(cats)
}
