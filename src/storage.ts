import { type StoredCategory, defaultCategories } from './categories'
import { type Tracker, type TrackerUnit, type LogValue, type DayLog, defaultTrackers, defaultExercises } from './trackers'
import { syncDayLog, syncSettings, syncTrackers } from './sync'

const PREFIX = 'logdoom'
const CATEGORIES_KEY = `${PREFIX}:categories`
const TRACKERS_KEY = `${PREFIX}:trackers`

function dayKey(trackerId: string, date: string): string {
  return trackerId === 'work' ? `${PREFIX}:${date}` : `${PREFIX}:t:${trackerId}:${date}`
}

function categoriesKey(trackerId: string): string {
  return trackerId === 'work' ? CATEGORIES_KEY : `${PREFIX}:t:${trackerId}:categories`
}

function now(): string {
  return new Date().toISOString()
}

// Used to stamp freshly-seeded (never-edited) local data so that any genuine remote
// timestamp always wins the first sync merge, instead of racing a just-seeded "now".
const EPOCH = new Date(0).toISOString()

function isEmptyValue(value: LogValue): boolean {
  return typeof value === 'number' ? value === 0 : value.amounts.length === 0
}

// --- Day log functions ---

export function getDayLog(trackerId: string, date: string): DayLog {
  const raw = localStorage.getItem(dayKey(trackerId, date))
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    // Legacy format: plain log object; new format: { log, updatedAt }
    return parsed.log ?? parsed
  } catch {
    return {}
  }
}

export function getDayTimestamp(trackerId: string, date: string): string | null {
  const raw = localStorage.getItem(dayKey(trackerId, date))
  if (!raw) return null
  try {
    return JSON.parse(raw).updatedAt ?? null
  } catch {
    return null
  }
}

export function setDayLogWithTimestamp(
  trackerId: string,
  date: string,
  log: DayLog,
  updatedAt: string,
): void {
  if (Object.keys(log).length === 0) {
    localStorage.removeItem(dayKey(trackerId, date))
  } else {
    localStorage.setItem(dayKey(trackerId, date), JSON.stringify({ log, updatedAt }))
  }
}

export function setValue(trackerId: string, date: string, itemId: string, value: LogValue): void {
  const log = getDayLog(trackerId, date)
  if (isEmptyValue(value)) {
    delete log[itemId]
  } else {
    log[itemId] = value
  }
  const updatedAt = now()
  setDayLogWithTimestamp(trackerId, date, log, updatedAt)
  syncDayLog(trackerId, date, log, updatedAt)
}

export function setHours(trackerId: string, date: string, categoryId: string, hours: number): void {
  setValue(trackerId, date, categoryId, hours)
}

export function resetDay(trackerId: string, date: string): void {
  localStorage.removeItem(dayKey(trackerId, date))
  const updatedAt = now()
  syncDayLog(trackerId, date, {}, updatedAt)
}

export function getRecentDays(trackerId: string, n: number): { date: string; log: DayLog }[] {
  const results: { date: string; log: DayLog }[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = formatDate(d)
    const log = getDayLog(trackerId, date)
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

export function getWeekStart(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const dow = d.getDay() // 0=Sun, 1=Mon, ...
  const diff = dow === 0 ? 6 : dow - 1 // days since Monday
  d.setDate(d.getDate() - diff)
  return formatDate(d)
}

export function getWeekEnd(weekStart: string): string {
  const [year, month, day] = weekStart.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + 6)
  return formatDate(d)
}

export function getDaysInRange(
  trackerId: string,
  start: string,
  end: string,
): { date: string; log: DayLog }[] {
  const results: { date: string; log: DayLog }[] = []
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const startD = new Date(sy, sm - 1, sd)
  const endD = new Date(ey, em - 1, ed)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let d = new Date(startD); d <= endD && d <= today; d.setDate(d.getDate() + 1)) {
    const date = formatDate(d)
    const log = getDayLog(trackerId, date)
    results.push({ date, log })
  }
  return results
}

export function getRecentWeeks(n: number): string[] {
  const today = new Date()
  const todayStr = formatDate(today)
  const thisMonday = getWeekStart(todayStr)
  const [year, month, day] = thisMonday.split('-').map(Number)
  const weeks: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(year, month - 1, day)
    d.setDate(d.getDate() - i * 7)
    weeks.push(formatDate(d))
  }
  return weeks
}

// --- Category (tracker item) functions ---

function seedCategories(trackerId: string): StoredCategory[] {
  const defaults = trackerId === 'work' ? defaultCategories : trackerId === 'exercise' ? defaultExercises : []
  const cats: StoredCategory[] = defaults.map((c, i) => ({
    ...c,
    sortOrder: i,
    deleted: false,
  }))
  localStorage.setItem(categoriesKey(trackerId), JSON.stringify({ categories: cats, updatedAt: EPOCH }))
  return cats
}

export function getCategories(trackerId: string): StoredCategory[] {
  const raw = localStorage.getItem(categoriesKey(trackerId))
  if (!raw) return seedCategories(trackerId)
  try {
    const parsed = JSON.parse(raw)
    // Legacy format: plain array; new format: { categories, updatedAt }
    return parsed.categories ?? parsed
  } catch {
    return seedCategories(trackerId)
  }
}

