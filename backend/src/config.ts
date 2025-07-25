import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get package.json path and read it
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJsonPath = join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

/**
 * Application configuration from environment variables
 */
export const config = {
  baseUrl: process.env.BASE_URL!,
  port: process.env.PORT || 8445,
  
  // Application name and version from package.json
  appName: packageJson.name,
  version: packageJson.version,
  
  keycloak: {
    baseUrl: process.env.KEYCLOAK_BASE_URL!,
    realm: process.env.KEYCLOAK_REALM!,
    // Note: clientId and clientSecret no longer needed for admin API
    // We use the user's token directly
    // Dynamically construct JWKS URI from base URL and realm
    get jwksUri() {
      return `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/certs`
    },
  },
  
  fhir: {
    // Support multiple FHIR servers - can be a single URL or comma-separated list
    serverBases: process.env.FHIR_SERVER_BASE!.split(',').map(s => s.trim()),
    supportedVersions: process.env.FHIR_SUPPORTED_VERSIONS?.split(',').map(s => s.trim()) || ['R4'],
  },

  smart: {
    configCacheTtl: parseInt(process.env.SMART_CONFIG_CACHE_TTL || '300000'), // 5 minutes
    scopesSupported: process.env.SMART_SCOPES_SUPPORTED?.split(',').map(s => s.trim()),
    capabilities: process.env.SMART_CAPABILITIES?.split(',').map(s => s.trim()),
  }
} as const
