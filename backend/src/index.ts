import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { keycloakPlugin } from './lib/keycloak-plugin'
import { fhirRoutes } from './routes/fhir'
import { serverRoutes } from './routes/info'
import { serverDiscoveryRoutes } from './routes/fhir-servers'
import { config } from './config'
import { ensureServersInitialized, getAllServers } from './lib/fhir-server-store'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'

// Check Keycloak connection health
async function checkKeycloakConnection(): Promise<void> {
  console.log('🔐 Checking Keycloak connection...')
  
  const fetchWithTimeout = async (url: string, timeout: number = 5000) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
  
  try {
    // Test JWKS endpoint connectivity
    const response = await fetchWithTimeout(config.keycloak.jwksUri)
    
    if (!response.ok) {
      throw new Error(`JWKS endpoint returned ${response.status}: ${response.statusText}`)
    }
    
    const jwksData = await response.json()
    
    if (!jwksData.keys || !Array.isArray(jwksData.keys) || jwksData.keys.length === 0) {
      throw new Error('JWKS endpoint returned invalid or empty key set')
    }
    
    console.log(`✅ Keycloak JWKS endpoint accessible with ${jwksData.keys.length} key(s)`)
    
    // Test realm info endpoint
    const realmInfoUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}`
    const realmResponse = await fetchWithTimeout(realmInfoUrl)
    
    if (!realmResponse.ok) {
      throw new Error(`Realm info endpoint returned ${realmResponse.status}: ${realmResponse.statusText}`)
    }
    
    const realmInfo = await realmResponse.json()
    console.log(`✅ Keycloak realm "${realmInfo.realm}" accessible`)
    
    // Test OpenID Connect configuration endpoint (non-critical)
    const openidConfigUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/.well-known/openid-configuration`
    try {
      const openidResponse = await fetchWithTimeout(openidConfigUrl)
      
      if (!openidResponse.ok) {
        console.warn(`⚠️  OpenID Connect configuration endpoint returned ${openidResponse.status}: ${openidResponse.statusText}`)
        console.warn('   This is non-critical - authentication will still work')
      } else {
        const openidConfig = await openidResponse.json()
        console.log(`✅ OpenID Connect configuration accessible`)
        console.log(`   - Authorization endpoint: ${openidConfig.authorization_endpoint}`)
        console.log(`   - Token endpoint: ${openidConfig.token_endpoint}`)
        console.log(`   - Userinfo endpoint: ${openidConfig.userinfo_endpoint}`)
      }
    } catch (openidError) {
      console.warn(`⚠️  Could not access OpenID Connect configuration: ${openidError instanceof Error ? openidError.message : String(openidError)}`)
      console.warn('   This is non-critical - authentication will still work')
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Keycloak connection check failed:', errorMessage)
    
    // Provide helpful error messages based on common issues
    if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ECONNREFUSED')) {
      console.error('💡 Possible causes:')
      console.error('   - Keycloak server is not running')
      console.error('   - Keycloak URL is incorrect')
      console.error('   - Network connectivity issues')
      console.error(`   - Check if Keycloak is accessible at: ${config.keycloak.baseUrl}`)
    } else if (errorMessage.includes('404')) {
      console.error('💡 Possible causes:')
      console.error('   - Keycloak realm name is incorrect')
      console.error(`   - Verify realm "${config.keycloak.realm}" exists in Keycloak`)
      console.error('   - Realm might not be properly configured')
    } else if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      console.error('💡 Possible causes:')
      console.error('   - Keycloak server is slow to respond')
      console.error('   - Network latency issues')
    }
    
    // Only fail if critical endpoints are not working
    if (errorMessage.includes('JWKS') || errorMessage.includes('Realm info')) {
      throw new Error('Keycloak connection verification failed')
    }
    
    console.warn('⚠️  Some Keycloak endpoints are not accessible, but critical authentication components are working')
  }
}

// Initialize FHIR server cache on startup
async function initializeServer(): Promise<void> {
  console.log('🚀 Starting SMART on FHIR Proxy...')

  try {
    console.log('🔐 Initializing Keycloak connection...')
    console.log(`   - Keycloak Server: ${config.keycloak.baseUrl}`)
    console.log(`   - Realm: ${config.keycloak.realm}`)
    console.log(`   - JWKS URI: ${config.keycloak.jwksUri}`)
    
    // Check Keycloak connection before proceeding
    await checkKeycloakConnection()
    
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Failed to initialize server:', errorMessage)
    
    // Check if it's a Keycloak-related error
    if (errorMessage.includes('Keycloak connection verification failed')) {
      console.error('💥 Keycloak connection failed - server cannot start without proper authentication')
      process.exit(1) // Exit cleanly instead of throwing
    }
    
    console.warn('⚠️  Failed to initialize FHIR server connections:', errorMessage)
    console.log('🔄 Proxy Server will continue with fallback configuration')
  }
}

const app = new Elysia()
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
            console.log(`   - ${serverInfo.identifier}: ${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`)
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