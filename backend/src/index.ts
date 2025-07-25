import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { keycloakPlugin } from './lib/keycloak-plugin'
import { fhirRoutes } from './routes/fhir'
import { serverRoutes } from './routes/info'
import { serverDiscoveryRoutes } from './routes/fhir-servers'
import { oauthMonitoringRoutes } from './routes/oauth-monitoring'
import { oauthWebSocket } from './routes/oauth-websocket'
import { config } from './config'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { logger } from './lib/logger'
import { initializeServer, displayServerEndpoints } from './init'
import { oauthMetricsLogger } from './lib/oauth-metrics-logger'

const app = new Elysia({
  name: config.appName,
  serve: {
    idleTimeout: 120 // 2 minutes - more secure, still sufficient for SSE with 30s keepalive
  },
  websocket: {
    idleTimeout: 120 // 2 minutes for WebSocket connections
  }
})
  .use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'SMART on FHIR API',
        version: config.version,
        description: 'Healthcare administration API for SMART on FHIR applications'
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
  .use(keycloakPlugin)
  .use(serverRoutes)// Server status and info endpoints, smart launcher, restart and shutdown too (will be moved to admin)
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

    app.listen(config.port, async () => {
      await displayServerEndpoints()
    })
  })
  .catch((error) => {
    logger.server.error('Failed to start server', { error })
    process.exit(1)
  })