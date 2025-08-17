import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { authRoutes } from '../src/routes/auth'

const ORIGINAL_FETCH = globalThis.fetch

describe('Auth route integration tests', () => {
  beforeEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
  })

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
  })

  it('GET /auth/config returns a keycloak object with isConfigured boolean when Keycloak is reachable', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })

    const res = await authRoutes.handle(new Request('http://localhost/auth/config'))

    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') || ''
    expect(ct.toLowerCase()).toContain('application/json')

    const data = await res.json()
    expect(data).toHaveProperty('keycloak')
    expect(data.keycloak).toHaveProperty('isConfigured')
    expect(typeof data.keycloak.isConfigured).toBe('boolean')

    if ('clientId' in data.keycloak && data.keycloak.clientId != null) {
      expect(typeof data.keycloak.clientId).toBe('string')
    }
  })

  it('GET /auth/config responds gracefully when Keycloak connectivity check throws', async () => {
    globalThis.fetch = async () => { throw new Error('network down') }

    const res = await authRoutes.handle(new Request('http://localhost/auth/config'))

    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') || ''
    expect(ct.toLowerCase()).toContain('application/json')

    const data = await res.json()
    expect(data).toHaveProperty('keycloak')
    expect(data.keycloak).toHaveProperty('isConfigured')
    expect(typeof data.keycloak.isConfigured).toBe('boolean')
  })
})
