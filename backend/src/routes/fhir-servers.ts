import { Elysia, t } from 'elysia'
import { config } from '../config'
import { getAllServers, getServerInfoByName, ensureServersInitialized, addServer, updateServer } from '../lib/fhir-server-store'
import { logger } from '../lib/logger'
import { validateToken } from '../lib/auth'
import * as forge from 'node-forge'
import * as crypto from 'crypto'
import * as https from 'https'
import nodeFetch from 'node-fetch'
import {
  ErrorResponse,
  FhirServerResponse,
  FhirServerListResponse,
  FhirServerInfoResponse,
  MtlsConfigResponse,
  CertificateUploadResponse
} from '../schemas/common'

/**
 * In-memory mTLS configuration storage
 * In production, this should be stored in a database
 */
interface MtlsConfig {
  enabled: boolean
  clientCert?: string // base64 encoded certificate
  clientKey?: string  // base64 encoded private key
  caCert?: string     // base64 encoded CA certificate
  certDetails?: {
    subject: string
    issuer: string
    validFrom: string
    validTo: string
    fingerprint: string
  }
}

const mtlsConfigs = new Map<string, MtlsConfig>()

/**
 * Parse certificate details from PEM content using node-forge
 * Extracts real certificate information for validation and display
 */
function parseCertificate(certContent: string): MtlsConfig['certDetails'] {
  try {
    // Clean up the certificate content - ensure proper PEM format
    let cleanCert = certContent.trim()

    // Add headers if missing
    if (!cleanCert.includes('-----BEGIN CERTIFICATE-----')) {
      cleanCert = `-----BEGIN CERTIFICATE-----\n${cleanCert}\n-----END CERTIFICATE-----`
    }

    // Parse the certificate using node-forge
    const cert = forge.pki.certificateFromPem(cleanCert)

    // Extract subject information
    const subjectAttrs = cert.subject.attributes.map(attr =>
      `${attr.shortName || attr.name}=${attr.value}`
    ).join(', ')

    // Extract issuer information  
    const issuerAttrs = cert.issuer.attributes.map(attr =>
      `${attr.shortName || attr.name}=${attr.value}`
    ).join(', ')

    // Calculate fingerprint (SHA-256)
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
    const hash = crypto.createHash('sha256')
    hash.update(der, 'binary')
    const fingerprint = 'SHA256:' + hash.digest('hex').toUpperCase().match(/.{2}/g)?.join(':')

    return {
      subject: subjectAttrs,
      issuer: issuerAttrs,
      validFrom: cert.validity.notBefore.toISOString(),
      validTo: cert.validity.notAfter.toISOString(),
      fingerprint: fingerprint || 'Unknown'
    }
  } catch (error) {
    logger.error('Failed to parse certificate', error instanceof Error ? error.message : 'Unknown error')
    throw new Error(`Invalid certificate format: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate certificate chain and check for expiration
 */
function validateCertificate(certPem: string, caCertPem?: string): { isValid: boolean, errors: string[] } {
  const errors: string[] = []

  try {
    const cert = forge.pki.certificateFromPem(certPem)
    const now = new Date()

    // Check expiration
    if (cert.validity.notBefore > now) {
      errors.push('Certificate is not yet valid')
    }
    if (cert.validity.notAfter < now) {
      errors.push('Certificate has expired')
    }

    // Validate against CA if provided
    if (caCertPem) {
      try {
        const caCert = forge.pki.certificateFromPem(caCertPem)
        if (!caCert.verify(cert)) {
          errors.push('Certificate is not signed by the provided CA')
        }
      } catch {
        errors.push('Invalid CA certificate format')
      }
    }

    return { isValid: errors.length === 0, errors }
  } catch (error) {
    errors.push(`Invalid certificate format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { isValid: false, errors }
  }
}

/**
 * Create HTTPS agent with mTLS configuration
 */
export function createMtlsAgent(serverId: string): https.Agent | undefined {
  const mtlsConfig = mtlsConfigs.get(serverId)

  if (!mtlsConfig?.enabled || !mtlsConfig.clientCert || !mtlsConfig.clientKey) {
    return undefined
  }

  try {
    // Decode base64 encoded certificates
    const cert = Buffer.from(mtlsConfig.clientCert, 'base64').toString('utf8')
    const key = Buffer.from(mtlsConfig.clientKey, 'base64').toString('utf8')
    const ca = mtlsConfig.caCert ? Buffer.from(mtlsConfig.caCert, 'base64').toString('utf8') : undefined

    // Validate certificate before using
    const validation = validateCertificate(cert, ca)
    if (!validation.isValid) {
      logger.error('mTLS certificate validation failed', validation.errors.join(', '))
      return undefined
    }

    return new https.Agent({
      cert,
      key,
      ca: ca ? [ca] : undefined,
      rejectUnauthorized: true // Always validate server certificates
    })
  } catch (error) {
    logger.error('Failed to create mTLS agent', error instanceof Error ? error.message : 'Unknown error')
    return undefined
  }
}

/**
 * Get mTLS configuration for a server (exported for use in FHIR proxy)
 */
export function getMtlsConfig(serverId: string): MtlsConfig | undefined {
  return mtlsConfigs.get(serverId)
}

/**
 * Create a fetch function with mTLS support using node-fetch
 */
export async function fetchWithMtls(
  url: string,
  options: RequestInit & { serverId?: string } = {}
): Promise<Response> {
  const { serverId, ...fetchOptions } = options

  // Use mTLS agent if server ID provided and HTTPS URL
  if (serverId && url.startsWith('https://')) {
    const agent = createMtlsAgent(serverId)
    if (agent) {
      logger.fhir.info('Using mTLS for FHIR request', { serverId, url: url.split('?')[0] })

      // Convert body to node-fetch compatible format
      let body: string | Buffer | undefined = undefined
      if (fetchOptions.body) {
        if (typeof fetchOptions.body === 'string') {
          body = fetchOptions.body
        } else if (fetchOptions.body instanceof Buffer) {
          body = fetchOptions.body
        } else if (typeof fetchOptions.body === 'object' && 'getReader' in fetchOptions.body) {
          // Convert ReadableStream to string for node-fetch compatibility
          const reader = (fetchOptions.body as ReadableStream).getReader()
          const chunks: Uint8Array[] = []
          let done = false

          while (!done) {
            const { value, done: readerDone } = await reader.read()
            done = readerDone
            if (value) chunks.push(value)
          }

          body = Buffer.concat(chunks).toString()
        } else {
          // For other types, convert to string
          body = String(fetchOptions.body)
        }
      }

      // Use node-fetch with custom agent for mTLS
      const response = await nodeFetch(url, {
        method: fetchOptions.method || 'GET',
        headers: fetchOptions.headers,
        body,
        agent
      })

      // Convert node-fetch Response to standard Response for compatibility
      const responseBody = await response.buffer()
      return new Response(responseBody.toString(), {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
    }
  }

  // Fallback to standard fetch for non-HTTPS or when mTLS not configured
  return fetch(url, fetchOptions)
}

/**
 * Server discovery routes
 */
export const serverDiscoveryRoutes = new Elysia({ prefix: '/fhir-servers', tags: ['fhir-servers'] })
  // Create a new FHIR server
  .post('/', async ({ body, set, headers }) => {
    try {
      // Require authentication for server management
      const auth = headers.authorization?.replace('Bearer ', '')
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      // Validate URL format
      try {
        new URL(body.url)
      } catch {
        set.status = 400
        return { error: 'Invalid URL format' }
      }

      // Add the server to the store (this will test connectivity)
      const serverInfo = await addServer(body.url, body.name)

      return {
        success: true,
        message: 'FHIR server added successfully',
        server: {
          id: serverInfo.identifier,
          name: serverInfo.name,
          url: serverInfo.url,
          fhirVersion: serverInfo.metadata.fhirVersion,
          serverVersion: serverInfo.metadata.serverVersion,
          serverName: serverInfo.metadata.serverName,
          supported: serverInfo.metadata.supported,
          endpoints: {
            base: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
            smartConfig: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
            metadata: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
          }
        }
      }
    } catch (error) {
      logger.fhir.error('Failed to add FHIR server', { error, body })

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch FHIR metadata')) {
          set.status = 400
          return { error: 'Unable to connect to FHIR server or server is not responding', details: error.message }
        }
        if (error.message.includes('Invalid FHIR server')) {
          set.status = 400
          return { error: 'Server is not a valid FHIR server', details: error.message }
        }
      }

      set.status = 500
      return { error: 'Failed to add FHIR server', details: error }
    }
  }, {
    body: t.Object({
      url: t.String({ description: 'FHIR server base URL' }),
      name: t.Optional(t.String({ description: 'Optional custom name for the server' }))
    }),
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the server was added successfully' }),
        message: t.String({ description: 'Success message' }),
        server: FhirServerResponse
      }, { title: 'AddFhirServerResponse' }),
      401: t.Object({
        error: t.String({ description: 'Error message' })
      }, { title: 'UnauthorizedError' }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Add New FHIR Server',
      description: 'Add a new FHIR server to the system by providing its base URL',
      tags: ['servers'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'Server added successfully' },
        401: { description: 'Unauthorized - Bearer token required' },
        500: { description: 'Failed to add server' }
      }
    }
  })

  // Update an existing FHIR server
  .put('/:server_id', async ({ params, body, set, headers }) => {
    try {
      // Require authentication for server management
      const auth = headers.authorization?.replace('Bearer ', '')
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      // Validate URL format
      try {
        new URL(body.url)
      } catch {
        set.status = 400
        return { error: 'Invalid URL format' }
      }

      // Update the server in the store
      const serverInfo = await updateServer(params.server_id, body.url, body.name)

      return {
        success: true,
        message: 'FHIR server updated successfully',
        server: {
          id: serverInfo.identifier,
          name: serverInfo.name,
          url: serverInfo.url,
          fhirVersion: serverInfo.metadata.fhirVersion,
          serverVersion: serverInfo.metadata.serverVersion,
          serverName: serverInfo.metadata.serverName,
          supported: serverInfo.metadata.supported,
          endpoints: {
            base: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
            smartConfig: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
            metadata: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
          }
        }
      }
    } catch (error) {
      logger.fhir.error('Failed to update FHIR server', { error, params, body })

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch FHIR metadata')) {
          set.status = 400
          return { error: 'Unable to connect to FHIR server or server is not responding', details: error.message }
        }
        if (error.message.includes('Invalid FHIR server')) {
          set.status = 400
          return { error: 'Server is not a valid FHIR server', details: error.message }
        }
      }

      set.status = 500
      return { error: 'Failed to update FHIR server', details: error }
    }
  }, {
    params: t.Object({
      server_id: t.String({ description: 'Server identifier to update' })
    }),
    body: t.Object({
      url: t.String({ description: 'New FHIR server base URL' }),
      name: t.Optional(t.String({ description: 'Optional custom name for the server' }))
    }),
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the server was updated successfully' }),
        message: t.String({ description: 'Success message' }),
        server: FhirServerResponse
      }, { title: 'UpdateFhirServerResponse' }),
      400: t.Object({
        error: t.String({ description: 'Error message' }),
        details: t.Optional(t.String({ description: 'Error details' }))
      }),
      401: t.Object({
        error: t.String({ description: 'Error message' })
      }, { title: 'UnauthorizedError' }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Update FHIR Server',
      description: 'Update an existing FHIR server by providing its new base URL',
      tags: ['servers'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'Server updated successfully' },
        400: { description: 'Bad request - Invalid URL or server not reachable' },
        401: { description: 'Unauthorized - Bearer token required' },
        500: { description: 'Failed to update server' }
      }
    }
  })

  // List all available FHIR servers
  .get('/', async ({ set }) => {
    try {
      // Ensure servers are initialized
      await ensureServersInitialized()

      // Get all servers from the store
      const serverInfos = await getAllServers()

      const servers = serverInfos.map(serverInfo => ({
        id: serverInfo.identifier,
        name: serverInfo.name, // Use the actual name, not identifier
        url: serverInfo.url,
        fhirVersion: serverInfo.metadata.fhirVersion,
        serverVersion: serverInfo.metadata.serverVersion,
        serverName: serverInfo.metadata.serverName,
        supported: serverInfo.metadata.supported,
        endpoints: {
          base: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
          smartConfig: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
          metadata: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
        }
      }))

      return {
        totalServers: servers.length,
        servers
      }
    } catch (error) {
      logger.fhir.error('Failed to list FHIR servers', { error })
      set.status = 500
      return { error: 'Failed to list FHIR servers', details: error }
    }
  }, {
    response: {
      200: FhirServerListResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'List Available FHIR Servers',
      description: 'Get a list of all configured FHIR servers with their connection information and endpoints',
      tags: ['servers'],
      response: {
        200: { description: 'List of available FHIR servers' },
        500: { description: 'Failed to list servers' }
      }
    }
  })

  // Get specific server information
  .get('/:server_id', async ({ params, set }) => {
    try {
      // Ensure servers are initialized
      await ensureServersInitialized()

      // Get server info from store
      const serverInfo = await getServerInfoByName(params.server_id)

      if (!serverInfo) {
        set.status = 404
        return { error: `FHIR server '${params.server_id}' not found` }
      }

      return {
        name: serverInfo.name,
        url: serverInfo.url,
        fhirVersion: serverInfo.metadata.fhirVersion,
        serverVersion: serverInfo.metadata.serverVersion,
        serverName: serverInfo.metadata.serverName,
        supported: serverInfo.metadata.supported,
        endpoints: {
          base: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
          smartConfig: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
          metadata: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
        }
      }
    } catch (error) {
      logger.fhir.error('Failed to get server information', { serverId: params.server_id, error })
      set.status = 500
      return { error: 'Failed to get server information', details: error }
    }
  }, {
    params: t.Object({
      server_id: t.String({ description: 'FHIR server identifier' })
    }),
    response: {
      200: FhirServerInfoResponse,
      404: t.Object({
        error: t.String({ description: 'Error message' })
      }, { title: 'NotFoundError' }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Get Server Information',
      description: 'Get detailed information about a specific FHIR server',
      tags: ['servers'],
      response: {
        200: { description: 'Server information' },
        404: { description: 'Server not found' },
        500: { description: 'Failed to get server information' }
      }
    }
  })

  // Get mTLS configuration for a server
  .get('/:server_id/mtls', async ({ params, set, headers }) => {
    try {
      // Require authentication
      const auth = headers.authorization?.replace('Bearer ', '')
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      const config = mtlsConfigs.get(params.server_id) || { enabled: false }

      return {
        enabled: config.enabled,
        hasCertificates: {
          clientCert: !!config.clientCert,
          clientKey: !!config.clientKey,
          caCert: !!config.caCert
        },
        certDetails: config.certDetails
      }
    } catch (error) {
      logger.fhir.error('Failed to get mTLS configuration', { error, serverId: params.server_id })
      set.status = 500
      return { error: 'Failed to get mTLS configuration' }
    }
  }, {
    params: t.Object({
      server_id: t.String({ description: 'FHIR server identifier' })
    }),
    response: {
      200: MtlsConfigResponse,
      401: t.Object({
        error: t.String({ description: 'Error message' })
      }, { title: 'UnauthorizedError' }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Get mTLS Configuration',
      description: 'Get the mutual TLS configuration for a specific FHIR server',
      tags: ['servers'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'mTLS configuration' },
        401: { description: 'Unauthorized - Bearer token required' },
        500: { description: 'Failed to get mTLS configuration' }
      }
    }
  })

  // Update mTLS configuration for a server
  .put('/:server_id/mtls', async ({ params, body, set, headers }) => {
    try {
      // Require authentication
      const auth = headers.authorization?.replace('Bearer ', '')
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      const existingConfig = mtlsConfigs.get(params.server_id) || { enabled: false }

      // Update configuration
      const updatedConfig: MtlsConfig = {
        ...existingConfig,
        enabled: body.enabled
      }

      mtlsConfigs.set(params.server_id, updatedConfig)

      return {
        success: true,
        message: 'mTLS configuration updated successfully',
        config: {
          enabled: updatedConfig.enabled,
          hasCertificates: {
            clientCert: !!updatedConfig.clientCert,
            clientKey: !!updatedConfig.clientKey,
            caCert: !!updatedConfig.caCert
          }
        }
      }
    } catch (error) {
      logger.fhir.error('Failed to update mTLS configuration', { error, serverId: params.server_id, body })
      set.status = 500
      return { error: 'Failed to update mTLS configuration' }
    }
  }, {
    params: t.Object({
      server_id: t.String({ description: 'FHIR server identifier' })
    }),
    body: t.Object({
      enabled: t.Boolean({ description: 'Whether to enable mTLS for this server' })
    }),
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' }),
        message: t.String({ description: 'Success message' }),
        config: t.Object({
          enabled: t.Boolean({ description: 'Whether mTLS is enabled' }),
          hasCertificates: t.Object({
            clientCert: t.Boolean({ description: 'Whether client certificate is uploaded' }),
            clientKey: t.Boolean({ description: 'Whether client private key is uploaded' }),
            caCert: t.Boolean({ description: 'Whether CA certificate is uploaded' })
          })
        })
      }, { title: 'UpdateMtlsConfigResponse' }),
      401: t.Object({
        error: t.String({ description: 'Error message' })
      }, { title: 'UnauthorizedError' }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Update mTLS Configuration',
      description: 'Enable or disable mutual TLS for a specific FHIR server',
      tags: ['servers'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'mTLS configuration updated successfully' },
        401: { description: 'Unauthorized - Bearer token required' },
        500: { description: 'Failed to update mTLS configuration' }
      }
    }
  })

  // Upload certificate for mTLS
  .post('/:server_id/mtls/certificates', async ({ params, body, set, headers }) => {
    try {
      // Require authentication
      const auth = headers.authorization?.replace('Bearer ', '')
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      const existingConfig = mtlsConfigs.get(params.server_id) || { enabled: false }

      // Validate certificate type
      if (!['client', 'key', 'ca'].includes(body.type)) {
        set.status = 400
        return { error: 'Invalid certificate type. Must be "client", "key", or "ca"' }
      }

      // Validate base64 content
      try {
        Buffer.from(body.content, 'base64')
      } catch {
        set.status = 400
        return { error: 'Invalid base64 content' }
      }

      // Update configuration based on certificate type
      const updatedConfig: MtlsConfig = { ...existingConfig }

      switch (body.type) {
        case 'client':
          updatedConfig.clientCert = body.content
          // Parse certificate details for client certificates
          updatedConfig.certDetails = parseCertificate(body.content)
          break
        case 'key':
          updatedConfig.clientKey = body.content
          break
        case 'ca':
          updatedConfig.caCert = body.content
          break
      }

      mtlsConfigs.set(params.server_id, updatedConfig)

      return {
        success: true,
        message: `${body.type === 'client' ? 'Client certificate' : body.type === 'key' ? 'Private key' : 'CA certificate'} uploaded successfully`,
        certDetails: body.type === 'client' ? updatedConfig.certDetails : undefined
      }
    } catch (error) {
      logger.fhir.error('Failed to upload certificate', { error, serverId: params.server_id })
      set.status = 500
      return { error: 'Failed to upload certificate' }
    }
  }, {
    params: t.Object({
      server_id: t.String({ description: 'FHIR server identifier' })
    }),
    body: t.Object({
      type: t.String({ description: 'Certificate type: "client", "key", or "ca"' }),
      content: t.String({ description: 'Base64 encoded certificate or key content' }),
      filename: t.Optional(t.String({ description: 'Original filename' }))
    }),
    response: {
      200: CertificateUploadResponse,
      400: t.Object({
        error: t.String({ description: 'Error message' })
      }, { title: 'BadRequestError' }),
      401: t.Object({
        error: t.String({ description: 'Error message' })
      }, { title: 'UnauthorizedError' }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Upload Certificate',
      description: 'Upload a certificate or private key for mTLS authentication',
      tags: ['servers'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'Certificate uploaded successfully' },
        400: { description: 'Bad request - Invalid certificate type or content' },
        401: { description: 'Unauthorized - Bearer token required' },
        500: { description: 'Failed to upload certificate' }
      }
    }
  })
