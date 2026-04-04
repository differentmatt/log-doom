import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchDays, saveDayToApi, deleteDayFromApi, fetchSettings, saveSettingsToApi } from './api'
import type { AuthUser } from './auth'

vi.mock('./auth', () => ({
  getCredential: vi.fn(),
}))

import { getCredential } from './auth'
const mockGetCredential = vi.mocked(getCredential)

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
  vi.stubGlobal('fetch', vi.fn())
})

describe('fetchDays', () => {
  it('sends GET with auth header and returns days', async () => {
    mockGetCredential.mockReturnValue('test-jwt-token')
    const mockResponse = [{ date: '2026-03-01', log: { 'dr-1on1': 2 }, updatedAt: '2026-03-01T10:00:00.000Z' }]
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchDays(mockUser, '2026-03-01', '2026-03-31')
    expect(result).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith(
      '/api/days?from=2026-03-01&to=2026-03-31',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
        }),
      }),
    )
  })

  it('returns null when not signed in', async () => {
    mockGetCredential.mockReturnValue(null)
    const result = await fetchDays(null, '2026-03-01', '2026-03-31')
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null on network error', async () => {
    mockGetCredential.mockReturnValue('test-jwt-token')
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
    const result = await fetchDays(mockUser, '2026-03-01', '2026-03-31')
    expect(result).toBeNull()
  })

  it('returns null on non-ok response', async () => {
    mockGetCredential.mockReturnValue('test-jwt-token')
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as Response)
    const result = await fetchDays(mockUser, '2026-03-01', '2026-03-31')
    expect(result).toBeNull()
  })
})

describe('saveDayToApi', () => {
  it('sends PUT with log body', async () => {
    mockGetCredential.mockReturnValue('test-jwt-token')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ date: '2026-03-15' }),
    } as Response)

    await saveDayToApi(mockUser, '2026-03-15', { 'dr-1on1': 2 })
    expect(fetch).toHaveBeenCalledWith(
      '/api/days/2026-03-15',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ log: { 'dr-1on1': 2 }, updatedAt: undefined }),
      }),
    )
  })

  it('sends PUT with updatedAt when provided', async () => {
    mockGetCredential.mockReturnValue('test-jwt-token')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ date: '2026-03-15' }),
    } as Response)

    await saveDayToApi(mockUser, '2026-03-15', { 'dr-1on1': 2 }, '2026-03-15T12:00:00.000Z')
    expect(fetch).toHaveBeenCalledWith(
      '/api/days/2026-03-15',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ log: { 'dr-1on1': 2 }, updatedAt: '2026-03-15T12:00:00.000Z' }),
      }),
    )
  })
})

describe('deleteDayFromApi', () => {
  it('sends DELETE request', async () => {
    mockGetCredential.mockReturnValue('test-jwt-token')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ date: '2026-03-15' }),
    } as Response)

    await deleteDayFromApi(mockUser, '2026-03-15')
    expect(fetch).toHaveBeenCalledWith(
      '/api/days/2026-03-15',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('fetchSettings', () => {
  it('returns settings with updatedAt from API', async () => {
    mockGetCredential.mockReturnValue('test-jwt-token')
    const mockResponse = { categories: [{ id: 'cat1', label: 'Test' }], updatedAt: '2026-03-15T10:00:00.000Z' }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchSettings(mockUser)
    expect(result).toEqual(mockResponse)
  })
})

describe('saveSettingsToApi', () => {
  it('sends PUT with categories', async () => {
    mockGetCredential.mockReturnValue('test-jwt-token')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    const categories = [{ id: 'cat1', label: 'Test' }]
    await saveSettingsToApi(mockUser, categories)
    expect(fetch).toHaveBeenCalledWith(
      '/api/settings',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ categories, updatedAt: undefined }),
      }),
    )
  })

  it('sends PUT with updatedAt when provided', async () => {
    mockGetCredential.mockReturnValue('test-jwt-token')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    const categories = [{ id: 'cat1', label: 'Test' }]
    await saveSettingsToApi(mockUser, categories, '2026-03-15T12:00:00.000Z')
    expect(fetch).toHaveBeenCalledWith(
      '/api/settings',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ categories, updatedAt: '2026-03-15T12:00:00.000Z' }),
      }),
    )
  })
})
