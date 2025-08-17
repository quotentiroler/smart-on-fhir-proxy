import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'

// Minimal integration-style app mirroring basic patterns
const createTestApp = () =>
  new Elysia()
    .get('/', () => 'Proxy Smart Backend API')
    .get('/health', () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }))
    .get('/hello', () => 'hi')
    .post('/echo', ({ body }) => body)

describe('Integration basics with Eden Treaty', () => {
  const app = createTestApp()
  const client = treaty(app)

  it('GET / returns text content', async () => {
    const res = await app.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe('Proxy Smart Backend API')
  })

  it('GET /health returns expected shape', async () => {
    const res = await app.handle(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('status', 'healthy')
    expect(typeof json.timestamp).toBe('string')
    expect(typeof json.uptime).toBe('number')
  })

  it('eden treaty client can call hello and echo', async () => {
    const hello = await client.hello.get()
    expect(hello.data).toBe('hi')

    const echo = await client.echo.post({ message: 'ping' })
    expect(echo.data).toEqual({ message: 'ping' })
  })
})
