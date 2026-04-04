import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(),
}))

import { jwtVerify } from 'jose'
import { verifyToken, authenticate } from '../lib/auth.js'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
})

describe('verifyToken', () => {
  it('returns user for valid token', async () => {
    jwtVerify.mockResolvedValue({
      payload: { sub: '123', email: 'test@example.com' },
    })
    const result = await verifyToken('valid-token')
    expect(result).toEqual({ sub: '123', email: 'test@example.com' })
  })

  it('returns null for expired token', async () => {
    jwtVerify.mockRejectedValue(new Error('token expired'))
    const result = await verifyToken('expired-token')
    expect(result).toBeNull()
  })

  it('returns null for wrong audience', async () => {
    jwtVerify.mockRejectedValue(new Error('audience mismatch'))
    const result = await verifyToken('wrong-aud-token')
    expect(result).toBeNull()
  })

  it('returns null for null token', async () => {
    const result = await verifyToken(null)
    expect(result).toBeNull()
    expect(jwtVerify).not.toHaveBeenCalled()
  })

  it('returns null for undefined token', async () => {
    const result = await verifyToken(undefined)
    expect(result).toBeNull()
    expect(jwtVerify).not.toHaveBeenCalled()
  })
})

describe('authenticate', () => {
  it('extracts Bearer token from authorization header', async () => {
    jwtVerify.mockResolvedValue({
      payload: { sub: '123', email: 'test@example.com' },
    })
    const event = { headers: { authorization: 'Bearer my-token' } }
    const result = await authenticate(event)
    expect(result).toEqual({ sub: '123', email: 'test@example.com' })
    expect(jwtVerify).toHaveBeenCalledWith(
      'my-token',
      'mock-jwks',
      expect.any(Object),
    )
  })

  it('returns null when no authorization header', async () => {
    const event = { headers: {} }
    const result = await authenticate(event)
    expect(result).toBeNull()
  })

  it('returns null for non-Bearer auth header', async () => {
    const event = { headers: { authorization: 'Basic abc123' } }
    const result = await authenticate(event)
    expect(result).toBeNull()
  })
})
