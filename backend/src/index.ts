import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { keycloakPlugin } from './lib/keycloak-plugin'
import { fhirRoutes } from './routes/fhir'
import { statusRoutes } from './routes/status'
import { serverDiscoveryRoutes } from './routes/fhir-servers'
import { oauthMonitoringRoutes } from './routes/oauth-monitoring'
import { oauthWebSocket } from './routes/oauth-websocket'
import { config } from './config'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { logger } from './lib/logger'
import { initializeServer, displayServerEndpoints } from './init'
import { oauthMetricsLogger } from './lib/oauth-metrics-logger'
import staticPlugin from '@elysiajs/static'

// Debug CORS configuration
console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV)
console.log('[DEBUG] CORS origins:', config.cors.origins)

const app = new Elysia({
  name: config.name,
  serve: {
    idleTimeout: 120 // 2 minutes - more secure, still sufficient for SSE with 30s keepalive
  },
  websocket: {
    idleTimeout: 120 // 2 minutes for WebSocket connections
  },
  aot: true,
  sanitize: (value) => Bun.escapeHTML(value)
})
  .use(cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  }))
  .use(swagger({
    documentation: {
      info: {
        title: config.displayName,
        version: config.version,
        description: 'SMART on FHIR Proxy + Healthcare Administration API using Keycloak and Elysia',
      },
      tags: [
        { name: 'authentication', description: 'Authentication and authorization endpoints' },
        { name: 'users', description: 'Healthcare user management' },
        { name: 'admin', description: 'Administrative operations' },
        { name: 'fhir', description: 'FHIR resource proxy endpoints' },
        { name: 'servers', description: 'FHIR server discovery endpoints' },
        { name: 'identity-providers', description: 'Identity provider management' },
        { name: 'smart-apps', description: 'SMART on FHIR configuration endpoints' },
        { name: 'oauth-ws-monitoring', description: 'OAuth monitoring via WebSocket' },
        { name: 'oauth-sse-monitoring', description: 'OAuth monitoring via Server-Sent Events' },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Bearer token from OAuth2 flow'
          },
          MutualTLS: {
            type: 'http',
            scheme: 'mutual-tls',
            description: 'Mutual TLS authentication for secure API communication between proxy and FHIR servers. Submit a request to the infrastructure team with full information about your application to obtain a client certificate.'
          }
        }
      },
      servers: [
        {
          url: config.baseUrl,
          description: 'Development server'
        }
      ]
    }
  }))
  .use(staticPlugin({ assets: 'public', prefix: '/' })) // Serve static files from public directory
  .use(keycloakPlugin)
  .use(statusRoutes)// Server status and info endpoints, smart launcher, restart and shutdown too (will be moved to admin)
  .use(serverDiscoveryRoutes)// Server discovery endpoints
  .use(authRoutes)
  .use(adminRoutes) //admin keycloak endpoints
  .use(oauthMonitoringRoutes) // OAuth monitoring and analytics endpoints
  .use(oauthWebSocket) // OAuth WebSocket for real-time monitoring
  .use(fhirRoutes) // the actual FHIR proxy endpoints

// Initialize and start server
initializeServer()
  .then(async () => {
    // Initialize OAuth metrics logger
    await oauthMetricsLogger.initialize();

    try {
      // In containerized environments (Docker/Fly.io), listen on all interfaces
      // In local development, default to localhost only
      const listenOptions = process.env.NODE_ENV === 'production' || process.env.DOCKER
        ? { port: config.port, hostname: '0.0.0.0' }
        : { port: config.port };

      app.listen(listenOptions, async () => {
        logger.server.info(`🚀 Server successfully started on port ${config.port}`)
        await displayServerEndpoints()
      })
    } catch (listenError) {
      logger.server.error('Failed to start HTTP server', {
        error: listenError instanceof Error ? {
          message: listenError.message,
          stack: listenError.stack,
          name: listenError.name,
          cause: listenError.cause
        } : String(listenError),
        port: config.port,
        baseUrl: config.baseUrl,
        processId: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      })

      // Check if it's a port binding issue
      if (listenError instanceof Error && (
        listenError.message.includes('EADDRINUSE') ||
        listenError.message.includes('address already in use') ||
        listenError.message.includes('bind')
      )) {
        logger.server.error(`❌ Port ${config.port} is already in use. Please:`)
        logger.server.error('   1. Stop any other processes using this port')
        logger.server.error('   2. Change the PORT environment variable')
        logger.server.error(`   3. Or kill the process using: netstat -ano | findstr :${config.port}`)
      }

      throw listenError
    }
  })
  .catch((error) => {
    logger.server.error('❌ Proxy Smart failed to start', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      } : String(error),
      config: {
        port: config.port,
        baseUrl: config.baseUrl,
        keycloak: {
          baseUrl: config.keycloak.baseUrl,
          realm: config.keycloak.realm,
          jwksUri: config.keycloak.jwksUri
        },
        fhir: {
          serverBases: config.fhir.serverBases
        }
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        processId: process.pid,
        workingDirectory: process.cwd(),
        environmentVars: {
          BASE_URL: process.env.BASE_URL,
          PORT: process.env.PORT,
          KEYCLOAK_BASE_URL: process.env.KEYCLOAK_BASE_URL,
          KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
          FHIR_SERVER_BASE: process.env.FHIR_SERVER_BASE
        }
      },
      timestamp: new Date().toISOString()
    })

    // Provide helpful debugging information
    logger.server.error('')
    logger.server.error('🔍 Debugging steps:')
    logger.server.error('   1. Check if all required environment variables are set')
    logger.server.error('   2. Verify Keycloak is running and accessible')
    logger.server.error('   3. Check if FHIR server URLs are reachable')
    logger.server.error('   4. Ensure port is not already in use')
    logger.server.error('   5. Check network connectivity and firewall settings')
    logger.server.error('')

    process.exit(1)
  })