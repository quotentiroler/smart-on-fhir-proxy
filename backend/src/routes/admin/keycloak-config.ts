import { Elysia, t } from 'elysia'
import { logger } from '../../lib/logger'
import { config } from '../../config'
import fs from 'fs'
import path from 'path'

/**
 * Keycloak Configuration Management
 * Allows manual configuration of Keycloak connection when startup fails
 */

interface KeycloakConfig {
  baseUrl: string
  realm: string
  adminClientId?: string
  adminClientSecret?: string
}

const ENV_FILE_PATH = path.join(process.cwd(), '.env')

/**
 * Update environment variables in .env file and process.env
 */
function updateConfiguration(keycloakConfig: KeycloakConfig): void {
  let envContent = ''
  
  // Read existing .env file if it exists
  if (fs.existsSync(ENV_FILE_PATH)) {
    envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8')
  }
  
  // Parse existing env vars
  const envVars = new Map<string, string>()
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        envVars.set(key.trim(), valueParts.join('=').trim())
      }
    }
  })
  
  // Update Keycloak configuration in both .env file and process.env
  envVars.set('KEYCLOAK_BASE_URL', keycloakConfig.baseUrl)
  envVars.set('KEYCLOAK_REALM', keycloakConfig.realm)
  process.env.KEYCLOAK_BASE_URL = keycloakConfig.baseUrl
  process.env.KEYCLOAK_REALM = keycloakConfig.realm
  
  // Set admin client credentials if provided
  if (keycloakConfig.adminClientId) {
    envVars.set('KEYCLOAK_ADMIN_CLIENT_ID', keycloakConfig.adminClientId)
    process.env.KEYCLOAK_ADMIN_CLIENT_ID = keycloakConfig.adminClientId
  }
  if (keycloakConfig.adminClientSecret) {
    envVars.set('KEYCLOAK_ADMIN_CLIENT_SECRET', keycloakConfig.adminClientSecret)
    process.env.KEYCLOAK_ADMIN_CLIENT_SECRET = keycloakConfig.adminClientSecret
  }
  
  // Rebuild .env file content
  const lines: string[] = []
  
  // Add header comment
  lines.push('# Base URL for the proxy')
  if (envVars.has('BASE_URL')) {
    lines.push(`BASE_URL=${envVars.get('BASE_URL')}`)
  }
  lines.push('')
  
  // Keycloak section
  lines.push('# Keycloak configuration')
  lines.push(`KEYCLOAK_BASE_URL=${keycloakConfig.baseUrl}`)
  if (envVars.has('KEYCLOAK_DOMAIN')) {
    lines.push(`KEYCLOAK_DOMAIN=${envVars.get('KEYCLOAK_DOMAIN')}`)
  }
  lines.push(`KEYCLOAK_REALM=${keycloakConfig.realm}`)
  
  // Admin client credentials for dynamic registration
  if (keycloakConfig.adminClientId || keycloakConfig.adminClientSecret) {
    lines.push('')
    lines.push('# Admin client for dynamic client registration')
    if (keycloakConfig.adminClientId) {
      lines.push(`KEYCLOAK_ADMIN_CLIENT_ID=${keycloakConfig.adminClientId}`)
    }
    if (keycloakConfig.adminClientSecret) {
      lines.push(`KEYCLOAK_ADMIN_CLIENT_SECRET=${keycloakConfig.adminClientSecret}`)
    }
  }
  
  lines.push('')
  
  // FHIR section
  lines.push('# FHIR server configuration')
  if (envVars.has('FHIR_SERVER_BASE')) {
    lines.push(`FHIR_SERVER_BASE=${envVars.get('FHIR_SERVER_BASE')}`)
  }
  if (envVars.has('FHIR_SUPPORTED_VERSIONS')) {
    lines.push(`FHIR_SUPPORTED_VERSIONS=${envVars.get('FHIR_SUPPORTED_VERSIONS')}`)
  }
  lines.push('')
  
  // Port section
  lines.push('# Optional: Custom port (defaults to 8445)')
  if (envVars.has('PORT')) {
    lines.push(`PORT=${envVars.get('PORT')}`)
  }
  
  // Write back to file
  fs.writeFileSync(ENV_FILE_PATH, lines.join('\n'))
}

/**
 * Test Keycloak connection
 */
async function testKeycloakConnection(baseUrl: string, realm: string): Promise<boolean> {
  try {
    const realmUrl = `${baseUrl}/realms/${realm}`
    const response = await fetch(realmUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`Realm endpoint returned ${response.status}: ${response.statusText}`)
    }
    
    const realmInfo = await response.json()
    return !!(realmInfo.realm === realm)
  } catch (error) {
    logger.admin.error('Keycloak connection test failed', { error, baseUrl, realm })
    return false
  }
}

