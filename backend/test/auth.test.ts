import { describe, expect, it } from 'bun:test'
import { authRoutes } from '../src/routes/auth'

describe('Auth Routes', () => {
  it('should return auth config', async () => {
    const response = await authRoutes
      .handle(new Request('http://localhost/auth/config'))
      
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('keycloak')
    expect(data.keycloak).toHaveProperty('isConfigured')
    expect(typeof data.keycloak.isConfigured).toBe('boolean')
  })

  it('should handle keycloak configuration properly', async () => {
    const response = await authRoutes
      .handle(new Request('http://localhost/auth/config'))
      
    const data = await response.json()
    
    if (data.keycloak.isConfigured) {
      expect(data.keycloak.baseUrl).toBeDefined()
      expect(data.keycloak.realm).toBeDefined()
      expect(data.keycloak.authorizationEndpoint).toBeDefined()
    } else {
      expect(data.keycloak.baseUrl).toBeNull()
      expect(data.keycloak.realm).toBeNull()
      expect(data.keycloak.authorizationEndpoint).toBeNull()
    }
  })
})
