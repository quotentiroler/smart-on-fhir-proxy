import { Elysia, t } from 'elysia'
import staticPlugin from '@elysiajs/static'
import { getFHIRServerInfo, getServerIdentifier } from '../lib/fhir-utils'
import { ErrorResponse } from '../schemas/common'
import { config } from '../config'
import { logger } from '../lib/logger'

/**
 * Get health status for all configured FHIR servers
 */
async function getFHIRServersHealth() {
  const servers = []
  
  for (let i = 0; i < config.fhir.serverBases.length; i++) {
    const serverBase = config.fhir.serverBases[i]
    
    try {
      const serverInfo = await getFHIRServerInfo(serverBase)
      const serverIdentifier = getServerIdentifier(serverInfo, serverBase, i)
      
      servers.push({
        name: serverIdentifier,
        url: serverBase,
        status: serverInfo.supported ? 'healthy' : 'degraded',
        accessible: serverInfo.supported,
        version: serverInfo.fhirVersion,
        serverName: serverInfo.serverName,
        serverVersion: serverInfo.serverVersion
      })
    } catch (error) {
      const fallbackIdentifier = `server-${i}`
      servers.push({
        name: fallbackIdentifier,
        url: serverBase,
        status: 'unhealthy',
        accessible: false,
        version: 'unknown',
        serverName: undefined,
        serverVersion: undefined,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return servers
}

/**
 * General server information endpoints
 */
export const serverRoutes = new Elysia({ tags: ['server'] })
  .use(staticPlugin({ assets: 'public', prefix: '/' })) // Serve static files from public directory
  
  // Explicitly serve the index.html at root
  .get('/', async () => {
    return Bun.file('./public/index.html')
  })
  // Shutdown endpoint - gracefully shutdown the server
  .post('/shutdown', async ({ set }) => {
    try {
      logger.server.info('🛑 Shutdown requested via API')

      // Give the response time to be sent before shutting down
      setTimeout(() => {
        logger.server.info('🛑 Shutting down server...')
        process.exit(0)
      }, 100)

      return {
        success: true,
        message: 'Server shutdown initiated',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to shutdown server', details: error }
    }
  }, {
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether shutdown was initiated successfully' }),
        message: t.String({ description: 'Shutdown status message' }),
        timestamp: t.String({ description: 'Timestamp when shutdown was initiated' })
      }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Shutdown Server',
      description: 'Gracefully shutdown the SMART on FHIR server',
      tags: ['server'],
      response: {
        200: { description: 'Server shutdown initiated' },
        500: { description: 'Failed to shutdown server' }
      }
    }
  })

  // Restart endpoint - restart the server process
  .post('/restart', async ({ set }) => {
    try {
      logger.server.info('🔄 Restart requested via API')

      // Give the response time to be sent before restarting
      setTimeout(() => {
        logger.server.info('🔄 Restarting server...')
        // Use exit code 1 to indicate restart needed (requires process manager like PM2 or Docker restart policy)
        process.exit(1)
      }, 100)

      return {
        success: true,
        message: 'Server restart initiated',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to restart server', details: error }
    }
  }, {
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether restart was initiated successfully' }),
        message: t.String({ description: 'Restart status message' }),
        timestamp: t.String({ description: 'Timestamp when restart was initiated' })
      }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Restart Server',
      description: 'Restart the SMART on FHIR server process',
      tags: ['server'],
      response: {
        200: { description: 'Server restart initiated' },
        500: { description: 'Failed to restart server' }
      }
    }
  })

  // Health check endpoint - check if server is healthy
  .get('/health', async ({ set }) => {
    try {
      const fhirServers = await getFHIRServersHealth()
      const healthyServers = fhirServers.filter(server => server.status === 'healthy')
      const isHealthy = healthyServers.length > 0

      if (isHealthy) {
        return {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          fhirServers: {
            total: fhirServers.length,
            healthy: healthyServers.length,
            accessible: isHealthy,
            servers: fhirServers.map(server => ({
              name: server.name,
              status: server.status,
              version: server.version
            }))
          },
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          }
        }
      } else {
        set.status = 503
        return {
          status: 'unhealthy' as const,
          timestamp: new Date().toISOString(),
          error: 'No healthy FHIR servers available',
          fhirServers: {
            total: fhirServers.length,
            healthy: 0,
            accessible: false,
            servers: fhirServers.map(server => ({
              name: server.name,
              status: server.status,
              version: server.version
            }))
          }
        }
      }
    } catch (error) {
      set.status = 503
      return {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        error: 'Failed to check FHIR servers',
        details: error
      }
    }
  }, {
    response: {
      200: t.Object({
        status: t.Literal('healthy', { description: 'Health status' }),
        timestamp: t.String({ description: 'Current timestamp' }),
        uptime: t.Number({ description: 'Server uptime in seconds' }),
        fhirServers: t.Object({
          total: t.Number({ description: 'Total number of configured FHIR servers' }),
          healthy: t.Number({ description: 'Number of healthy FHIR servers' }),
          accessible: t.Boolean({ description: 'Whether at least one FHIR server is accessible' }),
          servers: t.Array(t.Object({
            name: t.String({ description: 'Server name' }),
            status: t.String({ description: 'Server status' }),
            version: t.String({ description: 'FHIR version' })
          }))
        }),
        memory: t.Object({
          used: t.Number({ description: 'Used memory in MB' }),
          total: t.Number({ description: 'Total memory in MB' })
        })
      }),
      503: t.Object({
        status: t.Literal('unhealthy', { description: 'Health status' }),
        timestamp: t.String({ description: 'Current timestamp' }),
        error: t.String({ description: 'Error description' }),
        details: t.Optional(t.Any({ description: 'Error details' })),
        fhirServers: t.Optional(t.Object({
          total: t.Number({ description: 'Total number of configured FHIR servers' }),
          healthy: t.Number({ description: 'Number of healthy FHIR servers' }),
          accessible: t.Boolean({ description: 'Whether at least one FHIR server is accessible' }),
          servers: t.Array(t.Object({
            name: t.String({ description: 'Server name' }),
            status: t.String({ description: 'Server status' }),
            version: t.String({ description: 'FHIR version' })
          }))
        }))
      })
    },
    detail: {
      summary: 'Health Check',
      description: 'Check the health status of the SMART on FHIR server',
      tags: ['server'],
      response: {
        200: { description: 'Server is healthy' },
        503: { description: 'Server is unhealthy' }
      }
    }
  })

  // System status endpoint - comprehensive system health check
  .get('/status', async ({ set }) => {
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      server: {
        status: 'healthy',
        version: process.env.npm_package_version || 'unknown'
      },
      fhir: {
        status: 'unknown',
        totalServers: 0,
        healthyServers: 0,
        servers: [] as Array<{
          name: string;
          url: string;
          status: string;
          accessible: boolean;
          version: string;
          serverName?: string;
          serverVersion?: string;
          error?: string;
        }>
      },
      keycloak: {
        status: 'unknown',
        accessible: false,
        realm: process.env.KEYCLOAK_REALM || 'smart-on-fhir'
      }
    }

    // Check all FHIR servers
    try {
      const fhirServers = await getFHIRServersHealth()
      const healthyServers = fhirServers.filter(server => server.status === 'healthy')
      
      status.fhir = {
        status: healthyServers.length > 0 ? 'healthy' : fhirServers.length > 0 ? 'degraded' : 'unhealthy',
        totalServers: fhirServers.length,
        healthyServers: healthyServers.length,
        servers: fhirServers
      }
    } catch (error) {
      status.fhir.status = 'unhealthy'
      status.fhir.servers = [{ 
        name: 'unknown', 
        url: 'unknown', 
        status: 'unhealthy', 
        accessible: false, 
        version: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    }

    // Check Keycloak connectivity
    try {
      const keycloakUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/.well-known/openid-configuration`
      const response = await fetch(keycloakUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (response.ok) {
        status.keycloak = {
          status: 'healthy',
          accessible: true,
          realm: process.env.KEYCLOAK_REALM || 'smart-on-fhir'
        }
      } else {
        status.keycloak.status = 'degraded'
      }
    } catch {
      status.keycloak.status = 'unhealthy'
    }

    // Set overall HTTP status based on component health
    const hasUnhealthyComponents = [status.fhir.status, status.keycloak.status].includes('unhealthy')
    if (hasUnhealthyComponents) {
      set.status = 503
    }

    return status
  }, {
    response: {
      200: t.Object({
        timestamp: t.String({ description: 'Current timestamp' }),
        uptime: t.Number({ description: 'Server uptime in seconds' }),
        server: t.Object({
          status: t.String({ description: 'Server status' }),
          version: t.String({ description: 'Server version' })
        }),
        fhir: t.Object({
          status: t.String({ description: 'Overall FHIR servers status' }),
          totalServers: t.Number({ description: 'Total number of configured FHIR servers' }),
          healthyServers: t.Number({ description: 'Number of healthy FHIR servers' }),
          servers: t.Array(t.Object({
            name: t.String({ description: 'Server name' }),
            url: t.String({ description: 'Server URL' }),
            status: t.String({ description: 'Server status' }),
            accessible: t.Boolean({ description: 'Whether server is accessible' }),
            version: t.String({ description: 'FHIR version' }),
            serverName: t.Optional(t.String({ description: 'FHIR server software name' })),
            serverVersion: t.Optional(t.String({ description: 'FHIR server software version' })),
            error: t.Optional(t.String({ description: 'Error message if unhealthy' }))
          }))
        }),
        keycloak: t.Object({
          status: t.String({ description: 'Keycloak status' }),
          accessible: t.Boolean({ description: 'Whether Keycloak is accessible' }),
          realm: t.String({ description: 'Keycloak realm name' })
        })
      }),
      503: t.Object({
        timestamp: t.String({ description: 'Current timestamp' }),
        uptime: t.Number({ description: 'Server uptime in seconds' }),
        server: t.Object({
          status: t.String({ description: 'Server status' }),
          version: t.String({ description: 'Server version' })
        }),
        fhir: t.Object({
          status: t.String({ description: 'Overall FHIR servers status' }),
          totalServers: t.Number({ description: 'Total number of configured FHIR servers' }),
          healthyServers: t.Number({ description: 'Number of healthy FHIR servers' }),
          servers: t.Array(t.Object({
            name: t.String({ description: 'Server name' }),
            url: t.String({ description: 'Server URL' }),
            status: t.String({ description: 'Server status' }),
            accessible: t.Boolean({ description: 'Whether server is accessible' }),
            version: t.String({ description: 'FHIR version' }),
            serverName: t.Optional(t.String({ description: 'FHIR server software name' })),
            serverVersion: t.Optional(t.String({ description: 'FHIR server software version' })),
            error: t.Optional(t.String({ description: 'Error message if unhealthy' }))
          }))
        }),
        keycloak: t.Object({
          status: t.String({ description: 'Keycloak status' }),
          accessible: t.Boolean({ description: 'Whether Keycloak is accessible' }),
          realm: t.String({ description: 'Keycloak realm name' })
        })
      })
    },
    detail: {
      summary: 'System Status',
      description: 'Get comprehensive status of all system components (server, FHIR, Keycloak)',
      tags: ['server'],
      response: {
        200: { description: 'All systems healthy' },
        503: { description: 'One or more systems unhealthy' }
      }
    }
  })
