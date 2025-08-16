import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'

// Create a minimal test app similar to the main app
const createTestApp = () => {
  return new Elysia()
    .get('/', () => 'Proxy Smart Backend API')
    .get('/health', () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }))
    .get('/hello', () => 'hi')
    .post('/echo', ({ body }) => body)
}

describe('Elysia Basic Tests', () => {
  const app = createTestApp()

  it('returns a response from root endpoint', async () => {
    const response = await app
      .handle(new Request('http://localhost/'))
      .then((res) => res.text())

    expect(response).toBe('Proxy Smart Backend API')
  })

  it('returns health status', async () => {
    const response = await app
      .handle(new Request('http://localhost/health'))
      .then((res) => res.json())

    expect(response.status).toBe('healthy')
    expect(response.timestamp).toBeDefined()
    expect(typeof response.uptime).toBe('number')
  })

  it('handles POST requests', async () => {
    const testData = { message: 'test' }
    const response = await app
      .handle(new Request('http://localhost/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      }))
      .then((res) => res.json())

    expect(response).toEqual(testData)
  })
})

describe('Eden Treaty Tests', () => {
  const app = createTestApp()
  const api = treaty(app)

  it('returns a response using Eden Treaty', async () => {
    const { data, error } = await api.hello.get()

    expect(error).toBeNull()
    expect(data).toBe('hi')
  })

  it('handles health check with Eden Treaty', async () => {
    const { data, error } = await api.health.get()

    expect(error).toBeNull()
    expect(data).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number)
    })
  })

  it('handles POST with Eden Treaty', async () => {
    const testPayload = { message: 'treaty test' }
    const { data, error } = await api.echo.post(testPayload)

    expect(error).toBeNull()
    expect(data).toEqual(testPayload)
  })
})
