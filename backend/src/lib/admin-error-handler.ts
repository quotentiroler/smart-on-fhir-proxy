import type { Context } from 'elysia'
import { AuthenticationError, UNAUTHORIZED_RESPONSE } from './admin-utils'
import { logger } from './logger'

/**
 * Centralized error handler for admin routes that use Keycloak
 * Handles authentication errors and Keycloak status code propagation
 */
export function handleAdminError(error: unknown, set: Context['set']) {
  logger.admin.error('Error in admin endpoint', { error })
  
  // Check if it's an authentication error
  if (error instanceof AuthenticationError) {
    logger.admin.warn('AuthenticationError detected, returning 401')
    set.status = 401
    return UNAUTHORIZED_RESPONSE
  }
  
  // Extract actual HTTP status from Keycloak response if available
  const errorObj = error as Record<string, unknown>;
  const response = errorObj?.response as Record<string, unknown> | undefined;
  const keycloakStatus = response?.status as number | undefined;
  
  if (keycloakStatus && typeof keycloakStatus === 'number') {
    logger.admin.warn(`Returning Keycloak status: ${keycloakStatus}`)
    set.status = keycloakStatus
    
    // Return appropriate response based on status
    if (keycloakStatus === 401) {
      return UNAUTHORIZED_RESPONSE
    } else if (keycloakStatus === 403) {
      return { error: 'Forbidden - Insufficient permissions' }
    } else {
      return { error: 'Keycloak error', details: error }
    }
  }
  
  // Fallback to 500 for unknown errors
  logger.admin.error('Unknown error, returning 500')
  set.status = 500
  return { error: 'Internal server error', details: error }
}

/**
 * Wrapper function for admin route handlers that automatically handles Keycloak errors
 */
export function withAdminErrorHandler<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Find the 'set' context object in the arguments
      const setContext = args.find(arg => 
        typeof arg === 'object' && 
        arg !== null && 
        'status' in arg
      ) as Context['set'] | undefined
      
      if (setContext) {
        return handleAdminError(error, setContext) as R
      } else {
        // If no set context found, just re-throw the error
        throw error
      }
    }
  }
}
