import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./api', () => ({
  fetchDays: vi.fn(),
  saveDayToApi: vi.fn(),
  deleteDayFromApi: vi.fn(),
  fetchSettings: vi.fn(),
  saveSettingsToApi: vi.fn(),
}))

import { fetchDays, saveDayToApi, deleteDayFromApi, fetchSettings, saveSettingsToApi } from './api'
import { initSync, updateSyncUser, syncDayLog, syncSettings } from './sync'
import type { AuthUser } from './auth'

const mockUser: AuthUser = {
  sub: '123',
  name: 'Test User',
  email: 'test@example.com',
  picture: '',
  credential: 'test-jwt-token',
  exp: Math.floor(Date.now() / 1000) + 3600,
}

beforeEach(() => {
  vi.clearAllMocks()
  // Reset sync module state by initializing with null
  initSync(null, () => {})
})

describe('syncDayLog', () => {
  it('is a no-op when not signed in', () => {
    syncDayLog('2026-03-15', { 'dr-1on1': 2 }, '2026-03-15T12:00:00.000Z')
    expect(saveDayToApi).not.toHaveBeenCalled()
  })

  it('calls saveDayToApi with updatedAt when signed in', () => {
    initSync(mockUser, () => {})
    syncDayLog('2026-03-15', { 'dr-1on1': 2 }, '2026-03-15T12:00:00.000Z')
    expect(saveDayToApi).toHaveBeenCalledWith(mockUser, '2026-03-15', {
      'dr-1on1': 2,
    }, '2026-03-15T12:00:00.000Z')
  })

  it('calls deleteDayFromApi when log is empty', async () => {
    initSync(mockUser, () => {})
    syncDayLog('2026-03-15', {}, '2026-03-15T12:00:00.000Z')
    expect(deleteDayFromApi).toHaveBeenCalledWith(mockUser, '2026-03-15')
  })
})

describe('syncSettings', () => {
  it('is a no-op when not signed in', () => {
    syncSettings([], '2026-03-15T12:00:00.000Z')
    expect(saveSettingsToApi).not.toHaveBeenCalled()
  })

  it('calls saveSettingsToApi with updatedAt when signed in', () => {
    initSync(mockUser, () => {})
    const cats = [
      {
        id: 'cat1',
        label: 'Test',
        description: '',
        color: '#fff',
        sortOrder: 0,
        deleted: false,
      },
    ]
    syncSettings(cats, '2026-03-15T12:00:00.000Z')
    expect(saveSettingsToApi).toHaveBeenCalledWith(mockUser, cats, '2026-03-15T12:00:00.000Z')
  })
})

