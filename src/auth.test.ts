import { describe, it, expect } from 'vitest'
import { isExpired, loadStoredUser, getCredential, signOut } from './auth'
import type { AuthUser } from './auth'

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    sub: '123',
    name: 'Test User',
    email: 'test@example.com',
    picture: 'https://example.com/photo.jpg',
    credential: 'fake.jwt.token',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    ...overrides,
  }
}

describe('isExpired', () => {
  it('returns false for non-expired user', () => {
    expect(isExpired(makeUser())).toBe(false)
  })

  it('returns true for expired user', () => {
    const user = makeUser({ exp: Math.floor(Date.now() / 1000) - 100 })
    expect(isExpired(user)).toBe(true)
  })

  it('returns true when within 60-second buffer', () => {
    const user = makeUser({ exp: Math.floor(Date.now() / 1000) + 30 })
    expect(isExpired(user)).toBe(true)
  })
})

describe('loadStoredUser', () => {
  it('returns null when no data exists', () => {
    expect(loadStoredUser()).toBeNull()
  })

  it('returns valid user', () => {
    const user = makeUser()
    localStorage.setItem('logdoom:auth', JSON.stringify(user))
    const loaded = loadStoredUser()
    expect(loaded).not.toBeNull()
    expect(loaded!.email).toBe('test@example.com')
  })

  it('returns null and clears storage for expired user', () => {
    const user = makeUser({ exp: Math.floor(Date.now() / 1000) - 100 })
    localStorage.setItem('logdoom:auth', JSON.stringify(user))
    expect(loadStoredUser()).toBeNull()
    expect(localStorage.getItem('logdoom:auth')).toBeNull()
  })

  it('returns null and clears storage for invalid JSON', () => {
    localStorage.setItem('logdoom:auth', 'not-json')
    expect(loadStoredUser()).toBeNull()
    expect(localStorage.getItem('logdoom:auth')).toBeNull()
  })
})

describe('getCredential', () => {
  it('returns null for null user', () => {
    expect(getCredential(null)).toBeNull()
  })

  it('returns credential for valid user', () => {
    const user = makeUser()
    expect(getCredential(user)).toBe('fake.jwt.token')
  })

  it('returns null for expired user', () => {
    const user = makeUser({ exp: Math.floor(Date.now() / 1000) - 100 })
    expect(getCredential(user)).toBeNull()
  })
})

describe('signOut', () => {
  it('clears localStorage', () => {
    localStorage.setItem('logdoom:auth', JSON.stringify(makeUser()))
    signOut(makeUser())
    expect(localStorage.getItem('logdoom:auth')).toBeNull()
  })
})
