import { Elysia } from 'elysia'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { validateToken } from './auth'

/**
 * Plugin that adds Keycloak admin client decorator
 * Uses the user's token for admin operations - no backend credentials stored
 * This is a proxy pattern where admin permissions are controlled by Keycloak user roles
 */
export const keycloakPlugin = new Elysia()
  .decorate('getAdmin', async (userToken: string) => {
    try {
      console.log('Keycloak plugin - validating token...')
      // Validate the user's token and get payload
      const tokenPayload = await validateToken(userToken)
      console.log('Token validated successfully, payload:', {
        sub: tokenPayload.sub,
        preferred_username: tokenPayload.preferred_username,
        email: tokenPayload.email,
        realm_access: tokenPayload.realm_access,
        resource_access: tokenPayload.resource_access
      })
      
      // Optional: Check if user has admin-related roles
      // Check both realm roles and client roles
      const realmRoles = tokenPayload.realm_access?.roles || []
      const clientRoles = tokenPayload.resource_access?.['admin-ui']?.roles || []
      const realmManagementRoles = tokenPayload.resource_access?.['realm-management']?.roles || []
      
      const hasAdminRole = 
        realmRoles.some((role: string) => 
          role.includes('admin') || role.includes('manage') || role.includes('realm-management')
        ) ||
        clientRoles.some((role: string) => 
          role.includes('admin') || role.includes('manage')
        ) ||
        realmManagementRoles.some((role: string) => 
          role.includes('admin') || role.includes('manage')
        )
      
      // Check if user has admin access to manage users
      // In development, we'll be more permissive
      const isDevelopment = process.env.NODE_ENV !== 'production'
      
      if (!hasAdminRole) {
        console.log('User does not have admin permissions')
        if (!isDevelopment) {
          throw new Error('User does not have admin permissions')
        }
        console.log('DEVELOPMENT: Proceeding despite missing admin role')
      }
      
      // Check for realm-management roles (needed for admin API)
      const hasRealmManagementRole = realmManagementRoles.length > 0
      if (!hasRealmManagementRole) {
        console.log('User lacks realm-management roles, but proceeding in development')
        if (!isDevelopment) {
          throw new Error('User does not have realm management permissions')
        }
      }
      
      // Create admin client with user's token
      const kcAdminClient = new KcAdminClient({
        baseUrl: process.env.KEYCLOAK_BASE_URL!,
        realmName: process.env.KEYCLOAK_REALM!,
      })

      // Use the user's token for admin operations
      kcAdminClient.setAccessToken(userToken)
      
      console.log('Keycloak admin client created successfully')
      return kcAdminClient
    } catch (error) {
      console.error('Error in keycloak plugin:', error)
      throw error
    }
  })