export const keycloakConfigRoutes = new Elysia({ prefix: '/keycloak-config', tags: ['admin'] })
  
  // Get current Keycloak configuration status
  .get('/status', async () => {
    return {
      baseUrl: config.keycloak.baseUrl,
      realm: config.keycloak.realm,
      hasAdminClient: !!(config.keycloak.adminClientId && config.keycloak.adminClientSecret),
      adminClientId: config.keycloak.adminClientId || null
    }
  }, {
    detail: {
      summary: 'Get Keycloak Admin Configuration',
      description: 'Get current Keycloak settings for administrative purposes. Use /auth/config for public availability check.',
      tags: ['admin']
    },
    response: t.Object({
      baseUrl: t.Union([t.String(), t.Null()], { description: 'Keycloak base URL' }),
      realm: t.Union([t.String(), t.Null()], { description: 'Keycloak realm name' }),
      hasAdminClient: t.Boolean({ description: 'Whether admin client credentials are configured' }),
      adminClientId: t.Union([t.String(), t.Null()], { description: 'Admin client ID (if configured)' })
    })
  })
  
  // Test Keycloak connection without saving
  .post('/test', async ({ body, set }) => {
    try {
      const isConnected = await testKeycloakConnection(body.baseUrl, body.realm)
      
      if (!isConnected) {
        set.status = 400
        return {
          success: false,
          error: 'Unable to connect to Keycloak or realm not found'
        }
      }
      
      return {
        success: true,
        message: 'Successfully connected to Keycloak realm'
      }
    } catch (error) {
      logger.admin.error('Keycloak connection test failed', { error })
      set.status = 500
      return {
        success: false,
        error: 'Connection test failed'
      }
    }
  }, {
    body: t.Object({
      baseUrl: t.String({ format: 'uri', description: 'Keycloak base URL (e.g., http://localhost:8080)' }),
      realm: t.String({ description: 'Keycloak realm name' })
    }),
    detail: {
      summary: 'Test Keycloak Connection',
      description: 'Test connection to Keycloak without saving configuration',
      tags: ['admin']
    },
    response: t.Object({
      success: t.Boolean({ description: 'Whether the test was successful' }),
      message: t.Optional(t.String({ description: 'Success message' })),
      error: t.Optional(t.String({ description: 'Error message if test failed' }))
    })
  })
  
  // Configure Keycloak connection
  .post('/configure', async ({ body, set }) => {
    try {
      // First test the connection
      const isConnected = await testKeycloakConnection(body.baseUrl, body.realm)
      
      if (!isConnected) {
        set.status = 400
        return {
          success: false,
          error: 'Unable to connect to Keycloak or realm not found. Please verify the URL and realm name.'
        }
      }
      
      // Update .env file
      updateConfiguration({
        baseUrl: body.baseUrl,
        realm: body.realm,
        adminClientId: body.adminClientId,
        adminClientSecret: body.adminClientSecret
      })
      
      logger.admin.info('Keycloak configuration updated', {
        baseUrl: body.baseUrl,
        realm: body.realm,
        hasAdminClient: !!(body.adminClientId && body.adminClientSecret)
      })
      
      return {
        success: true,
        message: 'Keycloak configuration updated successfully. Please restart the server for full effect.',
        restartRequired: true
      }
    } catch (error) {
      logger.admin.error('Failed to configure Keycloak', { error })
      set.status = 500
      return {
        success: false,
        error: 'Failed to save Keycloak configuration'
      }
    }
  }, {
    body: t.Object({
      baseUrl: t.String({ format: 'uri', description: 'Keycloak base URL (e.g., http://localhost:8080)' }),
      realm: t.String({ description: 'Keycloak realm name' }),
      adminClientId: t.Optional(t.String({ description: 'Admin client ID for dynamic registration (optional)' })),
      adminClientSecret: t.Optional(t.String({ description: 'Admin client secret for dynamic registration (optional)' }))
    }),
    detail: {
      summary: 'Configure Keycloak Connection',
      description: 'Save Keycloak configuration to environment and restart connection',
      tags: ['admin']
    },
    response: t.Object({
      success: t.Boolean({ description: 'Whether the configuration was saved' }),
      message: t.Optional(t.String({ description: 'Success message' })),
      error: t.Optional(t.String({ description: 'Error message if configuration failed' })),
      restartRequired: t.Optional(t.Boolean({ description: 'Whether a server restart is required' }))
    })
  })
