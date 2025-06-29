import { Elysia, t } from 'elysia'
import { getFHIRServerInfo } from '../lib/fhir-utils'
import { ErrorResponse } from '../schemas/common'

/**
 * General server information endpoints
 */
export const serverRoutes = new Elysia({ tags: ['server'] })
  // Shutdown endpoint - gracefully shutdown the server
  .post('/shutdown', async ({ set }) => {
    try {
      console.log('🛑 Shutdown requested via API')

      // Give the response time to be sent before shutting down
      setTimeout(() => {
        console.log('🛑 Shutting down server...')
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
      console.log('🔄 Restart requested via API')

      // Give the response time to be sent before restarting
      setTimeout(() => {
        console.log('🔄 Restarting server...')
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
      const serverInfo = await getFHIRServerInfo()

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        fhirServer: {
          accessible: serverInfo.supported,
          version: serverInfo.fhirVersion
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      }
    } catch (error) {
      set.status = 503
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'FHIR server not accessible',
        details: error
      }
    }
  }, {
    response: {
      200: t.Object({
        status: t.Literal('healthy', { description: 'Health status' }),
        timestamp: t.String({ description: 'Current timestamp' }),
        uptime: t.Number({ description: 'Server uptime in seconds' }),
        fhirServer: t.Object({
          accessible: t.Boolean({ description: 'Whether FHIR server is accessible' }),
          version: t.String({ description: 'FHIR server version' })
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
        details: t.Optional(t.Any({ description: 'Error details' }))
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
        accessible: false,
        version: 'unknown',
        serverName: undefined as string | undefined,
        serverVersion: undefined as string | undefined
      },
      keycloak: {
        status: 'unknown',
        accessible: false,
        realm: process.env.KEYCLOAK_REALM || 'smart-on-fhir'
      }
    }

    // Check FHIR server
    try {
      const fhirInfo = await getFHIRServerInfo()
      
      status.fhir = {
        status: fhirInfo.supported ? 'healthy' : 'degraded',
        accessible: fhirInfo.supported,
        version: fhirInfo.fhirVersion,
        serverName: fhirInfo.serverName,
        serverVersion: fhirInfo.serverVersion
      }
    } catch {
      status.fhir.status = 'unhealthy'
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
          status: t.String({ description: 'FHIR server status' }),
          accessible: t.Boolean({ description: 'Whether FHIR server is accessible' }),
          version: t.String({ description: 'FHIR server version' }),
          serverName: t.Optional(t.String({ description: 'FHIR server software name' })),
          serverVersion: t.Optional(t.String({ description: 'FHIR server software version' }))
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
          status: t.String({ description: 'FHIR server status' }),
          accessible: t.Boolean({ description: 'Whether FHIR server is accessible' }),
          version: t.String({ description: 'FHIR server version' }),
          serverName: t.Optional(t.String({ description: 'FHIR server software name' })),
          serverVersion: t.Optional(t.String({ description: 'FHIR server software version' }))
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
