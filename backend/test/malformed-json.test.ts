import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

// Simple echo endpoint that returns parsed body
const app = new Elysia().post('/echo', ({ body }) => body)

describe('Malformed JSON handling', () => {
  it('returns client error for malformed JSON payloads', async () => {
    // Content-Type says JSON but body is invalid JSON
    const res = await app.handle(new Request('http://localhost/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'this is not valid json'
    }))

    // Framework should produce a 4xx error on invalid JSON
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('parses valid JSON correctly', async () => {
    const payload = { hello: 'world' }
    const res = await app.handle(new Request('http://localhost/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toMatchObject(payload)
  })
})
