import type { AuthUser } from './auth'
import { getCredential } from './auth'

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

export async function fetchDays(
  user: AuthUser | null,
  from: string,
  to: string,
): Promise<{ date: string; log: Record<string, number>; updatedAt: string | null }[] | null> {
  return apiFetch(`/api/days?from=${from}&to=${to}`, user)
}

export async function saveDayToApi(
  user: AuthUser | null,
  date: string,
  log: Record<string, number>,
  updatedAt?: string,
): Promise<void> {
  await apiFetch(`/api/days/${date}`, user, {
    method: 'PUT',
    body: JSON.stringify({ log, updatedAt }),
  })
}

export async function deleteDayFromApi(
  user: AuthUser | null,
  date: string,
): Promise<void> {
  await apiFetch(`/api/days/${date}`, user, { method: 'DELETE' })
}

export async function fetchSettings(
  user: AuthUser | null,
): Promise<{ categories: unknown[] | null; updatedAt: string | null } | null> {
  return apiFetch('/api/settings', user)
}

export async function saveSettingsToApi(
  user: AuthUser | null,
  categories: unknown[],
  updatedAt?: string,
): Promise<void> {
  await apiFetch('/api/settings', user, {
    method: 'PUT',
    body: JSON.stringify({ categories, updatedAt }),
  })
}
