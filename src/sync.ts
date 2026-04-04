import type { AuthUser } from './auth'
import type { StoredCategory } from './categories'
import {
  fetchDays,
  saveDayToApi,
  deleteDayFromApi,
  fetchSettings,
  saveSettingsToApi,
} from './api'
import {
  getDayLog,
  getDayTimestamp,
  setDayLogWithTimestamp,
  getCategories,
  getCategoriesTimestamp,
  setCategoriesWithTimestamp,
} from './storage'

let currentUser: AuthUser | null = null
let onChangeCallback: (() => void) | null = null

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function initSync(user: AuthUser | null, onChange: () => void): void {
  currentUser = user
  onChangeCallback = onChange
  if (user) {
    void pullRemote()
  }
}

export function updateSyncUser(user: AuthUser | null): void {
  const wasSignedIn = currentUser !== null
  currentUser = user
  if (user && !wasSignedIn) {
    void pullRemote()
  }
}

async function migrateLocalData(): Promise<void> {
  if (!currentUser) return

  // Upload all local day logs
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (
      !key ||
      !key.startsWith('logdoom:') ||
      key === 'logdoom:categories' ||
      key === 'logdoom:auth' ||
      key.startsWith('logdoom:migrated:')
    )
      continue
    const date = key.replace('logdoom:', '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}')
      const log = parsed.log ?? parsed
      await saveDayToApi(currentUser, date, log, parsed.updatedAt || new Date().toISOString())
    } catch {
      // Skip malformed entries
    }
  }

  // Upload settings
  const catsRaw = localStorage.getItem('logdoom:categories')
  if (catsRaw) {
    try {
      const parsed = JSON.parse(catsRaw)
      const cats = parsed.categories ?? parsed
      if (Array.isArray(cats) && cats.length > 0) {
        await saveSettingsToApi(currentUser, cats as StoredCategory[], parsed.updatedAt || new Date().toISOString())
      }
    } catch {
      // Skip
    }
  }
}

async function pullRemote(): Promise<void> {
  if (!currentUser) return

  // Auto-migration on first sign-in
  const migrationKey = `logdoom:migrated:v2:${currentUser.sub}`
  if (!localStorage.getItem(migrationKey)) {
    await migrateLocalData()
    localStorage.setItem(migrationKey, 'true')
  }

  // Pull remote days (last 90 days)
  const to = formatDate(new Date())
  const from = formatDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
  const days = await fetchDays(currentUser, from, to)

  if (days) {
    const remoteDates = new Set<string>()

    for (const { date, log, updatedAt: remoteUpdatedAt } of days) {
      remoteDates.add(date)
      const localTimestamp = getDayTimestamp(date)

      if (!localTimestamp || (remoteUpdatedAt && remoteUpdatedAt >= localTimestamp)) {
        // Remote wins — accept remote data
        if (Object.keys(log).length > 0) {
          setDayLogWithTimestamp(date, log, remoteUpdatedAt || new Date().toISOString())
        } else {
          localStorage.removeItem(`logdoom:${date}`)
        }
      } else {
        // Local wins — push to API
        const localLog = getDayLog(date)
        if (Object.keys(localLog).length > 0) {
          void saveDayToApi(currentUser!, date, localLog, localTimestamp)
        } else {
          void deleteDayFromApi(currentUser!, date)
        }
      }
    }

    // Push local-only days (in 90-day window) not in remote
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const end = new Date()
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = formatDate(d)
      if (remoteDates.has(date)) continue
      const localLog = getDayLog(date)
      if (Object.keys(localLog).length > 0) {
        const localTimestamp = getDayTimestamp(date)
        void saveDayToApi(currentUser!, date, localLog, localTimestamp || new Date().toISOString())
      }
    }
  }

  // Pull remote settings with merge
  const settings = await fetchSettings(currentUser)
  if (settings?.categories) {
    const localCatsTimestamp = getCategoriesTimestamp()
    const remoteUpdatedAt = settings.updatedAt

    if (!localCatsTimestamp || (remoteUpdatedAt && remoteUpdatedAt >= localCatsTimestamp)) {
      // Remote wins
      setCategoriesWithTimestamp(
        settings.categories as StoredCategory[],
        remoteUpdatedAt || new Date().toISOString(),
      )
    } else {
      // Local wins — push to API
      const localCats = getCategories()
      void saveSettingsToApi(currentUser!, localCats, localCatsTimestamp)
    }
  }

  onChangeCallback?.()
}

export function refreshSync(): void {
  if (currentUser) {
    void pullRemote()
  }
}

export function syncDayLog(date: string, log: Record<string, number>, updatedAt: string): void {
  if (!currentUser) return
  if (Object.keys(log).length === 0) {
    void deleteDayFromApi(currentUser, date)
  } else {
    void saveDayToApi(currentUser, date, log, updatedAt)
  }
}

export function syncSettings(categories: StoredCategory[], updatedAt: string): void {
  if (!currentUser) return
  void saveSettingsToApi(currentUser, categories, updatedAt)
}
