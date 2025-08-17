import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

// App with a single defined route; requests to anything else should 404
const app = new Elysia().get('/exists', () => 'ok')

describe('Not Found behavior', () => {
  it('returns 404 for an unknown route', async () => {
    const res = await app.handle(new Request('http://localhost/missing'))
    expect(res.status).toBe(404)
  })

  it('returns 200 for defined route', async () => {
    const res = await app.handle(new Request('http://localhost/exists'))
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe('ok')
  })
})
