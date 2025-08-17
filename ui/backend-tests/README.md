# Backend Test Templates (copy into backend/test)

This folder provides copy-paste test snippets to raise backend coverage for a Bun + Elysia API using Eden Treaty for typed clients. We intentionally do NOT place TypeScript test files here to avoid impacting the UI package build.

How to use

1) Create backend/test if it does not exist:

   mkdir -p backend/test

2) Create the following files inside backend/test with the provided contents.

3) Adjust imports to your actual backend modules (e.g., ../src/routes/auth) and run:

   cd backend
   bun test

Snippets

1. health.status.test.ts

import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

const createTestStatusApp = () =>
  new Elysia()
    .get('/health', () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }))
    .get('/status', () => ({
      status: 'healthy',
      version: '0.0.1-test',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: { keycloak: 'unknown', fhir: 'unknown' }
    }))

describe('Health/Status Routes', () => {
  const app = createTestStatusApp()

  it('GET /health returns expected shape and types', async () => {
    const res = await app.handle(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ status: 'healthy' })
    expect(typeof body.timestamp).toBe('string')
    expect(typeof body.uptime).toBe('number')
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false)
  })

  it('GET /status returns expected fields', async () => {
    const res = await app.handle(new Request('http://localhost/status'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('version')
    expect(body).toHaveProperty('services')
    expect(body.services).toHaveProperty('keycloak')
    expect(body.services).toHaveProperty('fhir')
  })
})

2. auth.test.ts

import { describe, expect, it } from 'bun:test'
// Replace this with your real import when in backend/test:
// import { authRoutes } from '../src/routes/auth'

describe('Auth Routes', () => {
  it('should return auth config with keycloak details', async () => {
    const authRoutes = { handle: async () => new Response(JSON.stringify({ keycloak: { isConfigured: false } }), { status: 200 }) }
    const res = await authRoutes.handle(new Request('http://localhost/auth/config'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data?.keycloak?.isConfigured).toBe('boolean')
  })

  it('should tolerate missing or null keycloak config', async () => {
    const authRoutes = { handle: async () => new Response(JSON.stringify({ keycloak: null }), { status: 200 }) }
    const res = await authRoutes.handle(new Request('http://localhost/auth/config'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect('keycloak' in data).toBe(true)
    expect(data.keycloak === null || typeof data.keycloak === 'object').toBe(true)
  })
})

3. error-handling.test.ts

import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

const createErrorApp = () =>
  new Elysia()
    .get('/throw-sync', () => { throw new Error('sync-failure') })
    .get('/throw-async', async () => { throw new Error('async-failure') })

describe('Error handling', () => {
  const app = createErrorApp()

  it('sync error returns 5xx with a body', async () => {
    const res = await app.handle(new Request('http://localhost/throw-sync'))
    expect(res.status).toBeGreaterThanOrEqual(500)
    expect(res.status).toBeLessThan(600)
    const text = await res.text()
    expect(text.length).toBeGreaterThan(0)
  })

  it('async error returns 5xx with a body', async () => {
    const res = await app.handle(new Request('http://localhost/throw-async'))
    expect(res.status).toBeGreaterThanOrEqual(500)
    expect(res.status).toBeLessThan(600)
    const text = await res.text()
    expect(text.length).toBeGreaterThan(0)
  })
})

4. integration.test.ts

import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
// Eden Treaty is a client helper; do not use it as middleware.
import { treaty } from '@elysiajs/eden'

const createIntegrationApp = () =>
  new Elysia()
    .get('/', () => 'Proxy Smart Backend API')
    .post('/echo', ({ body }) => body)
    .post('/validate', ({ body }) => {
      if (!body || typeof body.name !== 'string') {
        return new Response(JSON.stringify({ error: 'invalid' }), { status: 400, headers: { 'content-type': 'application/json' } })
      }
      return { ok: true, name: body.name }
    })

describe('Integration routes', () => {
  const app = createIntegrationApp()

  it('GET / returns welcome text', async () => {
    const res = await app.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Proxy Smart Backend API')
  })

  it('POST /echo echos JSON body', async () => {
    const payload = { msg: 'hello' }
    const res = await app.handle(new Request('http://localhost/echo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(payload)
  })

  it('POST /validate validates payload', async () => {
    const bad = await app.handle(new Request('http://localhost/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }))
    expect(bad.status).toBe(400)

    const good = await app.handle(new Request('http://localhost/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Tester' }) }))
    expect(good.status).toBe(200)
    expect(await good.json()).toEqual({ ok: true, name: 'Tester' })
  })

  it('Optional: Call via Eden Treaty client', async () => {
    // Treaty can call an in-memory app during tests by passing a fetch-like function
    const client = treaty<typeof app>(async (input: RequestInfo, init?: RequestInit) => app.handle(new Request(String(input), init)))
    const res = await client['/'].get()
    if (!res.ok) throw new Error('request failed')
    expect(await res.text()).toBe('Proxy Smart Backend API')
  })
})

Tips to raise coverage quickly

- Mount your real route modules instead of the inline examples above and hit all success and failure paths.
- Add tests for 401/403/404 and malformed JSON bodies.
- Mock external services (Keycloak, FHIR) deterministically.
- Cover middleware and schema validation logic explicitly.
