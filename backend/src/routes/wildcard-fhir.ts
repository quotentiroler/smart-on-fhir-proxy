import { Elysia, t } from 'elysia'
import fetch, { Headers } from 'cross-fetch'
import { validateToken } from '../lib/auth'
import { config } from '../config'
import { fhirServerStore, getServerInfoByName } from '../lib/fhir-server-store'
import { logger } from '../lib/logger'

/**
 * Wildcard FHIR routes for direct resource paths (without explicit server/version)
 * 
 * These routes handle requests like:
 * - /metadata (should return 200 with metadata from default server)
 * - /Patient (should return 401 if no auth, proxy if authenticated)
 * - /Observation, /Encounter, etc. (same as Patient)
 * 
 * This allows the proxy to handle direct FHIR paths by routing them to a default server.
 */

/**
 * Get the default server info (first available server)
 */
async function getDefaultServerInfo() {
  await fhirServerStore.initializeServers()
  const servers = fhirServerStore.getAllServers()
  
  if (servers.length === 0) {
    throw new Error('No FHIR servers available')
  }
  
  // Return the first server as default
  return servers[0]
}

/**
 * Handle FHIR resource requests with authentication and proxying
 */
async function handleFhirResourceRequest(request: Request, set: any) {
  try {
    // Check authentication for all resource requests
    const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/, '')
    if (!auth) {
      set.status = 401
      return { 
        error: 'Authentication required',
        message: `FHIR resource requests require authorization. Example: Authorization: Bearer <token>`,
        availableServers: `${config.baseUrl}/fhir-servers`
      }
    }
    
    // Validate the token
    await validateToken(auth)
    
    // Get the default server info
    const defaultServer = await getDefaultServerInfo()
    
    // Extract the path from the request URL
    const url = new URL(request.url)
    const resourcePath = `${url.pathname}${url.search}`
    const target = `${defaultServer.url}${resourcePath}`
    
    // Set up headers for the proxied request
    const headers = new Headers()
    request.headers.forEach((v: string, k: string) => k !== 'host' && k !== 'connection' && headers.set(k, v!))
    headers.set('accept', 'application/fhir+json')
    
    // Proxy the request to the default server
    const resp = await fetch(target, {
      method: request.method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(request.method) ? await request.text() : undefined
    })
    
    // Copy response status and headers
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
    
    // Rewrite URLs in response body to maintain consistency
    const text = await resp.text()
    const body = text.replaceAll(
      defaultServer.url,
      `${config.baseUrl}/${config.appName}/${defaultServer.identifier}/${defaultServer.metadata.fhirVersion}`
    )
    return body
    
  } catch (error) {
    logger.fhir.error('Wildcard FHIR proxy error', {
      method: request.method,
      url: request.url,
      error
    })
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      set.status = 401
      return { error: 'Invalid or expired token' }
    }
    
    set.status = 500
    return { error: 'Failed to proxy FHIR request', details: error }
  }
}

export const wildcardFhirRoutes = new Elysia({ tags: ['fhir'] })
  // Handle /metadata - should return 200 with actual server metadata
  .get('/metadata', async ({ set }) => {
    try {
      const defaultServer = await getDefaultServerInfo()
      
      // Proxy the metadata request to the default server
      const resp = await fetch(`${defaultServer.url}/metadata`, {
        headers: {
          'Accept': 'application/fhir+json'
        }
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
      // Rewrite URLs to maintain consistency with proxy base URL
      const body = text.replaceAll(
        defaultServer.url,
        `${config.baseUrl}/${config.appName}/${defaultServer.identifier}/${defaultServer.metadata.fhirVersion}`
      )
      return body
    } catch (error) {
      logger.fhir.error('Failed to proxy metadata request', { error })
      set.status = 500
      return { error: 'Failed to fetch metadata from default server' }
    }
  }, {
    detail: {
      summary: 'FHIR Metadata (Default Server)',
      description: 'Get FHIR metadata from the default server',
      tags: ['fhir'],
      response: { 
        200: { description: 'FHIR CapabilityStatement' },
        500: { description: 'Failed to fetch metadata' }
      }
    }
  })
  
  // Handle common FHIR resource paths - require authentication and proxy to default server
  .all('/Patient*', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  }, {
    detail: {
      summary: 'Patient Resource Wildcard Proxy',
      description: 'Proxy authenticated Patient resource requests to the default server',
      tags: ['fhir'],
      security: [{ BearerAuth: [] }],
      response: { 
        200: { description: 'FHIR resource response' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Invalid token' },
        404: { description: 'Resource not found' },
        500: { description: 'Failed to proxy request' }
      }
    }
  })
  .all('/Patient', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/Observation*', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/Observation', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/Encounter*', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/Encounter', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/Condition*', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/Condition', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/Medication*', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/Medication', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/DiagnosticReport*', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  .all('/DiagnosticReport', async ({ request, set }) => {
    return await handleFhirResourceRequest(request, set)
  })
  
  // CORS preflight for wildcard paths
  .options('/*', ({ set }) => {
    set.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    return ''
  }, {
    detail: {
      summary: 'FHIR Wildcard CORS Preflight',
      description: 'Handle CORS preflight requests for wildcard FHIR endpoints',
      tags: ['fhir'],
      response: { 200: { description: 'CORS preflight response' } }
    }
  })