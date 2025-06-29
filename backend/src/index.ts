import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { keycloakPlugin } from './lib/keycloak-plugin'
import { smartRoutes } from './routes/smart'
import { authRoutes } from './routes/auth'
import { fhirRoutes } from './routes/fhir'
import { serverRoutes } from './routes/server'
import { config } from './config'
import { getFHIRServerInfo } from './lib/fhir-utils'

// Initialize FHIR server cache on startup
async function initializeServer() {
  console.log('🚀 Starting SMART on FHIR API server...')
  
  // Pre-load FHIR server information
  try {
    console.log('📡 Initializing FHIR server connection...')
    const serverInfo = await getFHIRServerInfo()
    console.log(`✅ FHIR server detected: ${serverInfo.serverName} (${serverInfo.fhirVersion})`)
  } catch (error) {
    console.warn('⚠️  Failed to initialize FHIR server connection:', error)
    console.log('🔄 Proxy Server will continue with fallback configuration')
  }
}

const app = new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: 'SMART on FHIR API',
        version: '1.0.0',
        description: 'Healthcare administration API for SMART on FHIR applications'
      },
      tags: [
        { name: 'authentication', description: 'Authentication and authorization endpoints' },
        { name: 'smart-apps', description: 'SMART on FHIR application management' },
        { name: 'users', description: 'Healthcare user management' },
        { name: 'admin', description: 'Administrative operations' },
        { name: 'fhir', description: 'FHIR resource proxy endpoints' },
        { name: 'identity-providers', description: 'Identity provider management' }
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
  .use(serverRoutes)
  .use(smartRoutes)
  .use(authRoutes)
  .use(fhirRoutes)

// Initialize and start server
initializeServer().then(() => {
  app.listen(config.port, () => {
    console.log(`🚀 Elysia SMART proxy listening at ${config.baseUrl}`)
    console.log(`📚 API Documentation available at ${config.baseUrl}/swagger`)
  })
}).catch((error) => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})