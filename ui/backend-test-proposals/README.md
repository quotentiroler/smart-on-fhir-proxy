# Backend Test Recipes to Raise Coverage (Bun + Elysia + Eden Treaty)

This document contains ready-to-copy test files designed to raise backend test coverage toward 80% using Bun’s test runner, Elysia, and Eden Treaty. Copy each snippet into `backend/test/<name>.test.ts` and adapt imports to your project’s structure.

Important
- Replace placeholder imports (e.g., `import { app } from '../src/app'`) to point to your actual app or route modules.
- Prefer importing your real app/routes to cover actual code. The inline “mini apps” are included only when you need isolated, deterministic examples.
- Bun’s test runner does not expose `vi`. If your project uses Vitest, adapt the mocking notes accordingly. In these samples, we use `globalThis.fetch` stubbing for portability.

How to run
- Add files under `backend/test/*.test.ts`.
- Run: `bun test`.
- Coverage (if enabled in your setup): `bun test --coverage`.

---

1) status-and-health.test.ts
Purpose: Validate basic health/status endpoints and shape. Import your real app/routes if available.

Place as: backend/test/status-and-health.test.ts

```ts
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

// Option A (preferred): import your real app or status router
// import { app as realApp } from '../src/index' // or wherever your app/export lives

// Option B: minimal test app (use only if your real app export isn’t easily accessible)
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

describe('Health & Status routes', () => {
  // const app = realApp
  const app = createTestStatusApp()

  it('GET /health returns expected shape', async () => {
    const res = await app.handle(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('status', 'healthy')
    expect(typeof body.timestamp).toBe('string')
    expect(typeof body.uptime).toBe('number')
  })

  it('GET /status includes services object', async () => {
    const res = await app.handle(new Request('http://localhost/status'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.version).toBe('string')
    expect(body.services).toBeDefined()
    expect(body.services).toHaveProperty('keycloak')
    expect(body.services).toHaveProperty('fhir')
  })
})
```

---

2) auth-config.test.ts
Purpose: Exercise auth route behavior and branches (configured/unconfigured). This assumes your project exports `authRoutes` or a similar router.

Place as: backend/test/auth-config.test.ts

```ts
import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { authRoutes } from '../src/routes/auth'

const ORIGINAL_ENV = { ...process.env }

describe('Auth Routes - config', () => {
  beforeEach(() => {
    // Optionally tweak env to simulate configured/unconfigured setups
    // process.env.KEYCLOAK_URL = ''
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('returns auth config shape with boolean fields', async () => {
    const response = await authRoutes.handle(new Request('http://localhost/auth/config'))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('keycloak')
    expect(typeof data.keycloak.isConfigured).toBe('boolean')
  })

  it('stable under missing/partial config', async () => {
    // Simulate missing configuration if your route reads env
    // delete process.env.KEYCLOAK_URL

    const response = await authRoutes.handle(new Request('http://localhost/auth/config'))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(typeof data.keycloak.isConfigured).toBe('boolean')
  })
})
```

---

3) middleware-error.test.ts
Purpose: Validate middleware/hook error handling paths. Uses Elysia’s onBeforeHandle hook.

Place as: backend/test/middleware-error.test.ts

```ts
import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

const createErrorMiddlewareApp = () =>
  new Elysia()
    .onBeforeHandle(({ path }) => {
      if (path === '/boom') throw new Error('boom')
    })
    .get('/boom', () => 'unreachable')
    .get('/ok', () => ({ ok: true }))

describe('Middleware error handling', () => {
  const app = createErrorMiddlewareApp()

  it('returns 500 when a hook throws', async () => {
    const res = await app.handle(new Request('http://localhost/boom'))
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(typeof text).toBe('string')
  })

  it('normal flow unaffected when hook does not throw', async () => {
    const res = await app.handle(new Request('http://localhost/ok'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })
})
```

Note: If your app has a custom error handler that transforms errors differently, align assertions with your format (e.g., `{ error, message, code }`).

---

