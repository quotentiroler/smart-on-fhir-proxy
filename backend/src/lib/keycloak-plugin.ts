import { Elysia } from 'elysia'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { validateToken } from './auth'
import { logger } from './logger'

/**
 * Plugin that adds Keycloak admin client decorator
 * Uses the user's token for admin operations - no backend credentials stored
 * This is a proxy pattern where admin permissions are controlled by Keycloak user roles
 */
export const keycloakPlugin = new Elysia()
  .decorate('getAdmin', async (userToken: string) => {
    try {
      logger.auth.debug('Validating user token for admin operations')
      // Validate the user's token and get payload
      const tokenPayload = await validateToken(userToken)
      logger.auth.debug('Token validated successfully', {
        sub: tokenPayload.sub,
        preferred_username: tokenPayload.preferred_username,
        email: tokenPayload.email,
        hasRealmAccess: !!tokenPayload.realm_access,
        hasResourceAccess: !!tokenPayload.resource_access
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
        logger.auth.warn('User does not have admin permissions', { 
          username: tokenPayload.preferred_username,
          realmRoles: realmRoles.slice(0, 5), // Log first 5 roles only
          isDevelopment 
        })
        if (!isDevelopment) {
          throw new Error('User does not have admin permissions')
        }
        logger.auth.warn('DEVELOPMENT: Proceeding despite missing admin role')
      }
      
      // Check for realm-management roles (needed for admin API)
      const hasRealmManagementRole = realmManagementRoles.length > 0
      if (!hasRealmManagementRole) {
        logger.auth.warn('User lacks realm-management roles, but proceeding in development', {
          username: tokenPayload.preferred_username,
          isDevelopment
        })
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
      
      logger.auth.debug('Keycloak admin client created successfully', {
        username: tokenPayload.preferred_username
      })
      return kcAdminClient
    } catch (error) {
      logger.auth.error('Error in keycloak plugin', { error })
      throw error
    }
  })
