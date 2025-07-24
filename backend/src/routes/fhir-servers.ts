import { Elysia, t } from 'elysia'
import { config } from '../config'
import { getAllServers, getServerInfoByName, ensureServersInitialized, addServer, updateServer } from '../lib/fhir-server-store'
import { logger } from '../lib/logger'
import { validateToken } from '../lib/auth'

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
          displayName: serverInfo.name,
          url: serverInfo.url,
          fhirVersion: serverInfo.metadata.fhirVersion,
          serverVersion: serverInfo.metadata.serverVersion,
          serverName: serverInfo.metadata.serverName,
          supported: serverInfo.metadata.supported,
          endpoints: {
            base: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
            smartConfig: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
            metadata: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
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
        server: t.Object({
          id: t.String({ description: 'Server identifier used in URLs' }),
          name: t.String({ description: 'Human-readable server name' }),
          displayName: t.String({ description: 'Human-readable server name' }),
          url: t.String({ description: 'Original server URL' }),
          fhirVersion: t.String({ description: 'FHIR version supported by server' }),
          serverVersion: t.Optional(t.String({ description: 'Server software version' })),
          serverName: t.Optional(t.String({ description: 'Server software name' })),
          supported: t.Boolean({ description: 'Whether this server is supported' }),
          endpoints: t.Object({
            base: t.String({ description: 'Base FHIR endpoint URL' }),
            smartConfig: t.String({ description: 'SMART configuration endpoint URL' }),
            metadata: t.String({ description: 'FHIR metadata endpoint URL' })
          })
        })
      }),
      401: t.Object({
        error: t.String({ description: 'Error message' })
      }),
      500: t.Object({
        error: t.String({ description: 'Error message' }),
        details: t.Optional(t.Any({ description: 'Error details' }))
      })
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
  .put('/:serverId', async ({ params, body, set, headers }) => {
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
      const serverInfo = await updateServer(params.serverId, body.url, body.name)
      
      return {
        success: true,
        message: 'FHIR server updated successfully',
        server: {
          id: serverInfo.identifier,
          name: serverInfo.name,
          displayName: serverInfo.name,
          url: serverInfo.url,
          fhirVersion: serverInfo.metadata.fhirVersion,
          serverVersion: serverInfo.metadata.serverVersion,
          serverName: serverInfo.metadata.serverName,
          supported: serverInfo.metadata.supported,
          endpoints: {
            base: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
            smartConfig: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
            metadata: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
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
      serverId: t.String({ description: 'Server identifier to update' })
    }),
    body: t.Object({
      url: t.String({ description: 'New FHIR server base URL' }),
      name: t.Optional(t.String({ description: 'Optional custom name for the server' }))
    }),
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the server was updated successfully' }),
        message: t.String({ description: 'Success message' }),
        server: t.Object({
          id: t.String({ description: 'Server identifier used in URLs' }),
          name: t.String({ description: 'Human-readable server name' }),
          displayName: t.String({ description: 'Human-readable server name' }),
          url: t.String({ description: 'Updated server URL' }),
          fhirVersion: t.String({ description: 'FHIR version supported by server' }),
          serverVersion: t.Optional(t.String({ description: 'Server software version' })),
          serverName: t.Optional(t.String({ description: 'Server software name' })),
          supported: t.Boolean({ description: 'Whether this server is supported' }),
          endpoints: t.Object({
            base: t.String({ description: 'Base FHIR endpoint URL' }),
            smartConfig: t.String({ description: 'SMART configuration endpoint URL' }),
            metadata: t.String({ description: 'FHIR metadata endpoint URL' })
          })
        })
      }),
      400: t.Object({
        error: t.String({ description: 'Error message' }),
        details: t.Optional(t.String({ description: 'Error details' }))
      }),
      401: t.Object({
        error: t.String({ description: 'Error message' })
      }),
      500: t.Object({
        error: t.String({ description: 'Error message' }),
        details: t.Optional(t.Any({ description: 'Error details' }))
      })
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
        displayName: serverInfo.metadata.serverName || 'Unknown FHIR Server',
        url: serverInfo.url,
        fhirVersion: serverInfo.metadata.fhirVersion,
        serverVersion: serverInfo.metadata.serverVersion,
        serverName: serverInfo.metadata.serverName,
        supported: serverInfo.metadata.supported,
        endpoints: {
          base: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
          smartConfig: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
          metadata: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
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
      200: t.Object({
        totalServers: t.Number({ description: 'Total number of configured FHIR servers' }),
        servers: t.Array(t.Object({
          id: t.String({ description: 'Unique server identifier' }),
          name: t.String({ description: 'Human-readable server name' }),
          displayName: t.String({ description: 'Human-readable server name from FHIR metadata' }),
          url: t.String({ description: 'Original server URL' }),
          fhirVersion: t.String({ description: 'FHIR version supported by server' }),
          serverVersion: t.Optional(t.String({ description: 'Server software version' })),
          serverName: t.Optional(t.String({ description: 'Server software name from FHIR metadata' })),
          supported: t.Boolean({ description: 'Whether this server is supported' }),
          error: t.Optional(t.String({ description: 'Error message if server info failed to fetch' })),
          endpoints: t.Object({
            base: t.String({ description: 'Base FHIR endpoint URL' }),
            smartConfig: t.String({ description: 'SMART configuration endpoint URL' }),
            metadata: t.String({ description: 'FHIR metadata endpoint URL' })
          })
        }))
      }),
      500: t.Object({
        error: t.String({ description: 'Error message' }),
        details: t.Optional(t.Any({ description: 'Error details' }))
      })
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
  .get('/:server_name', async ({ params, set }) => {
    try {
      // Ensure servers are initialized
      await ensureServersInitialized()
      
      // Get server info from store
      const serverInfo = await getServerInfoByName(params.server_name)
      
      if (!serverInfo) {
        set.status = 404
        return { error: `FHIR server '${params.server_name}' not found` }
      }
      
      return {
        name: serverInfo.identifier,
        displayName: serverInfo.metadata.serverName || 'Unknown FHIR Server',
        url: serverInfo.url,
        fhirVersion: serverInfo.metadata.fhirVersion,
        serverVersion: serverInfo.metadata.serverVersion,
        serverName: serverInfo.metadata.serverName,
        supported: serverInfo.metadata.supported,
        endpoints: {
          base: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
          smartConfig: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
          metadata: `${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
        }
      }
    } catch (error) {
      logger.fhir.error('Failed to get server information', { serverName: params.server_name, error })
      set.status = 500
      return { error: 'Failed to get server information', details: error }
    }
  }, {
    params: t.Object({
      server_name: t.String({ description: 'FHIR server name or identifier' })
    }),
    response: {
      200: t.Object({
        name: t.String({ description: 'Server identifier used in URLs' }),
        displayName: t.String({ description: 'Human-readable server name from FHIR metadata' }),
        url: t.String({ description: 'Original server URL' }),
        fhirVersion: t.String({ description: 'FHIR version supported by server' }),
        serverVersion: t.Optional(t.String({ description: 'Server software version' })),
        serverName: t.Optional(t.String({ description: 'Server software name from FHIR metadata' })),
        supported: t.Boolean({ description: 'Whether this server is supported' }),
        endpoints: t.Object({
          base: t.String({ description: 'Base FHIR endpoint URL' }),
          smartConfig: t.String({ description: 'SMART configuration endpoint URL' }),
          metadata: t.String({ description: 'FHIR metadata endpoint URL' })
        })
      }),
      404: t.Object({
        error: t.String({ description: 'Error message' })
      }),
      500: t.Object({
        error: t.String({ description: 'Error message' }),
        details: t.Optional(t.Any({ description: 'Error details' })),
        name: t.Optional(t.String({ description: 'Server name' })),
        url: t.Optional(t.String({ description: 'Server URL' }))
      })
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
