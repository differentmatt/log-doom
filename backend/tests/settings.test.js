import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/auth.js', () => ({
  authenticate: vi.fn(),
}))

vi.mock('../lib/dynamo.js', () => ({
  getItem: vi.fn(),
  putItem: vi.fn(),
}))

import { authenticate } from '../lib/auth.js'
import { getItem, putItem } from '../lib/dynamo.js'
import { handler } from '../handlers/settings.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('settings handler', () => {
  it('returns 401 when not authenticated', async () => {
    authenticate.mockResolvedValue(null)
    const event = {
      requestContext: { http: { method: 'GET' } },
      headers: {},
    }
    const res = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  describe('GET', () => {
    it('returns categories with updatedAt from DynamoDB', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      getItem.mockResolvedValue({
        PK: 'USER#123',
        SK: 'SETTINGS',
        categories: [{ id: 'cat1', label: 'Custom' }],
        updatedAt: '2026-03-15T10:00:00.000Z',
      })
      const event = {
        requestContext: { http: { method: 'GET' } },
        headers: { authorization: 'Bearer token' },
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.categories).toEqual([{ id: 'cat1', label: 'Custom' }])
      expect(body.updatedAt).toBe('2026-03-15T10:00:00.000Z')
    })

    it('returns null categories and null updatedAt when no settings exist', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      getItem.mockResolvedValue(null)
      const event = {
        requestContext: { http: { method: 'GET' } },
        headers: { authorization: 'Bearer token' },
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.categories).toBeNull()
      expect(body.updatedAt).toBeNull()
    })

    it('returns null updatedAt for items without it', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      getItem.mockResolvedValue({
        PK: 'USER#123',
        SK: 'SETTINGS',
        categories: [{ id: 'cat1', label: 'Custom' }],
      })
      const event = {
        requestContext: { http: { method: 'GET' } },
        headers: { authorization: 'Bearer token' },
      }
      const res = await handler(event)
      const body = JSON.parse(res.body)
      expect(body.updatedAt).toBeNull()
    })
  })

  describe('PUT', () => {
    it('saves categories with client updatedAt', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      putItem.mockResolvedValue(undefined)
      const categories = [{ id: 'cat1', label: 'Custom' }]
      const event = {
        requestContext: { http: { method: 'PUT' } },
        headers: { authorization: 'Bearer token' },
        body: JSON.stringify({ categories, updatedAt: '2026-03-15T12:00:00.000Z' }),
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(200)
      expect(putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: 'USER#123',
          SK: 'SETTINGS',
          categories,
          updatedAt: '2026-03-15T12:00:00.000Z',
        }),
      )
      const body = JSON.parse(res.body)
      expect(body.updatedAt).toBe('2026-03-15T12:00:00.000Z')
    })

    it('falls back to server time when no updatedAt provided', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      putItem.mockResolvedValue(undefined)
      const categories = [{ id: 'cat1', label: 'Custom' }]
      const event = {
        requestContext: { http: { method: 'PUT' } },
        headers: { authorization: 'Bearer token' },
        body: JSON.stringify({ categories }),
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(200)
      expect(putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: 'USER#123',
          SK: 'SETTINGS',
          categories,
          updatedAt: expect.any(String),
        }),
      )
    })
  })
})
