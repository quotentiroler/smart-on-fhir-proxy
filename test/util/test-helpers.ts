import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * Utility functions for SMART Backend Services testing
 */

/**
 * Generate a unique JWT ID (jti)
 */
export function generateJti(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a test RSA key pair for JWT signing
 */
export function generateTestKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { privateKey, publicKey };
}

/**
 * Create a client assertion JWT for SMART Backend Services
 */
export function createClientAssertion(
  clientId: string,
  tokenEndpoint: string,
  privateKey: string,
  algorithm: string = 'RS384'
): string {
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientId,
    sub: clientId,
    aud: tokenEndpoint,
    jti: generateJti(),
    exp: now + 300, // 5 minutes
    iat: now
  };

  return jwt.sign(payload, privateKey, {
    algorithm: algorithm as jwt.Algorithm,
    header: {
      typ: 'JWT',
      alg: algorithm
    }
  });
}

/**
 * Test helper to validate SMART configuration response
 */
export function validateSmartConfiguration(config: any): void {
  const requiredFields = [
    'token_endpoint',
    'grant_types_supported',
    'token_endpoint_auth_methods_supported',
    'scopes_supported',
    'capabilities'
  ];

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required field in SMART configuration: ${field}`);
    }
  }

  if (!config.grant_types_supported.includes('client_credentials')) {
    throw new Error('SMART configuration must support client_credentials grant type');
  }

  if (!config.token_endpoint_auth_methods_supported.includes('private_key_jwt')) {
    throw new Error('SMART configuration must support private_key_jwt authentication method');
  }

  if (!config.capabilities.includes('client-confidential-asymmetric')) {
    throw new Error('SMART configuration must support client-confidential-asymmetric capability');
  }
}

/**
 * Test helper to validate token response
 */
export function validateTokenResponse(tokenResponse: any): void {
  const requiredFields = ['access_token', 'token_type', 'expires_in'];
  
  for (const field of requiredFields) {
    if (!tokenResponse[field]) {
      throw new Error(`Missing required field in token response: ${field}`);
    }
  }

  if (tokenResponse.token_type !== 'Bearer') {
    throw new Error('Token type must be Bearer');
  }

  if (typeof tokenResponse.expires_in !== 'number' || tokenResponse.expires_in <= 0) {
    throw new Error('expires_in must be a positive number');
  }
}

/**
 * Test helper to validate FHIR Bundle response
 */
export function validateFhirBundle(bundle: any): void {
  if (bundle.resourceType !== 'Bundle') {
    throw new Error('Response must be a FHIR Bundle');
  }

  if (!['searchset', 'collection', 'transaction-response', 'batch-response'].includes(bundle.type)) {
    throw new Error('Bundle type must be one of: searchset, collection, transaction-response, batch-response');
  }

  if (bundle.entry && !Array.isArray(bundle.entry)) {
    throw new Error('Bundle entry must be an array');
  }
}