4) validation.test.ts
Purpose: Test request validation using Elysia’s schema support. Ensures invalid payloads produce 400 and valid payloads pass.

Place as: backend/test/validation.test.ts

```ts
import { describe, it, expect } from 'bun:test'
import { Elysia, t } from 'elysia'

const createValidationApp = () =>
  new Elysia()
    .post(
      '/echo',
      ({ body }) => body,
      {
        body: t.Object({
          name: t.String(),
          age: t.Optional(t.Number({ minimum: 0 }))
        })
      }
    )

describe('Validation and body handling', () => {
  const app = createValidationApp()

  it('returns 400 for invalid JSON body', async () => {
    const res = await app.handle(
      new Request('http://localhost/echo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json'
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await app.handle(
      new Request('http://localhost/echo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      })
    )
    expect(res.status).toBe(400)
  })

  it('echos valid JSON body', async () => {
    const res = await app.handle(
      new Request('http://localhost/echo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Alice', age: 30 })
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ name: 'Alice', age: 30 })
  })
})
```

---

5) integration-mocked-services.test.ts
Purpose: Integration-style tests that mock upstream fetch and exercise error handling policies deterministically.

Place as: backend/test/integration-mocked-services.test.ts

```ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Elysia } from 'elysia'

const createExternalCallApp = () =>
  new Elysia().get('/external', async () => {
    const resp = await fetch('https://external.service/whoami')
    if (!resp.ok)
      return new Response(
        JSON.stringify({ error: 'upstream_unavailable' }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      )
    const json = await resp.json()
    return new Response(
      JSON.stringify({ upstream: json }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  })

describe('Integration tests with mocked fetch', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('handles upstream successful response', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: 'user-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })

    const app = createExternalCallApp()
    const res = await app.handle(new Request('http://localhost/external'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.upstream).toHaveProperty('id', 'user-1')
  })

  it('maps non-200 upstream to 502', async () => {
    globalThis.fetch = async () => new Response('down', { status: 503 })

    const app = createExternalCallApp()
    const res = await app.handle(new Request('http://localhost/external'))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body).toEqual({ error: 'upstream_unavailable' })
  })
})
```

---

6) eden-treaty-client.test.ts
Purpose: Demonstrate Eden Treaty usage to hit real routes in a type-safe manner. Prefer importing your real app.

Place as: backend/test/eden-treaty-client.test.ts

```ts
import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'

// Option A (preferred):
// import { app as realApp } from '../src/index'

// Option B: minimal app for illustration only
const createApp = () =>
  new Elysia()
    .get('/hello', () => 'hi')
    .post('/echo', ({ body }) => body)

// const app = realApp
const app = createApp()
const client = treaty(app)

describe('Eden Treaty client integration', () => {
  it('GET /hello returns hi', async () => {
    const { data, error } = await client.hello.get()
    expect(error).toBeNull()
    expect(data).toBe('hi')
  })

  it('POST /echo echoes body', async () => {
    const payload = { foo: 'bar' }
    const { data, error } = await client.echo.post(payload)
    expect(error).toBeNull()
    expect(data).toEqual(payload)
  })
})
```

---

Patterns and suggestions

- Import the real app or route modules wherever possible to cover actual backend code paths.
- Always set `content-type: application/json` when sending JSON bodies to avoid ambiguous parser behavior.
- Prefer deterministic assertions. Avoid broad status checks; assert the exact expected status and shape.
- Mock network calls via `globalThis.fetch` in tests; never hit the real network.
- Exercise both happy and error branches (400, 401/403 if applicable, 500). Don’t forget middleware, guards, and schema failures.
- If routes depend on environment variables, temporarily set/clear them in tests and restore afterward.

Quick checklist to reach ~80% coverage
- Add the five/six tests above (status, auth-config, middleware errors, validation, mocked integration, and eden treaty).
- Add small unit tests for utilities in `backend/src/utils/*`.
- Test error branches where you parse/transform upstream responses.
- Add tests for auth/permission middleware paths (allow vs deny).
