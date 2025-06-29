import jwt, { JwtPayload } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { config } from '../config'

const jwks = jwksClient({ jwksUri: config.keycloak.jwksUri })

async function getKey(header: jwt.JwtHeader) {
  const key = await jwks.getSigningKey(header.kid!)
  return key.getPublicKey()
}

/**
 * Validates a JWT token using Keycloak's public keys
 */
export async function validateToken(token: string): Promise<JwtPayload> {
  const decoded = jwt.decode(token, { complete: true }) as { header: jwt.JwtHeader }
  const key = await getKey(decoded.header)
  return jwt.verify(token, key) as JwtPayload
}
