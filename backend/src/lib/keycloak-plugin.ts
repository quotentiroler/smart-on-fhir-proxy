import { Elysia } from 'elysia'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { validateToken } from './auth'

/**
 * Plugin that adds Keycloak admin client decorator
 * Uses the user's token instead of backend credentials
 */
export const keycloakPlugin = new Elysia()
  .decorate('getAdmin', async (userToken: string) => {
    // Validate the user's token first
    await validateToken(userToken)
    
    // Create admin client with user's token
    const kcAdminClient = new KcAdminClient({
      baseUrl: process.env.KEYCLOAK_BASE_URL!,
      realmName: process.env.KEYCLOAK_REALM!,
    })

    // Use the user's token instead of backend credentials
    kcAdminClient.setAccessToken(userToken)
    
    return kcAdminClient
  })
