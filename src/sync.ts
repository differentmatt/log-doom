import type { AuthUser } from './auth'
import type { StoredCategory } from './categories'
import type { DayLog, Tracker } from './trackers'
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
  getTrackers,
  getTrackersTimestamp,
  setTrackersWithTimestamp,
} from './storage'

// Sentinel "tracker" id used to sync the tracker registry itself through the
// existing per-tracker settings endpoint (SK: `SETTINGS#__trackers__`) — no
// dedicated backend route needed since the API stores `categories` as opaque JSON.
const REGISTRY_TRACKER_ID = '__trackers__'

let currentUser: AuthUser | null = null
let onChangeCallback: (() => void) | null = null

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayKey(trackerId: string, date: string): string {
  return trackerId === 'work' ? `logdoom:${date}` : `logdoom:t:${trackerId}:${date}`
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

  // Upload all local day logs (legacy work-tracker keys only)
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

  // Upload the tracker registry
  const trackersRaw = localStorage.getItem('logdoom:trackers')
  if (trackersRaw) {
    try {
      const parsed = JSON.parse(trackersRaw)
      const trackers = parsed.trackers ?? parsed
      if (Array.isArray(trackers) && trackers.length > 0) {
        await saveSettingsToApi(
          currentUser,
          trackers as Tracker[],
          parsed.updatedAt || new Date().toISOString(),
          REGISTRY_TRACKER_ID,
        )
      }
    } catch {
      // Skip
    }
  }
}

async function pullRemoteTrackers(): Promise<void> {
  if (!currentUser) return

  const settings = await fetchSettings(currentUser, REGISTRY_TRACKER_ID)
  if (!settings?.categories) return

  const localTimestamp = getTrackersTimestamp()
  const remoteUpdatedAt = settings.updatedAt

  if (!localTimestamp || (remoteUpdatedAt && remoteUpdatedAt >= localTimestamp)) {
    // Remote wins
    setTrackersWithTimestamp(settings.categories as Tracker[], remoteUpdatedAt || new Date().toISOString())
  } else {
    // Local wins — push to API
    const localTrackers = getTrackers()
    void saveSettingsToApi(currentUser, localTrackers, localTimestamp, REGISTRY_TRACKER_ID)
  }
}

async function pullRemoteForTracker(trackerId: string): Promise<void> {
  if (!currentUser) return

  // Pull remote days (last 90 days)
  const to = formatDate(new Date())
  const from = formatDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
  const days = await fetchDays(currentUser, from, to, trackerId)

  if (days) {
    const remoteDates = new Set<string>()

    for (const { date, log, updatedAt: remoteUpdatedAt } of days) {
      remoteDates.add(date)
      const localTimestamp = getDayTimestamp(trackerId, date)

      if (!localTimestamp || (remoteUpdatedAt && remoteUpdatedAt >= localTimestamp)) {
        // Remote wins — accept remote data
        if (Object.keys(log).length > 0) {
          setDayLogWithTimestamp(trackerId, date, log, remoteUpdatedAt || new Date().toISOString())
        } else {
          localStorage.removeItem(dayKey(trackerId, date))
        }
      } else {
        // Local wins — push to API
        const localLog = getDayLog(trackerId, date)
        if (Object.keys(localLog).length > 0) {
          void saveDayToApi(currentUser!, date, localLog, localTimestamp, trackerId)
        } else {
          void deleteDayFromApi(currentUser!, date, trackerId)
        }
      }
    }

    // Push local-only days (in 90-day window) not in remote
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const end = new Date()
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = formatDate(d)
      if (remoteDates.has(date)) continue
      const localLog = getDayLog(trackerId, date)
      if (Object.keys(localLog).length > 0) {
        const localTimestamp = getDayTimestamp(trackerId, date)
        void saveDayToApi(currentUser!, date, localLog, localTimestamp || new Date().toISOString(), trackerId)
      }
    }
  }

  // Pull remote settings with merge
  const settings = await fetchSettings(currentUser, trackerId)
  if (settings?.categories) {
    const localCatsTimestamp = getCategoriesTimestamp(trackerId)
    const remoteUpdatedAt = settings.updatedAt

    if (!localCatsTimestamp || (remoteUpdatedAt && remoteUpdatedAt >= localCatsTimestamp)) {
      // Remote wins
      setCategoriesWithTimestamp(
        trackerId,
        settings.categories as StoredCategory[],
        remoteUpdatedAt || new Date().toISOString(),
      )
    } else {
      // Local wins — push to API
      const localCats = getCategories(trackerId)
      void saveSettingsToApi(currentUser!, localCats, localCatsTimestamp, trackerId)
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

  // Merge the tracker registry first so newly-discovered remote trackers are
  // included in the per-tracker pulls below.
  await pullRemoteTrackers()

  const trackerIds = getTrackers()
    .filter((t) => !t.deleted)
    .map((t) => t.id)
  for (const trackerId of trackerIds) {
    await pullRemoteForTracker(trackerId)
  }

  onChangeCallback?.()
}

export function refreshSync(): void {
  if (currentUser) {
    void pullRemote()
  }
}

export function syncDayLog(trackerId: string, date: string, log: DayLog, updatedAt: string): void {
  if (!currentUser) return
  if (Object.keys(log).length === 0) {
    void deleteDayFromApi(currentUser, date, trackerId)
  } else {
    void saveDayToApi(currentUser, date, log, updatedAt, trackerId)
  }
}

export function syncSettings(trackerId: string, categories: StoredCategory[], updatedAt: string): void {
  if (!currentUser) return
  void saveSettingsToApi(currentUser, categories, updatedAt, trackerId)
}

export function syncTrackers(trackers: Tracker[], updatedAt: string): void {
  if (!currentUser) return
  void saveSettingsToApi(currentUser, trackers, updatedAt, REGISTRY_TRACKER_ID)
}
