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
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// Create the same app configuration as the main server
const app = new Elysia({
  name: config.name,
  serve: {
    idleTimeout: 120
  },
  websocket: {
    idleTimeout: 120
  },
  aot: true,
  sanitize: (value) => Bun.escapeHTML(value)
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
  .use(keycloakPlugin)
  .use(serverRoutes)
  .use(serverDiscoveryRoutes)
  .use(authRoutes)
  .use(adminRoutes)
  .use(oauthMonitoringRoutes)
  .use(oauthWebSocket)
  .use(fhirRoutes)

// Use a simple approach: start a temporary server and fetch the spec
const startServer = () => {
  const tempServer = app.listen(0, async () => {
    try {
      // Wait a bit for the server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const port = tempServer.server?.port as number
      
      if (!port) {
        throw new Error('Failed to get server port')
      }
      
      console.log(`🔄 Temporary server started on port ${port}`)
      
      // Wait a bit more to ensure swagger endpoint is ready
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const response = await fetch(`http://localhost:${port}/swagger/json`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const spec = await response.json()
      
      // Ensure dist directory exists
      const distDir = join(process.cwd(), 'dist')
      mkdirSync(distDir, { recursive: true })

      // Write to file
      const outputPath = join(distDir, 'openapi.json')
      writeFileSync(outputPath, JSON.stringify(spec, null, 2))

      console.log(`✅ OpenAPI spec exported to: ${outputPath}`)
      
      // Close the temporary server
      tempServer.stop()
      process.exit(0)
    } catch (error) {
      console.error('❌ Failed to fetch OpenAPI spec:', error)
      tempServer.stop()
      process.exit(1)
    }
  })
}

startServer()
