import { Elysia } from 'elysia'
import { oauthRoutes } from './oauth'
import { clientRegistrationRoutes } from './client-registration'
import { config } from '../../config'
import { checkKeycloakConnection, isKeycloakAccessible } from '../../init'
import { t } from 'elysia'

/**
 * Authentication routes - OAuth2 and Dynamic Client Registration
 */
export const authRoutes = new Elysia({ prefix: '/auth', tags: ['authentication'] })
  .get('/config', async () => {
    // Test Keycloak connection and update global state
    try {
      await checkKeycloakConnection(1);
    } catch (error) {
      // checkKeycloakConnection() throws on failure, but we want to continue
      // and return the current state (which will be false)
      console.warn('Keycloak connection check failed:', error);
    }
    
    const keycloakAvailable = isKeycloakAccessible()
    return {
      keycloak: {
        isConfigured: keycloakAvailable,
        baseUrl: keycloakAvailable ? config.keycloak.baseUrl : null,
        realm: keycloakAvailable ? config.keycloak.realm : null,
        authorizationEndpoint: keycloakAvailable 
          ? `${config.keycloak.publicUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/auth`
          : null,
        tokenEndpoint: keycloakAvailable
          ? `${config.keycloak.publicUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`
          : null
      }
    }
  }, {
    detail: {
      summary: 'Get authentication configuration',
      description: 'Returns the current authentication configuration status',
      tags: ['authentication']
    },
    response: t.Object({
      keycloak: t.Object({
        isConfigured: t.Boolean(),
        baseUrl: t.Union([t.String(), t.Null()]),
        realm: t.Union([t.String(), t.Null()]),
        authorizationEndpoint: t.Union([t.String(), t.Null()]),
        tokenEndpoint: t.Union([t.String(), t.Null()])
      })
    })
  })
  .use(oauthRoutes)
  .use(clientRegistrationRoutes)
