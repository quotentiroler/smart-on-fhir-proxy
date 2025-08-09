import { Elysia, t } from 'elysia'
import fetch, { Headers } from 'cross-fetch'
import { validateToken } from '../lib/auth'
import { config } from '../config'
import { fhirServerStore, getServerByName, getServerInfoByName } from '../lib/fhir-server-store'
import { ErrorResponse } from '../schemas/common'
import { smartConfigService } from '../lib/smart-config'
import { logger } from '../lib/logger'
import { fetchWithMtls, getMtlsConfig } from './fhir-servers'
import type { SmartConfiguration } from '../types'

async function proxyFHIR({ params, request, set }: { 
  params: { server_name: string, fhir_version: string }, 
  request: Request, 
  set: { status: number, headers: Record<string, string> } 
}) {
  // 1) early version sanity check
  if (!config.fhir.supportedVersions.includes(params.fhir_version)) {
    set.status = 400
    return { error: `Unsupported FHIR version: ${params.fhir_version}` }
  }

  try {
    const serverInfo = await getServerInfoByName(params.server_name)
    if (!serverInfo) {
      set.status = 404
      return { error: `FHIR server '${params.server_name}' not found` }
    }
    
    const serverUrl = serverInfo.url
    
    // skip auth on metadata
    if (request.method !== 'GET' || !request.url.endsWith('/metadata')) {
      const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/, '')
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }
      await validateToken(auth)
    }
    
    // build target path
    const parts = new URL(request.url).pathname.split('/').filter(Boolean)
    const resourcePath = parts.slice(3).join('/')
    const target = `${serverUrl}${resourcePath ? `/${resourcePath}` : ''}`

    const headers = new Headers()
    request.headers.forEach((v: string, k: string) => k !== 'host' && k !== 'connection' && headers.set(k, v!))
    headers.set('accept', 'application/fhir+json')

    const fetchOptions = {
      method: request.method,
      headers,
      body: ['POST','PUT','PATCH'].includes(request.method) 
        ? await request.text() 
        : undefined
    }

    // Check if mTLS is configured for this server
    const mtlsConfig = getMtlsConfig(serverInfo.identifier)
    const useMtls = mtlsConfig?.enabled && target.startsWith('https://')
    
    // Use appropriate fetch method based on mTLS configuration
    const resp = useMtls 
      ? await fetchWithMtls(target, { ...fetchOptions, serverId: serverInfo.identifier })
      : await fetch(target, fetchOptions)

    // copy status & CORS headers
    set.status = resp.status
    resp.headers.forEach((v: string, k: string) => {
      if (k.match(/content-type|etag|location/)) {
        set.headers = { ...set.headers, [k]: v }
      }
    })
    set.headers['Access-Control-Allow-Origin']  = '*'
    set.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'

    const text = await resp.text()
    return text.replaceAll(
      serverUrl,
      `${config.baseUrl}/${config.name}/${params.server_name}/${params.fhir_version}`
    )
  } catch (error) {
    logger.fhir.error('FHIR proxy error', { server: params.server_name, error })
    set.status = 500
    return { error: 'Failed to proxy FHIR request', details: error }
  }
}

// Reusable schema for proxy endpoint
const proxySchema = {
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
}
/**
 * FHIR proxy routes with authentication and CORS support
 * 
 * Route Structure: /:server_name/:fhir_version/*
 * - Client specifies server name and version (e.g., /hapi-fhir-server/R4/Patient/123)
 * - We map server names to configured FHIR server URLs
 * - Proxy requests to the appropriate FHIR server
 * - Response URLs maintain client's requested server name and version for consistency
 * 
 * SMART on FHIR Configuration:
 * - Each FHIR server has its own SMART configuration endpoint
 * - /:server_name/:fhir_version/.well-known/smart-configuration
 * - Configuration is dynamically generated from Keycloak and cached for performance
 * - This follows SMART on FHIR specification where configuration is server-specific
 * 
 * Performance Features:
 * - FHIR server info is cached for 5 minutes to avoid repeated metadata calls
 * - Cache is pre-warmed on server startup for faster first requests
 * - Version normalization: "4.0.1" → "R4", "5.0.0" → "R5"
 * - Fallback handling: continues working even if FHIR server is temporarily unavailable
 * - Admin cache refresh endpoint available at /admin/smart-config/refresh
 */

