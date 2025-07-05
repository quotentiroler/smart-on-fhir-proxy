import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { keycloakPlugin } from './lib/keycloak-plugin'
import { fhirRoutes } from './routes/fhir'
import { serverRoutes } from './routes/info'
import { serverDiscoveryRoutes } from './routes/fhir-servers'
import { config } from './config'
import { ensureServersInitialized, getAllServers } from './lib/fhir-server-store'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'

// Initialize FHIR server cache on startup
async function initializeServer(): Promise<void> {
  console.log('🚀 Starting SMART on FHIR Proxy...')

  try {
    console.log('📡 Initializing FHIR server connections...')
    
    // Initialize the FHIR server store
    await ensureServersInitialized()
    
    // Get all servers from the store
    const serverInfos = await getAllServers()
    
    if (serverInfos.length === 0) {
      console.log('🔄 No FHIR servers available, but proxy server will continue with fallback configuration')
    } else {
      serverInfos.forEach((serverInfo, index) => {
        console.log(`✅ FHIR server ${index + 1} detected: ${serverInfo.metadata.serverName} (${serverInfo.metadata.fhirVersion}) at ${serverInfo.url}`)
      })
    }
    
  } catch (error) {
    console.warn('⚠️  Failed to initialize FHIR server connections:', error)
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
        { name: 'users', description: 'Healthcare user management' },
        { name: 'admin', description: 'Administrative operations' },
        { name: 'fhir', description: 'FHIR resource proxy endpoints' },
        { name: 'servers', description: 'FHIR server discovery endpoints' },
        { name: 'identity-providers', description: 'Identity provider management' },
        { name: 'smart-apps', description: 'SMART on FHIR configuration endpoints' }
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
  .use(fhirRoutes) // the actual FHIR proxy endpoints

// Initialize and start server
initializeServer()
  .then(async () => {
    app.listen(config.port, async () => {
      console.log(`🚀 SMART Launcher available at ${config.baseUrl}`)
      console.log(`🩺 Health check available at ${config.baseUrl}/health`)
      console.log(`📚 API Documentation available at ${config.baseUrl}/swagger`)
      console.log(`🔍 Server Discovery available at ${config.baseUrl}/fhir-servers`)
      
      // Get server info from store for display
      try {
        const serverInfos = await getAllServers()
        if (serverInfos.length > 0) {
          console.log(`🔗 SMART Protected FHIR Servers available:`)
          serverInfos.forEach((serverInfo) => {
            console.log(`   - ${serverInfo.identifier}: ${config.baseUrl}/smart-proxy/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`)
          })
        }
      } catch (error) {
        console.warn('⚠️  Could not display server endpoints:', error)
      }
    })
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  })