describe('initSync', () => {
  it('triggers pullRemote when user is signed in', async () => {
    vi.mocked(fetchDays).mockResolvedValue([])
    vi.mocked(fetchSettings).mockResolvedValue({ categories: null, updatedAt: null })
    vi.mocked(saveDayToApi).mockResolvedValue(undefined)
    vi.mocked(saveSettingsToApi).mockResolvedValue(undefined)

    const onChange = vi.fn()
    initSync(mockUser, onChange)

    // Wait for async pullRemote to complete
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(fetchDays).toHaveBeenCalled()
    expect(fetchSettings).toHaveBeenCalled()
  })

  it('does not pull when user is null', async () => {
    const onChange = vi.fn()
    initSync(null, onChange)

    // Give it a tick
    await new Promise((r) => setTimeout(r, 10))
    expect(fetchDays).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('updateSyncUser', () => {
  it('triggers pullRemote on sign-in', async () => {
    vi.mocked(fetchDays).mockResolvedValue([])
    vi.mocked(fetchSettings).mockResolvedValue({ categories: null, updatedAt: null })
    vi.mocked(saveDayToApi).mockResolvedValue(undefined)
    vi.mocked(saveSettingsToApi).mockResolvedValue(undefined)

    const onChange = vi.fn()
    initSync(null, onChange)
    updateSyncUser(mockUser)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(fetchDays).toHaveBeenCalled()
  })

  it('does not re-pull when already signed in', async () => {
    vi.mocked(fetchDays).mockResolvedValue([])
    vi.mocked(fetchSettings).mockResolvedValue({ categories: null, updatedAt: null })
    vi.mocked(saveDayToApi).mockResolvedValue(undefined)
    vi.mocked(saveSettingsToApi).mockResolvedValue(undefined)

    const onChange = vi.fn()
    initSync(mockUser, onChange)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    vi.clearAllMocks()

    updateSyncUser(mockUser)
    await new Promise((r) => setTimeout(r, 10))
    expect(fetchDays).not.toHaveBeenCalled()
  })
})

describe('migration', () => {
  it('uploads local data on first sign-in', async () => {
    localStorage.setItem(
      'logdoom:2026-03-15',
      JSON.stringify({ log: { 'dr-1on1': 2 }, updatedAt: '2026-03-15T10:00:00.000Z' }),
    )
    localStorage.setItem(
      'logdoom:categories',
      JSON.stringify({ categories: [{ id: 'cat1', label: 'Test' }], updatedAt: '2026-03-15T10:00:00.000Z' }),
    )

    vi.mocked(saveDayToApi).mockResolvedValue(undefined)
    vi.mocked(saveSettingsToApi).mockResolvedValue(undefined)
    vi.mocked(fetchDays).mockResolvedValue([])
    vi.mocked(fetchSettings).mockResolvedValue({ categories: null, updatedAt: null })

    const onChange = vi.fn()
    initSync(mockUser, onChange)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(saveDayToApi).toHaveBeenCalledWith(mockUser, '2026-03-15', {
      'dr-1on1': 2,
    }, '2026-03-15T10:00:00.000Z')
    expect(saveSettingsToApi).toHaveBeenCalledWith(mockUser, [
      { id: 'cat1', label: 'Test' },
    ], '2026-03-15T10:00:00.000Z')
  })

  it('skips migration if already migrated', async () => {
    localStorage.setItem('logdoom:migrated:123', 'true')
    // Use a date outside the 90-day window so merge won't push it
    localStorage.setItem('logdoom:2025-01-01', JSON.stringify({ log: { 'dr-1on1': 2 }, updatedAt: '2025-01-01T10:00:00.000Z' }))

    vi.mocked(fetchDays).mockResolvedValue([])
    vi.mocked(fetchSettings).mockResolvedValue({ categories: null, updatedAt: null })

    const onChange = vi.fn()
    initSync(mockUser, onChange)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    // saveDayToApi should NOT be called for migration (only fetchDays for pull)
    expect(saveDayToApi).not.toHaveBeenCalled()
  })
})

describe('merge logic', () => {
  beforeEach(() => {
    // Mark as already migrated to skip migration step
    localStorage.setItem('logdoom:migrated:123', 'true')
  })

  it('accepts remote data when remote is newer', async () => {
    // Local data with older timestamp
    localStorage.setItem(
      'logdoom:2026-03-15',
      JSON.stringify({ log: { 'dr-1on1': 1 }, updatedAt: '2026-03-15T10:00:00.000Z' }),
    )

    vi.mocked(fetchDays).mockResolvedValue([
      { date: '2026-03-15', log: { 'dr-1on1': 3 }, updatedAt: '2026-03-15T12:00:00.000Z' },
    ])
    vi.mocked(fetchSettings).mockResolvedValue({ categories: null, updatedAt: null })

    const onChange = vi.fn()
    initSync(mockUser, onChange)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    const raw = JSON.parse(localStorage.getItem('logdoom:2026-03-15')!)
    expect(raw.log).toEqual({ 'dr-1on1': 3 })
    expect(raw.updatedAt).toBe('2026-03-15T12:00:00.000Z')
  })

  it('keeps local data and pushes when local is newer', async () => {
    // Local data with newer timestamp
    localStorage.setItem(
      'logdoom:2026-03-15',
      JSON.stringify({ log: { 'dr-1on1': 5 }, updatedAt: '2026-03-15T14:00:00.000Z' }),
    )

    vi.mocked(fetchDays).mockResolvedValue([
      { date: '2026-03-15', log: { 'dr-1on1': 3 }, updatedAt: '2026-03-15T12:00:00.000Z' },
    ])
    vi.mocked(fetchSettings).mockResolvedValue({ categories: null, updatedAt: null })
    vi.mocked(saveDayToApi).mockResolvedValue(undefined)

    const onChange = vi.fn()
    initSync(mockUser, onChange)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    // Local should be kept
    const raw = JSON.parse(localStorage.getItem('logdoom:2026-03-15')!)
    expect(raw.log).toEqual({ 'dr-1on1': 5 })
    // Should push local to API
    expect(saveDayToApi).toHaveBeenCalledWith(
      mockUser,
      '2026-03-15',
      { 'dr-1on1': 5 },
      '2026-03-15T14:00:00.000Z',
    )
  })

  it('pushes local-only days not in remote', async () => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      `logdoom:${dateStr}`,
      JSON.stringify({ log: { 'dr-1on1': 2 }, updatedAt: '2026-03-15T10:00:00.000Z' }),
    )

    vi.mocked(fetchDays).mockResolvedValue([]) // No remote days
    vi.mocked(fetchSettings).mockResolvedValue({ categories: null, updatedAt: null })
    vi.mocked(saveDayToApi).mockResolvedValue(undefined)

    const onChange = vi.fn()
    initSync(mockUser, onChange)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    // Should push local-only day to API
    expect(saveDayToApi).toHaveBeenCalledWith(
      mockUser,
      dateStr,
      { 'dr-1on1': 2 },
      '2026-03-15T10:00:00.000Z',
    )
  })

  it('merges settings: remote newer wins', async () => {
    localStorage.setItem(
      'logdoom:categories',
      JSON.stringify({
        categories: [{ id: 'cat1', label: 'Local' }],
        updatedAt: '2026-03-15T10:00:00.000Z',
      }),
    )

    vi.mocked(fetchDays).mockResolvedValue([])
    vi.mocked(fetchSettings).mockResolvedValue({
      categories: [{ id: 'cat1', label: 'Remote' }],
      updatedAt: '2026-03-15T12:00:00.000Z',
    })

    const onChange = vi.fn()
    initSync(mockUser, onChange)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    const raw = JSON.parse(localStorage.getItem('logdoom:categories')!)
    expect(raw.categories[0].label).toBe('Remote')
    expect(raw.updatedAt).toBe('2026-03-15T12:00:00.000Z')
  })

  it('merges settings: local newer pushes to API', async () => {
    localStorage.setItem(
      'logdoom:categories',
      JSON.stringify({
        categories: [{ id: 'cat1', label: 'Local' }],
        updatedAt: '2026-03-15T14:00:00.000Z',
      }),
    )

    vi.mocked(fetchDays).mockResolvedValue([])
    vi.mocked(fetchSettings).mockResolvedValue({
      categories: [{ id: 'cat1', label: 'Remote' }],
      updatedAt: '2026-03-15T12:00:00.000Z',
    })
    vi.mocked(saveSettingsToApi).mockResolvedValue(undefined)

    const onChange = vi.fn()
    initSync(mockUser, onChange)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    // Local should be kept
    const raw = JSON.parse(localStorage.getItem('logdoom:categories')!)
    expect(raw.categories[0].label).toBe('Local')
    // Should push local to API
    expect(saveSettingsToApi).toHaveBeenCalledWith(
      mockUser,
      [{ id: 'cat1', label: 'Local' }],
      '2026-03-15T14:00:00.000Z',
    )
  })
})
