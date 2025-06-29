import { Elysia, t } from 'elysia'
import type { SmartConfiguration } from '../types'
import { smartConfigService } from '../lib/smart-config'

/**
 * SMART Discovery endpoints
 */
export const smartRoutes = new Elysia({ prefix: '/.well-known' })
  .get('/smart-configuration', async (): Promise<SmartConfiguration> => {
    return await smartConfigService.getSmartConfiguration()
  }, {
    response: t.Object({
      issuer: t.String({ description: 'OpenID Connect issuer URL' }),
      authorization_endpoint: t.String({ description: 'OAuth2 authorization endpoint' }),
      token_endpoint: t.String({ description: 'OAuth2 token endpoint' }),
      introspection_endpoint: t.String({ description: 'OAuth2 token introspection endpoint' }),
      code_challenge_methods_supported: t.Array(t.String({ description: 'Supported PKCE code challenge methods' })),
      grant_types_supported: t.Array(t.String({ description: 'Supported OAuth2 grant types' })),
      response_types_supported: t.Array(t.String({ description: 'Supported OAuth2 response types' })),
      scopes_supported: t.Array(t.String({ description: 'Supported OAuth2 scopes' })),
      capabilities: t.Array(t.String({ description: 'SMART on FHIR capabilities' })),
      token_endpoint_auth_methods_supported: t.Array(t.String({ description: 'Supported token endpoint authentication methods' })),
      token_endpoint_auth_signing_alg_values_supported: t.Array(t.String({ description: 'Supported signing algorithms for JWT-based client authentication' }))
    }),
    detail: {
      summary: 'SMART on FHIR Configuration',
      description: 'Get SMART on FHIR well-known configuration dynamically built from Keycloak OpenID configuration',
      tags: ['smart-apps'],
      response: { 200: { description: 'SMART on FHIR configuration object' } }
    }
  })
  .post('/smart-configuration/refresh', async () => {
    smartConfigService.clearCache()
    const freshConfig = await smartConfigService.getSmartConfiguration()
    return {
      message: 'SMART configuration cache refreshed',
      timestamp: new Date().toISOString(),
      config: freshConfig
    }
  }, {
    detail: {
      summary: 'Refresh SMART Configuration Cache',
      description: 'Manually refresh the cached SMART configuration from Keycloak',
      tags: ['admin', 'smart-apps'],
      response: { 200: { description: 'Cache refreshed successfully' } }
    }
  })
