import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/auth.js', () => ({
  authenticate: vi.fn(),
}))

vi.mock('../lib/dynamo.js', () => ({
  queryItems: vi.fn(),
  putItem: vi.fn(),
  deleteItem: vi.fn(),
}))

import { authenticate } from '../lib/auth.js'
import { queryItems, putItem, deleteItem } from '../lib/dynamo.js'
import { handler } from '../handlers/days.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('days handler', () => {
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
    it('returns days in date range with updatedAt', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      queryItems.mockResolvedValue([
        { PK: 'USER#123', SK: 'DAY#2026-03-01', log: { 'dr-1on1': 2 }, updatedAt: '2026-03-01T10:00:00.000Z' },
        { PK: 'USER#123', SK: 'DAY#2026-03-02', log: { misc: 1 }, updatedAt: '2026-03-02T10:00:00.000Z' },
      ])
      const event = {
        requestContext: { http: { method: 'GET' } },
        headers: { authorization: 'Bearer token' },
        queryStringParameters: { from: '2026-03-01', to: '2026-03-31' },
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toHaveLength(2)
      expect(body[0].date).toBe('2026-03-01')
      expect(body[0].log).toEqual({ 'dr-1on1': 2 })
      expect(body[0].updatedAt).toBe('2026-03-01T10:00:00.000Z')
      expect(body[1].updatedAt).toBe('2026-03-02T10:00:00.000Z')
    })

    it('returns null updatedAt for items without it', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      queryItems.mockResolvedValue([
        { PK: 'USER#123', SK: 'DAY#2026-03-01', log: { 'dr-1on1': 2 } },
      ])
      const event = {
        requestContext: { http: { method: 'GET' } },
        headers: { authorization: 'Bearer token' },
        queryStringParameters: { from: '2026-03-01', to: '2026-03-31' },
      }
      const res = await handler(event)
      const body = JSON.parse(res.body)
      expect(body[0].updatedAt).toBeNull()
    })

    it('returns 400 when missing query params', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      const event = {
        requestContext: { http: { method: 'GET' } },
        headers: { authorization: 'Bearer token' },
        queryStringParameters: {},
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when queryStringParameters is null', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      const event = {
        requestContext: { http: { method: 'GET' } },
        headers: { authorization: 'Bearer token' },
        queryStringParameters: null,
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(400)
    })
  })

  describe('PUT', () => {
    it('saves a day log with client updatedAt', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      putItem.mockResolvedValue(undefined)
      const event = {
        requestContext: { http: { method: 'PUT' } },
        headers: { authorization: 'Bearer token' },
        pathParameters: { date: '2026-03-15' },
        body: JSON.stringify({ log: { 'dr-1on1': 2 }, updatedAt: '2026-03-15T12:00:00.000Z' }),
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(200)
      expect(putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: 'USER#123',
          SK: 'DAY#2026-03-15',
          log: { 'dr-1on1': 2 },
          updatedAt: '2026-03-15T12:00:00.000Z',
        }),
      )
      const body = JSON.parse(res.body)
      expect(body.updatedAt).toBe('2026-03-15T12:00:00.000Z')
    })

    it('falls back to server time when no updatedAt provided', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      putItem.mockResolvedValue(undefined)
      const event = {
        requestContext: { http: { method: 'PUT' } },
        headers: { authorization: 'Bearer token' },
        pathParameters: { date: '2026-03-15' },
        body: JSON.stringify({ log: { 'dr-1on1': 2 } }),
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(200)
      expect(putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: 'USER#123',
          SK: 'DAY#2026-03-15',
          log: { 'dr-1on1': 2 },
          updatedAt: expect.any(String),
        }),
      )
      const body = JSON.parse(res.body)
      expect(body.updatedAt).toEqual(expect.any(String))
    })

    it('returns 400 when missing date parameter', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      const event = {
        requestContext: { http: { method: 'PUT' } },
        headers: { authorization: 'Bearer token' },
        pathParameters: {},
        body: JSON.stringify({ log: {} }),
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(400)
    })
  })

  describe('DELETE', () => {
    it('deletes a day log', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      deleteItem.mockResolvedValue(undefined)
      const event = {
        requestContext: { http: { method: 'DELETE' } },
        headers: { authorization: 'Bearer token' },
        pathParameters: { date: '2026-03-15' },
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(200)
      expect(deleteItem).toHaveBeenCalledWith({
        PK: 'USER#123',
        SK: 'DAY#2026-03-15',
      })
    })

    it('returns 400 when missing date parameter', async () => {
      authenticate.mockResolvedValue({ sub: '123', email: 'test@example.com' })
      const event = {
        requestContext: { http: { method: 'DELETE' } },
        headers: { authorization: 'Bearer token' },
        pathParameters: {},
      }
      const res = await handler(event)
      expect(res.statusCode).toBe(400)
    })
  })
})
