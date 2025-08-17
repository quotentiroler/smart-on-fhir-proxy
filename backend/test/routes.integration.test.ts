import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

// Attempt to import real route modules and mount them to an Elysia app to ensure
// production route code is executed (increasing coverage of backend/src).

let importedAuth: any = null
let importedStatus: any = null

try {
  importedAuth = await import('../src/routes/auth')
} catch {}

try {
  importedStatus = await import('../src/routes/status')
} catch {}

const buildAppWithRoutes = () => {
  const app = new Elysia()

  // Mount status route module if it exports a plugin/Elysia instance
  if (importedStatus) {
    const mod = importedStatus
    // Common patterns: export const statusRoutes = new Elysia().get(...)
    // or export default new Elysia()..., or export a function that accepts app
    const plugin = mod.statusRoutes || mod.default || mod

    if (typeof plugin === 'function' && plugin.length >= 1) {
      // function (app: Elysia) => app
      plugin(app)
    } else if (plugin && typeof plugin.handle === 'function') {
      // Elysia instance
      app.use(plugin)
    }
  }

  if (importedAuth) {
    const mod = importedAuth
    const plugin = mod.authRoutes || mod.default || mod

    if (typeof plugin === 'function' && plugin.length >= 1) {
      plugin(app)
    } else if (plugin && typeof plugin.handle === 'function') {
      app.use(plugin)
    }
  }

  return app
}

describe('Route modules integration (mounted into test Elysia app)', () => {
  it('auth config endpoint should respond with keycloak info when auth route is available', async () => {
    expect(importedAuth).toBeTruthy()
    const app = buildAppWithRoutes()

    const res = await app.handle(new Request('http://localhost/auth/config'))
    // If the route isn't present, this will likely be 404 and fail, prompting correct path fixes
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toHaveProperty('keycloak')
    expect(data.keycloak).toHaveProperty('isConfigured')
    expect(typeof data.keycloak.isConfigured).toBe('boolean')
    if (data.keycloak.clientId != null) {
      expect(typeof data.keycloak.clientId).toBe('string')
    }
  })

  it('status endpoint should return health info when status route is available', async () => {
    expect(importedStatus).toBeTruthy()
    const app = buildAppWithRoutes()

    // Try common status paths
    const candidates = ['/status', '/health']
    let res: Response | null = null
    for (const path of candidates) {
      const r = await app.handle(new Request(`http://localhost${path}`))
      if (r.status !== 404) {
        res = r
        break
      }
    }

    expect(res).toBeTruthy()
    if (!res) return

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('status')
    expect(typeof data.status).toBe('string')
    expect(data).toHaveProperty('timestamp')
    expect(typeof data.timestamp).toBe('string')
    expect(data).toHaveProperty('uptime')
    expect(['number', 'string']).toContain(typeof data.uptime)

    if (data.services) {
      expect(data.services).toHaveProperty('keycloak')
      expect(data.services).toHaveProperty('fhir')
    }
  })
})
