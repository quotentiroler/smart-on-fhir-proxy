import { Elysia, t } from 'elysia'
import { config } from '../config'
import { getAllServers, getServerInfoByName, ensureServersInitialized } from '../lib/fhir-server-store'
import { logger } from '../lib/logger'

/**
 * Server discovery routes
 */
export const serverDiscoveryRoutes = new Elysia({ prefix: '/fhir-servers', tags: ['fhir-servers'] })
  // List all available FHIR servers
  .get('/', async ({ set }) => {
    try {
      // Ensure servers are initialized
      await ensureServersInitialized()
      
      // Get all servers from the store
      const serverInfos = await getAllServers()
      
      const servers = serverInfos.map(serverInfo => ({
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
          name: t.String({ description: 'Server identifier used in URLs' }),
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
