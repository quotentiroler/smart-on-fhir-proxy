import { Elysia } from 'elysia'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { validateToken } from './auth'
import { logger } from './logger'
import { AuthenticationError, ConfigurationError } from './admin-utils'
import { config } from '../config'

/**
 * Plugin that adds Keycloak admin client decorator
 * Uses the user's token for admin operations - no backend credentials stored
 * This is a proxy pattern where admin permissions are controlled by Keycloak user roles
 */
export const keycloakPlugin = new Elysia()
  .decorate('getAdmin', async (userToken: string) => {
    try {
      // Check if Keycloak is configured
      if (!config.keycloak.isConfigured) {
        throw new ConfigurationError('Keycloak is not configured. Please configure Keycloak settings in the admin UI.')
      }

      logger.auth.debug('Keycloak plugin: Starting admin client creation', { tokenLength: userToken.length })
      logger.auth.debug('Validating user token for admin operations')
      // Validate the user's token and get payload
      const tokenPayload = await validateToken(userToken)
      logger.auth.debug('Token validated successfully', {
        sub: tokenPayload.sub,
        preferred_username: tokenPayload.preferred_username,
        email: tokenPayload.email,
        hasRealmAccess: !!tokenPayload.realm_access,
        hasResourceAccess: !!tokenPayload.resource_access,
        realmRoles: tokenPayload.realm_access?.roles || [],
        adminUiRoles: tokenPayload.resource_access?.['admin-ui']?.roles || [],
        realmManagementRoles: tokenPayload.resource_access?.['realm-management']?.roles || []
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
          throw new AuthenticationError('User does not have admin permissions')
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
          throw new AuthenticationError('User does not have realm management permissions')
        }
      }
      
      // Create admin client with user's token
      logger.auth.debug('Instantiating Keycloak admin client...')
      const kcAdminClient = new KcAdminClient({
        baseUrl: config.keycloak.baseUrl!,
        realmName: config.keycloak.realm!,
      })

      // Use the user's token for admin operations
      logger.auth.debug('Setting access token on admin client...')
      kcAdminClient.setAccessToken(userToken)
      
      logger.auth.debug('Keycloak admin client instantiated successfully', {
        username: tokenPayload.preferred_username,
        baseUrl: process.env.KEYCLOAK_BASE_URL,
        realm: process.env.KEYCLOAK_REALM
      })
      return kcAdminClient
    } catch (error) {
      logger.auth.error('Error in keycloak plugin', { error })
      
      // Re-throw configuration and authentication errors to preserve their type
      if (error instanceof ConfigurationError || error instanceof AuthenticationError) {
        throw error
      }
      
      // For other errors, check if they might be auth-related
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unauthorized') || 
          errorMessage.includes('Invalid token') ||
          errorMessage.includes('Token expired') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('401')) {
        throw new AuthenticationError(`Authentication failed: ${errorMessage}`);
      }
      
      // For all other errors, re-throw as-is
      throw error
    }
  })