export const fhirRoutes = new Elysia({ prefix: `/${config.name}/:server_name/:fhir_version`, tags: ['fhir'] })
  // SMART on FHIR Configuration endpoint - server-specific configuration
  .get('/.well-known/smart-configuration', async (): Promise<SmartConfiguration> => {
    return await smartConfigService.getSmartConfiguration()
  }, {
    params: t.Object({
      server_name: t.String({ description: 'FHIR server name or identifier' }),
      fhir_version: t.String({ description: 'FHIR version (e.g., R4, R5)' })
    }),
    response: t.Object({
      issuer: t.String({ description: 'OpenID Connect issuer URL' }),
      authorization_endpoint: t.String({ description: 'OAuth2 authorization endpoint' }),
      token_endpoint: t.String({ description: 'OAuth2 token endpoint' }),
      introspection_endpoint: t.String({ description: 'OAuth2 token introspection endpoint' }),
      registration_endpoint: t.Optional(t.String({ description: 'RFC 7591 Dynamic Client Registration endpoint' })),
      code_challenge_methods_supported: t.Array(t.String({ description: 'Supported PKCE code challenge methods' })),
      grant_types_supported: t.Array(t.String({ description: 'Supported OAuth2 grant types' })),
      response_types_supported: t.Array(t.String({ description: 'Supported OAuth2 response types' })),
      scopes_supported: t.Array(t.String({ description: 'Supported OAuth2 scopes' })),
      capabilities: t.Array(t.String({ description: 'SMART on FHIR capabilities' })),
      token_endpoint_auth_methods_supported: t.Array(t.String({ description: 'Supported token endpoint authentication methods' })),
      token_endpoint_auth_signing_alg_values_supported: t.Array(t.String({ description: 'Supported JWT signing algorithms for token endpoint auth' }))
    }),
    detail: {
      summary: 'SMART on FHIR Configuration for Specific Server',
      description: 'Get SMART on FHIR well-known configuration for this specific FHIR server and version',
      tags: ['smart-apps'],
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
      server_name: t.String({ description: 'FHIR server name or identifier' }),
      fhir_version: t.String({ description: 'FHIR version (e.g., R4, R5)' })
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
    params: { server_name: string, fhir_version: string }, 
    set: { status: number, headers: Record<string, string> } 
  }) => {
    // early version sanity check
    if (!config.fhir.supportedVersions.includes(params.fhir_version)) {
      set.status = 400
      return { error: `Unsupported FHIR version: ${params.fhir_version}` }
    }

    try {
      // Use the store to get server URL - this will initialize the store if needed
      const serverUrl = await getServerByName(params.server_name)
      if (!serverUrl) {
        set.status = 404
        return { error: `FHIR server '${params.server_name}' not found` }
      }

      const headers = new Headers()
      headers.set('accept', 'application/fhir+json')
      
      const resp = await fetch(serverUrl, {
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
        serverUrl,
        `${config.baseUrl}/${config.name}/${params.server_name}/${params.fhir_version}`
      )
      return body
    } catch (error) {
      set.status = 500
      return { error: 'Failed to serve FHIR server base URL', details: error }
    }
  }, {
    params: t.Object({
      server_name: t.String({ description: 'FHIR server name or identifier' }),
      fhir_version: t.String({ description: 'FHIR version (e.g., R4, R5)' })
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

  // Admin endpoint to refresh FHIR server cache
  .post('/cache/refresh', async ({ set, headers, params }) => {
    // Require authentication for cache management
    const auth = headers.authorization?.replace('Bearer ', '')
    if (!auth) {
      set.status = 401
      return { error: 'Authentication required' }
    }
    
    try {
      await validateToken(auth)
      
      // Get server info by name (automatically initializes if needed)
      const serverInfo = await getServerInfoByName(params.server_name)
      if (!serverInfo) {
        set.status = 404
        return { error: `FHIR server '${params.server_name}' not found` }
      }
      
      // Refresh specific server in the store
      await fhirServerStore.refreshServer(params.server_name)
      
      // Get the updated server info
      const updatedServerInfo = fhirServerStore.getServerByName(params.server_name)
      
      if (!updatedServerInfo) {
        set.status = 500
        return { error: 'Failed to refresh server info' }
      }
      
      return {
        success: true,
        message: 'FHIR server cache refreshed successfully',
        serverInfo: updatedServerInfo.metadata
      }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to refresh FHIR server cache', details: error }
    }
  }, {
    params: t.Object({
      server_name: t.String({ description: 'FHIR server name or identifier' }),
      fhir_version: t.String({ description: 'FHIR version (e.g., R4, R5)' })
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

    // all other FHIR requests - proxy to the FHIR server
  .get('/*', proxyFHIR, proxySchema)
  .post('/*', proxyFHIR, proxySchema)
  .put('/*', proxyFHIR, proxySchema)
  .patch('/*', proxyFHIR, proxySchema)
  .delete('/*', proxyFHIR, proxySchema)
