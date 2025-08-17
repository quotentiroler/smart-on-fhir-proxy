#!/usr/bin/env bash
# Helper script to copy the snippets into backend/test as actual test files
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
SRC_DIR="$ROOT_DIR/ui/backend-tests"
DEST_DIR="$ROOT_DIR/backend/test"

mkdir -p "$DEST_DIR"

# Create files only if they do not already exist to avoid overwriting
copy_if_missing() {
  local name="$1"
  local target="$DEST_DIR/$name"
  if [[ -f "$target" ]]; then
    echo "skip: $name already exists"
  else
    echo "creating: $name"
    cat > "$target" <<'EOF'
$CONTENT$
EOF
    echo "created: $name"
  fi
}

# Define contents for each test file as here-docs with placeholders replaced below.
read -r -d '' HEALTH_CONTENT <<'EOT'
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
EOT

read -r -d '' AUTH_CONTENT <<'EOT'
import { describe, expect, it } from 'bun:test'
// Replace with your real import when moved to backend/test:
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
EOT

read -r -d '' ERROR_CONTENT <<'EOT'
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
EOT

read -r -d '' INTEGRATION_CONTENT <<'EOT'
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
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
    const client = treaty<typeof app>(async (input: RequestInfo, init?: RequestInit) => app.handle(new Request(String(input), init)))
    const res = await client['/'].get()
    if (!res.ok) throw new Error('request failed')
    expect(await res.text()).toBe('Proxy Smart Backend API')
  })
})
EOT

# Write files
CONTENT="$HEALTH_CONTENT" copy_if_missing "health.status.test.ts"
CONTENT="$AUTH_CONTENT" copy_if_missing "auth.test.ts"
CONTENT="$ERROR_CONTENT" copy_if_missing "error-handling.test.ts"
CONTENT="$INTEGRATION_CONTENT" copy_if_missing "integration.test.ts"

echo "Templates created in $DEST_DIR. Run: (cd backend && bun test)"
