import { config } from './config'
import { logger } from './lib/logger'
import { ensureServersInitialized, getAllServers } from './lib/fhir-server-store'

// Global state to track Keycloak connectivity
let keycloakAccessible = false

/**
 * Get the current Keycloak accessibility status
 */
export function isKeycloakAccessible(): boolean {
  return config.keycloak.isConfigured || keycloakAccessible
}

/**
 * Check Keycloak connection health with retry logic
 */
export async function checkKeycloakConnection(retries?: number, interval?: number): Promise<void> {
  // Check if Keycloak is configured
  if (!config.keycloak.isConfigured || !config.keycloak.jwksUri) {
    logger.keycloak.warn('Keycloak connection verification skipped: Not configured')
    return
  }

  const maxRetries = retries ?? 3; // Default to 3 retries if not specified
  const retryInterval = interval ?? 5000; // Default to 5 seconds if not specified
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.keycloak.info(`Checking Keycloak connection (attempt ${attempt}/${maxRetries})...`);
      
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
      
      // Test JWKS endpoint connectivity
      const response = await fetchWithTimeout(config.keycloak.jwksUri)
      
      if (!response.ok) {
        throw new Error(`JWKS endpoint returned ${response.status}: ${response.statusText}`)
      }
      
      const jwksData = await response.json()
      
      if (!jwksData.keys || !Array.isArray(jwksData.keys) || jwksData.keys.length === 0) {
        throw new Error('JWKS endpoint returned invalid or empty key set')
      }
      
      logger.keycloak.info(`Keycloak JWKS endpoint accessible with ${jwksData.keys.length} key(s)`)
      
      // Test realm info endpoint
      const realmInfoUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}`
      const realmResponse = await fetchWithTimeout(realmInfoUrl)
      
      if (!realmResponse.ok) {
        throw new Error(`Realm info endpoint returned ${realmResponse.status}: ${realmResponse.statusText}`)
      }
      
      const realmInfo = await realmResponse.json()
      logger.keycloak.info(`Keycloak realm "${realmInfo.realm}" accessible`)
      
      // Test OpenID Connect configuration endpoint (non-critical)
      const openidConfigUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/.well-known/openid-configuration`
      try {
        const openidResponse = await fetchWithTimeout(openidConfigUrl)
        
        if (!openidResponse.ok) {
          logger.keycloak.warn(`OpenID Connect configuration endpoint returned ${openidResponse.status}: ${openidResponse.statusText}`)
          logger.keycloak.warn('This is non-critical - authentication will still work')
        } else {
          const openidConfig = await openidResponse.json()
          logger.keycloak.info(`OpenID Connect configuration accessible`)
          logger.keycloak.info(`Authorization endpoint: ${openidConfig.authorization_endpoint}`)
          logger.keycloak.info(`Token endpoint: ${openidConfig.token_endpoint}`)
          logger.keycloak.info(`Userinfo endpoint: ${openidConfig.userinfo_endpoint}`)
        }
      } catch (openidError) {
        logger.keycloak.warn(`Could not access OpenID Connect configuration: ${openidError instanceof Error ? openidError.message : String(openidError)}`)
        logger.keycloak.warn('This is non-critical - authentication will still work')
      }
      
      // If we reach here, the connection was successful
      keycloakAccessible = true
      return;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (attempt === maxRetries) {
        // This is the final attempt, log detailed error information
        logger.keycloak.error('Keycloak connection check failed after all retry attempts', { error: errorMessage })
        
        // Provide helpful error messages based on common issues
        if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ECONNREFUSED')) {
          logger.keycloak.error('Possible causes:', {
            causes: [
              'Keycloak server is not running',
              'Keycloak URL is incorrect',
              'Network connectivity issues',
              `Check if Keycloak is accessible at: ${config.keycloak.baseUrl}`
            ]
          })
        } else if (errorMessage.includes('404')) {
          logger.keycloak.error('Possible causes:', {
            causes: [
              'Keycloak realm name is incorrect',
              `Verify realm "${config.keycloak.realm}" exists in Keycloak`,
              'Realm might not be properly configured'
            ]
          })
        } else if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
          logger.keycloak.error('Possible causes:', {
            causes: [
              'Keycloak server is slow to respond',
              'Network latency issues'
            ]
          })
        }
        
        // Only fail if critical endpoints are not working
        if (errorMessage.includes('JWKS') || errorMessage.includes('Realm info')) {
          throw new Error('Keycloak connection verification failed after all retry attempts')
        }
        
        logger.keycloak.warn('Some Keycloak endpoints are not accessible, but critical authentication components are working')
        return;
      } else {
        // Not the final attempt, log retry message
        logger.keycloak.warn(`Keycloak connection attempt ${attempt} failed`, { error: errorMessage })
        logger.keycloak.info(`Retrying in ${retryInterval / 1000} seconds...`)
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryInterval))
      }
    }
  }
}

