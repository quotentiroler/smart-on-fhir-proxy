import { Elysia, t } from 'elysia'
import fetch, { Headers } from 'cross-fetch'
import { validateToken } from '../lib/auth'
import { config } from '../config'
import { validateFHIRVersion, getFHIRServerInfo, clearFHIRMetadataCache } from '../lib/fhir-utils'
import { ErrorResponse } from '../schemas/common'
import type { SmartConfiguration } from '../types'

/**
 * FHIR proxy routes with authentication and CORS support
 * 
 * Route Structure: /v/:fhir_release/fhir/*
 * - Client specifies version (e.g., /v/R4/fhir/Patient/123)
 * - We detect server's actual version (4.0.1 → R4, 5.0.0 → R5)
 * - Proxy requests use server's normalized version
 * - Response URLs maintain client's requested version for consistency
 * 
 * Performance Features:
 * - FHIR server info is cached for 5 minutes to avoid repeated metadata calls
 * - Cache is pre-warmed on server startup for faster first requests
 * - Version normalization: "4.0.1" → "R4", "5.0.0" → "R5"
 * - Fallback handling: continues working even if FHIR server is temporarily unavailable
 * - Admin cache refresh endpoint for manual cache management
 */
export const fhirRoutes = new Elysia({ prefix: '/v/:fhir_release/fhir', tags: ['fhir'] })
  // SMART on FHIR Configuration endpoint
  .get('/.well-known/smart-configuration', (): SmartConfiguration => ({
    issuer: `${config.baseUrl}/.well-known/openid-configuration`,
    authorization_endpoint: `${config.baseUrl}/auth/authorize`,
    token_endpoint: `${config.baseUrl}/auth/token`,
    introspection_endpoint: `${config.baseUrl}/auth/introspect`,
    code_challenge_methods_supported: ['S256'],
    grant_types_supported: ['authorization_code', 'client_credentials'],
    response_types_supported: ['code'],
    scopes_supported: ['openid', 'profile', 'launch', 'launch/patient', 'offline_access', 'patient/*.read', 'user/*.read', 'system/*.read'],
    capabilities: ['launch-ehr', 'launch-standalone', 'client-public', 'client-confidential-symmetric', 'client-confidential-asymmetric', 'sso-openid-connect', 'context-standalone-patient'],
    token_endpoint_auth_methods_supported: ['private_key_jwt', 'client_secret_basic', 'client_secret_post'],
    token_endpoint_auth_signing_alg_values_supported: ['ES384', 'RS384', 'RS256']
  }), {
    params: t.Object({
      fhir_release: t.String({ description: 'FHIR version (e.g., R4, R5)' })
    }),
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
      token_endpoint_auth_signing_alg_values_supported: t.Array(t.String({ description: 'Supported JWT signing algorithms for token endpoint auth' }))
    }),
    detail: {
      summary: 'SMART on FHIR Configuration',
      description: 'Get SMART on FHIR well-known configuration for this FHIR endpoint',
      tags: ['fhir'],
      response: { 200: { description: 'SMART on FHIR configuration object' } }
    }
  })
  // CORS preflight
  .options('/*', ({ set }) => {
    set.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    return ''
  }, {
    params: t.Object({
      fhir_release: t.String({ description: 'FHIR version (e.g., R4, R5)' })
    }),
    detail: {
      summary: 'FHIR CORS Preflight',
      description: 'Handle CORS preflight requests for FHIR endpoints',
      tags: ['fhir'],
      response: { 200: { description: 'CORS preflight response' } }
    }
  })
  
  // Root FHIR path - serve the FHIR server base URL content
  .get('/', async ({ params, set }: { 
    params: { fhir_release: string }, 
    set: { status: number, headers: Record<string, string> } 
  }) => {
    try {
      const target = config.fhir.serverBase // Already includes /baseR4
      
      const headers = new Headers()
      headers.set('accept', 'application/fhir+json')
      
      const resp = await fetch(target, {
        method: 'GET',
        headers
      })
      
      set.status = resp.status
      resp.headers.forEach((v: string, k: string) => {
        if (k.match(/content-type|etag/)) {
          set.headers = { ...set.headers, [k]: v }
        }
      })
      
      // Set CORS headers
      set.headers['Access-Control-Allow-Origin'] = '*'
      set.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
      set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
      
      const text = await resp.text()
      // Rewrite URLs to use our proxy base URL
      const body = text.replaceAll(
        config.fhir.serverBase,
        `${config.baseUrl}/v/${params.fhir_release}/fhir`
      )
      return body
    } catch (error) {
      set.status = 500
      return { error: 'Failed to serve FHIR server base URL', details: error }
    }
  }, {
    params: t.Object({
      fhir_release: t.String({ description: 'FHIR version (e.g., R4, R5)' })
    }),
    response: {
      200: t.Any({ description: 'FHIR server base response' }),
      500: ErrorResponse
    },
    detail: {
      summary: 'FHIR Server Base URL',
      description: 'Serve the content from the FHIR server base URL',
      tags: ['fhir'],
      response: { 
        200: { description: 'FHIR server base response' },
        500: { description: 'Failed to serve FHIR server content' }
      }
    }
  })

  // all other methods
  .all('/*', async ({ params, request, set }: { 
    params: { fhir_release: string }, 
    request: Request, 
    set: { status: number, headers: Record<string, string> } 
  }) => {
    try {
      // Validate that we can handle the client's requested version
      const isValidVersion = await validateFHIRVersion(params.fhir_release)
      if (!isValidVersion) {
        set.status = 400
        return { error: `Unsupported FHIR version: ${params.fhir_release}. Server info available at /v/${params.fhir_release}/fhir/server-info` }
      }

      // Get the server's actual FHIR version (cached, so this is fast)
      const serverInfo = await getFHIRServerInfo()
      const actualFhirVersion = serverInfo.fhirVersion

      // Warn if client requested different version than server supports (but only once per version)
      if (params.fhir_release !== actualFhirVersion) {
        console.warn(`Client requested FHIR ${params.fhir_release} but server supports ${actualFhirVersion}. Using server version.`)
      }

      // Authentication check (skip for metadata endpoint)
      if (request.method !== 'GET' || !request.url.endsWith('/metadata')) {
        const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/, '')
        if (!auth) {
          set.status = 401
          return { error: 'Authentication required' }
        }
        await validateToken(auth)
      }

      // Use the server's base URL directly since it already includes the version
      const path = request.url.replace(/^.*?\/v\/[^/]+\/fhir/, '') || ''
      const target = `${config.fhir.serverBase}${path}`
      const headers = new Headers()
      request.headers.forEach((v: string, k: string) => k !== 'host' && k !== 'connection' && headers.set(k, v!))
      headers.set('accept', 'application/fhir+json')

      const resp = await fetch(target, {
        method: request.method,
        headers,
        body: ['POST', 'PUT', 'PATCH'].includes(request.method) ? await request.text() : undefined
      })

      // copy status & headers
      set.status = resp.status
      resp.headers.forEach((v: string, k: string) => {
        if (k.match(/content-type|etag|location/)) {
          set.headers = { ...set.headers, [k]: v }
        }
      })
      
      // Set CORS headers
      set.headers['Access-Control-Allow-Origin'] = '*'
      set.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
      set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'

      // rewrite any base-URL in JSON payload to use client-requested version in response URLs
      const text = await resp.text()
      const body = text.replaceAll(
        config.fhir.serverBase,
        `${config.baseUrl}/v/${params.fhir_release}/fhir`
      )
      return body
    } catch (error) {
      console.error('FHIR proxy error:', error)
      set.status = 500
      return { error: 'Failed to proxy FHIR request', details: error }
    }
  }, {
    response: t.Any(),
    detail: {
      summary: 'FHIR Resource Proxy',
      description: 'Proxy authenticated FHIR requests to the upstream FHIR server',
      tags: ['fhir'],
      security: [{ BearerAuth: [] }],
      response: { 
        200: { description: 'FHIR resource response' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Invalid token' },
        404: { description: 'Resource not found' }
      }
    }
  })
  // Admin endpoint to refresh FHIR server cache
  .post('/cache/refresh', async ({ set, headers }) => {
    // Require authentication for cache management
    const auth = headers.authorization?.replace('Bearer ', '')
    if (!auth) {
      set.status = 401
      return { error: 'Authentication required' }
    }
    
    try {
      await validateToken(auth)
      
      // Clear cache and fetch fresh data
      clearFHIRMetadataCache()
      const serverInfo = await getFHIRServerInfo()
      
      return {
        success: true,
        message: 'FHIR server cache refreshed successfully',
        serverInfo
      }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to refresh FHIR server cache', details: error }
    }
  }, {
    params: t.Object({
      fhir_release: t.String({ description: 'FHIR version (e.g., R4, R5)' })
    }),
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether refresh was successful' }),
        message: t.String({ description: 'Success message' }),
        serverInfo: t.Object({
          fhirVersion: t.String({ description: 'FHIR version supported by server' }),
          serverVersion: t.Optional(t.String({ description: 'Server software version' })),
          serverName: t.Optional(t.String({ description: 'Server software name' })),
          supported: t.Boolean({ description: 'Whether this version is supported' })
        })
      }),
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Refresh FHIR Server Cache',
      description: 'Clear and refresh the cached FHIR server information',
      tags: ['fhir'],
      security: [{ BearerAuth: [] }],
      response: { 
        200: { description: 'Cache refreshed successfully' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Invalid token' },
        500: { description: 'Failed to refresh cache' }
      }
    }
  })