export function getCategoriesTimestamp(trackerId: string): string | null {
  const raw = localStorage.getItem(categoriesKey(trackerId))
  if (!raw) return null
  try {
    return JSON.parse(raw).updatedAt ?? null
  } catch {
    return null
  }
}

export function setCategoriesWithTimestamp(trackerId: string, cats: StoredCategory[], updatedAt: string): void {
  localStorage.setItem(categoriesKey(trackerId), JSON.stringify({ categories: cats, updatedAt }))
}

function saveCategories(trackerId: string, cats: StoredCategory[]): void {
  const updatedAt = now()
  localStorage.setItem(categoriesKey(trackerId), JSON.stringify({ categories: cats, updatedAt }))
  syncSettings(trackerId, cats, updatedAt)
}

export function addCategory(
  trackerId: string,
  cat: { label: string; description: string; color: string },
): StoredCategory {
  const cats = getCategories(trackerId)
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
  saveCategories(trackerId, cats)
  return newCat
}

export function updateCategory(
  trackerId: string,
  id: string,
  updates: Partial<Pick<StoredCategory, 'label' | 'description' | 'color'>>,
): void {
  const cats = getCategories(trackerId)
  const cat = cats.find((c) => c.id === id)
  if (!cat) return
  if (updates.label !== undefined) cat.label = updates.label
  if (updates.description !== undefined) cat.description = updates.description
  if (updates.color !== undefined) cat.color = updates.color
  saveCategories(trackerId, cats)
}

export function deleteCategory(trackerId: string, id: string): void {
  const cats = getCategories(trackerId)
  const cat = cats.find((c) => c.id === id)
  if (!cat) return
  cat.deleted = true
  saveCategories(trackerId, cats)
}

export function restoreCategory(trackerId: string, id: string): void {
  const cats = getCategories(trackerId)
  const cat = cats.find((c) => c.id === id)
  if (!cat) return
  cat.deleted = false
  saveCategories(trackerId, cats)
}

export function reorderCategories(trackerId: string, orderedIds: string[]): void {
  const cats = getCategories(trackerId)
  orderedIds.forEach((id, index) => {
    const cat = cats.find((c) => c.id === id)
    if (cat) cat.sortOrder = index
  })
  saveCategories(trackerId, cats)
}

// --- Tracker registry ---

function seedTrackers(): Tracker[] {
  localStorage.setItem(TRACKERS_KEY, JSON.stringify({ trackers: defaultTrackers, updatedAt: EPOCH }))
  return defaultTrackers
}

export function getTrackers(): Tracker[] {
  const raw = localStorage.getItem(TRACKERS_KEY)
  if (!raw) return seedTrackers()
  try {
    const parsed = JSON.parse(raw)
    // Legacy format: plain array; new format: { trackers, updatedAt }
    const trackers = parsed.trackers ?? parsed
    return Array.isArray(trackers) ? trackers : seedTrackers()
  } catch {
    return seedTrackers()
  }
}

export function getTrackersTimestamp(): string | null {
  const raw = localStorage.getItem(TRACKERS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw).updatedAt ?? null
  } catch {
    return null
  }
}

export function setTrackersWithTimestamp(trackers: Tracker[], updatedAt: string): void {
  localStorage.setItem(TRACKERS_KEY, JSON.stringify({ trackers, updatedAt }))
}

function saveTrackers(trackers: Tracker[]): void {
  const updatedAt = now()
  localStorage.setItem(TRACKERS_KEY, JSON.stringify({ trackers, updatedAt }))
  syncTrackers(trackers, updatedAt)
}

export function addTracker(t: { label: string; unit: TrackerUnit; icon?: string }): Tracker {
  const trackers = getTrackers()
  const maxOrder = trackers.reduce((max, tr) => Math.max(max, tr.sortOrder), -1)
  const newTracker: Tracker = {
    id: crypto.randomUUID(),
    label: t.label,
    unit: t.unit,
    icon: t.icon,
    sortOrder: maxOrder + 1,
    deleted: false,
  }
  trackers.push(newTracker)
  saveTrackers(trackers)
  return newTracker
}

export function updateTracker(
  id: string,
  updates: Partial<Pick<Tracker, 'label' | 'icon'>>,
): void {
  const trackers = getTrackers()
  const tracker = trackers.find((t) => t.id === id)
  if (!tracker) return
  if (updates.label !== undefined) tracker.label = updates.label
  if (updates.icon !== undefined) tracker.icon = updates.icon
  saveTrackers(trackers)
}

export function deleteTracker(id: string): void {
  if (id === 'work') return
  const trackers = getTrackers()
  const tracker = trackers.find((t) => t.id === id)
  if (!tracker) return
  tracker.deleted = true
  saveTrackers(trackers)
}

export function restoreTracker(id: string): void {
  const trackers = getTrackers()
  const tracker = trackers.find((t) => t.id === id)
  if (!tracker) return
  tracker.deleted = false
  saveTrackers(trackers)
}

export function reorderTrackers(orderedIds: string[]): void {
  const trackers = getTrackers()
  orderedIds.forEach((id, index) => {
    const tracker = trackers.find((t) => t.id === id)
    if (tracker) tracker.sortOrder = index
  })
  saveTrackers(trackers)
}
