import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

// Create an app that simulates an auth-protected endpoint by checking Authorization header
const createAuthApp = () =>
  new Elysia()
    .post('/secure', ({ headers }) => {
      const auth = headers.authorization
      if (!auth || auth !== 'Bearer secret') {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        })
      }

      return { success: true }
    })

describe('Auth-protected route behavior', () => {
  const app = createAuthApp()

  it('responds 401 when Authorization header is missing', async () => {
    const res = await app.handle(new Request('http://localhost/secure', { method: 'POST' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error', 'unauthorized')
  })

  it('responds 401 with wrong token', async () => {
    const res = await app.handle(new Request('http://localhost/secure', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' }
    }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error', 'unauthorized')
  })

  it('accepts valid Authorization header and returns protected payload', async () => {
    const res = await app.handle(new Request('http://localhost/secure', {
      method: 'POST',
      headers: { authorization: 'Bearer secret' }
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('success', true)
  })
})
