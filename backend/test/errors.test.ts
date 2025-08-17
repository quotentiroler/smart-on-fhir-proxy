import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

// Small app that exercises throwing, rejecting and custom Responses
const createErrApp = () =>
  new Elysia()
    .get('/throw', () => {
      // synchronous throw
      throw new Error('boom')
    })
    .get('/reject', async () => {
      // asynchronous rejection
      throw new Error('async boom')
    })
    .get('/custom', () => new Response('custom', { status: 418 }))

describe('Error handling tests', () => {
  const app = createErrApp()

  it('returns 500-like status when handler throws synchronously', async () => {
    const res = await app.handle(new Request('http://localhost/throw'))
    expect(res.status).toBeGreaterThanOrEqual(500)
  })

  it('returns 500-like status when handler throws asynchronously', async () => {
    const res = await app.handle(new Request('http://localhost/reject'))
    expect(res.status).toBeGreaterThanOrEqual(500)
  })

  it('propagates explicit Response objects from handlers', async () => {
    const res = await app.handle(new Request('http://localhost/custom'))
    expect(res.status).toBe(418)
    const text = await res.text()
    expect(text).toBe('custom')
  })
})
