import { describe, expect, it } from 'bun:test'
import { Elysia, t } from 'elysia'

// Test validation and middleware functionality
const createValidationApp = () => {
  return new Elysia()
    .post('/validate-user', ({ body }) => {
      return { message: 'User created', data: body }
    }, {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' }),
        age: t.Optional(t.Number({ minimum: 0 }))
      })
    })
    .get('/headers', ({ headers }) => {
      return { 
        userAgent: headers['user-agent'],
        contentType: headers['content-type']
      }
    })
    .derive(({ headers }) => ({
      requestId: headers['x-request-id'] || 'no-id'
    }))
    .get('/request-id', ({ requestId }) => ({ requestId }))
}

describe('Validation Tests', () => {
  const app = createValidationApp()

  it('should validate required fields', async () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    }

    const response = await app.handle(new Request('http://localhost/validate-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validData)
    }))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toBe('User created')
    expect(data.data).toMatchObject(validData)
  })

  it('should reject invalid email format', async () => {
    const invalidData = {
      name: 'John Doe',
      email: 'invalid-email',
      age: 30
    }

    const response = await app.handle(new Request('http://localhost/validate-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData)
    }))

    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('should reject missing required fields', async () => {
    const incompleteData = {
      email: 'john@example.com'
      // missing name
    }

    const response = await app.handle(new Request('http://localhost/validate-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incompleteData)
    }))

    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('should handle optional fields', async () => {
    const dataWithoutAge = {
      name: 'Jane Doe',
      email: 'jane@example.com'
    }

    const response = await app.handle(new Request('http://localhost/validate-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataWithoutAge)
    }))

    expect(response.status).toBe(200)
  })
})

describe('Header and Context Tests', () => {
  const app = createValidationApp()

  it('should access headers', async () => {
    const response = await app.handle(new Request('http://localhost/headers', {
      headers: {
        'User-Agent': 'Test Agent',
        'Content-Type': 'application/json'
      }
    }))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.userAgent).toBe('Test Agent')
    expect(data.contentType).toBe('application/json')
  })

  it('should derive context values', async () => {
    const response = await app.handle(new Request('http://localhost/request-id', {
      headers: {
        'X-Request-ID': 'test-123'
      }
    }))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.requestId).toBe('test-123')
  })

  it('should handle missing derived values', async () => {
    const response = await app.handle(new Request('http://localhost/request-id'))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.requestId).toBe('no-id')
  })
})
