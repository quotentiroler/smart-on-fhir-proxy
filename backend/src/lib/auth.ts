import jwt, { JwtPayload } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { config } from '../config'
import { AuthenticationError, ConfigurationError } from './admin-utils'
import { logger } from './logger'

// Only initialize JWKS client if Keycloak is configured
const jwks = config.keycloak.jwksUri ? jwksClient({ jwksUri: config.keycloak.jwksUri }) : null

async function getKey(header: jwt.JwtHeader) {
  try {
    if (!jwks) {
      throw new ConfigurationError('Keycloak is not configured - cannot validate tokens')
    }
    
    logger.auth.debug('Fetching signing key', { kid: header.kid, alg: header.alg })
    const key = await jwks.getSigningKey(header.kid!)
    logger.auth.debug('Successfully fetched signing key')
    return key.getPublicKey()
  } catch (error) {
    logger.auth.error('Failed to fetch signing key', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      kid: header.kid,
      jwksUri: config.keycloak.jwksUri
    })
    throw error
  }
}

/**
 * Validates a JWT token using Keycloak's public keys
 * @param token JWT token to validate
 * @returns Decoded token payload
 * @throws AuthenticationError for invalid/expired tokens
 */
export async function validateToken(token: string): Promise<JwtPayload> {
  try {
    logger.auth.debug('Starting token validation')
    
    // First decode without verification to check structure
    const decoded = jwt.decode(token, { complete: true }) as { header: jwt.JwtHeader; payload: JwtPayload }
    
    if (!decoded || !decoded.header) {
      logger.auth.warn('Token has invalid format - missing header')
      throw new AuthenticationError('Invalid token format')
    }
    
    logger.auth.debug('Token decoded successfully', { 
      alg: decoded.header.alg,
      typ: decoded.header.typ,
      kid: decoded.header.kid,
      issuer: decoded.payload?.iss,
      subject: decoded.payload?.sub,
      audience: decoded.payload?.aud
    })
    
    // Get the signing key
    const key = await getKey(decoded.header)
    
    // Verify the token
    logger.auth.debug('Verifying token with public key')
    const verified = jwt.verify(token, key) as JwtPayload
    logger.auth.debug('Token verified successfully')
    
    return verified
  } catch (error) {
    logger.auth.error('Token validation failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: (error as any)?.constructor?.name
    })
    
    // Check for specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError(`Invalid token: ${error.message}`)
    } else if (error instanceof jwt.NotBeforeError) {
      throw new AuthenticationError('Token not yet valid')
    } else if (error instanceof AuthenticationError) {
      // Re-throw authentication errors
      throw error
    } else {
      // For any other errors (e.g., JWKS fetch errors), throw as authentication error
      throw new AuthenticationError(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