/**
 * Initialize FHIR server connections
 */
export async function initializeFhirServers(): Promise<void> {
  logger.fhir.info('Initializing FHIR server connections...')
  
  try {
    // Initialize the FHIR server store
    await ensureServersInitialized()
    
    // Get all servers from the store
    const serverInfos = await getAllServers()
    
    if (serverInfos.length === 0) {
      logger.fhir.info('No FHIR servers available, but proxy server will continue with fallback configuration')
    } else {
      serverInfos.forEach((serverInfo, index) => {
        logger.fhir.info(`FHIR server ${index + 1} detected: ${serverInfo.metadata.serverName} (${serverInfo.metadata.fhirVersion}) at ${serverInfo.url}`)
      })
    }
  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : String(error)
    
    logger.fhir.warn('❌ Failed to initialize FHIR server connections', {
      error: errorDetails,
      configuredServers: config.fhir.serverBases,
      timestamp: new Date().toISOString()
    })
    
    logger.fhir.info('🔍 FHIR server troubleshooting:')
    config.fhir.serverBases.forEach((serverBase, index) => {
      logger.fhir.info(`   ${index + 1}. Check if FHIR server is accessible: ${serverBase}`)
      logger.fhir.info(`      Test metadata endpoint: ${serverBase}/metadata`)
    })
    
    logger.fhir.info('📋 Proxy Server will continue with fallback configuration')
    // Don't throw here - FHIR server initialization failures should not prevent server startup
  }
}

/**
 * Initialize all server components (Keycloak + FHIR servers)
 */
export async function initializeServer(): Promise<void> {
  logger.server.info('Starting Proxy Smart...')

  try {
    // Check if Keycloak is configured
    if (config.keycloak.isConfigured) {
      logger.keycloak.info('Initializing Keycloak connection...')
      logger.keycloak.info(`Keycloak Server: ${config.keycloak.baseUrl}`)
      logger.keycloak.info(`Realm: ${config.keycloak.realm}`)
      logger.keycloak.info(`JWKS URI: ${config.keycloak.jwksUri}`)
      
      // Check Keycloak connection before proceeding
      await checkKeycloakConnection()
    } else {
      logger.keycloak.warn('Keycloak not configured - authentication features will be limited')
      logger.keycloak.warn('Configure Keycloak settings in the admin UI to enable full functionality')
    }
    
    // Initialize FHIR servers
    await initializeFhirServers()
    
  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    } : String(error)
    
    // Check if it's a Keycloak-related error
    if (error instanceof Error && error.message.includes('Keycloak connection verification failed')) {
      logger.server.warn('🔐 Keycloak connection failed - server will start with limited authentication')
      logger.server.warn('')
      logger.server.warn('🔍 Keycloak troubleshooting:')
      logger.server.warn(`   1. Check if Keycloak is running at: ${config.keycloak.baseUrl}`)
      logger.server.warn(`   2. Verify realm "${config.keycloak.realm}" exists`)
      logger.server.warn(`   3. Test JWKS endpoint: ${config.keycloak.jwksUri}`)
      logger.server.warn('   4. Check network connectivity and firewall settings')
      logger.server.warn('   5. Verify Keycloak admin console is accessible')
      logger.server.warn('   6. Configure Keycloak in the admin UI once the server is running')
      logger.server.warn('')
      // Continue server startup even with Keycloak issues
    } else {
      logger.server.error('❌ Server initialization failed', {
        error: errorDetails,
        initializationStep: 'Unknown',
        config: {
          keycloak: {
            isConfigured: config.keycloak.isConfigured,
            baseUrl: config.keycloak.baseUrl,
            realm: config.keycloak.realm,
            jwksUri: config.keycloak.jwksUri
          },
          fhir: {
            serverBases: config.fhir.serverBases
          }
        },
        timestamp: new Date().toISOString()
      })
      
      // For non-Keycloak errors, provide context but continue
      logger.server.warn('⚠️  Server initialization had issues but will attempt to continue')
      logger.server.warn('Some features may not work correctly until issues are resolved')
    }
  }
}

/**
 * Display server endpoints after successful startup
 */
export async function displayServerEndpoints(): Promise<void> {
  logger.server.info(`SMART Launcher available at ${config.baseUrl}`)
  logger.server.info(`Health check available at ${config.baseUrl}/health`)
  logger.server.info(`API Documentation available at ${config.baseUrl}/swagger`)
  logger.server.info(`Server Discovery available at ${config.baseUrl}/fhir-servers`)

  // Get server info from store for display
  try {
    const serverInfos = await getAllServers()
    if (serverInfos.length > 0) {
      logger.server.info(`SMART Protected FHIR Servers available:`)
      serverInfos.forEach((serverInfo) => {
        logger.server.info(`${serverInfo.identifier}: ${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`)
      })
    }
  } catch (error) {
    logger.server.warn('Could not display server endpoints', { error })
  }
}
