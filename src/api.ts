import type { AuthUser } from './auth'
import { getCredential } from './auth'
import type { DayLog } from './trackers'

async function apiFetch<T>(
  path: string,
  user: AuthUser | null,
  options?: RequestInit,
): Promise<T | null> {
  const credential = getCredential(user)
  if (!credential) return null
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credential}`,
        ...options?.headers,
      },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function trackerQuery(trackerId: string, sep: '?' | '&'): string {
  return trackerId === 'work' ? '' : `${sep}tracker=${encodeURIComponent(trackerId)}`
}

export async function fetchDays(
  user: AuthUser | null,
  from: string,
  to: string,
  trackerId: string = 'work',
): Promise<{ date: string; log: DayLog; updatedAt: string | null }[] | null> {
  return apiFetch(`/api/days?from=${from}&to=${to}${trackerQuery(trackerId, '&')}`, user)
}

export async function saveDayToApi(
  user: AuthUser | null,
  date: string,
  log: DayLog,
  updatedAt?: string,
  trackerId: string = 'work',
): Promise<void> {
  await apiFetch(`/api/days/${date}${trackerQuery(trackerId, '?')}`, user, {
    method: 'PUT',
    body: JSON.stringify({ log, updatedAt }),
  })
}

export async function deleteDayFromApi(
  user: AuthUser | null,
  date: string,
  trackerId: string = 'work',
): Promise<void> {
  await apiFetch(`/api/days/${date}${trackerQuery(trackerId, '?')}`, user, { method: 'DELETE' })
}

export async function fetchSettings(
  user: AuthUser | null,
  trackerId: string = 'work',
): Promise<{ categories: unknown[] | null; updatedAt: string | null } | null> {
  return apiFetch(`/api/settings${trackerQuery(trackerId, '?')}`, user)
}

export async function saveSettingsToApi(
  user: AuthUser | null,
  categories: unknown[],
  updatedAt?: string,
  trackerId: string = 'work',
): Promise<void> {
  await apiFetch(`/api/settings${trackerQuery(trackerId, '?')}`, user, {
    method: 'PUT',
    body: JSON.stringify({ categories, updatedAt }),
  })
}
