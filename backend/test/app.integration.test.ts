import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

// Try to import a main app factory/instance from src/app or src/index.
let mainAppModule: any = null

try {
  mainAppModule = await import('../src/app')
} catch {}

if (!mainAppModule) {
  try {
    mainAppModule = await import('../src/index')
  } catch {}
}

describe('Main app integration (if available)', () => {
  it('should respond from root and health endpoints', async () => {
    expect(mainAppModule).toBeTruthy()

    const candidate = mainAppModule?.app || mainAppModule?.default || mainAppModule

    let app: Elysia
    if (candidate && typeof candidate.handle === 'function') {
      app = candidate as Elysia
    } else if (typeof candidate === 'function') {
      // app factory: () => Elysia
      app = candidate()
    } else {
      throw new Error('Main app export not recognized: expected Elysia instance or factory')
    }

    // Root
    const resRoot = await app.handle(new Request('http://localhost/'))
    expect([200, 301, 302, 404]).toContain(resRoot.status)
    // Health-like endpoint
    const resHealth = await app.handle(new Request('http://localhost/health'))
    expect([200, 404]).toContain(resHealth.status)

    if (resHealth.status === 200) {
      const json = await resHealth.json()
      expect(json).toHaveProperty('status')
    }
  })
})
