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
  baseUrl: process.env.BASE_URL || 'http://localhost:8445',
  port: process.env.PORT || 8445,
  
  // Application name and version from package.json
  name: packageJson.name,
  displayName: packageJson.displayName || packageJson.name,
  version: packageJson.version,
  
  keycloak: {
    // Dynamic getters that read from process.env for real-time updates
    get baseUrl() {
      return process.env.KEYCLOAK_BASE_URL || null
    },
    
    get realm() {
      return process.env.KEYCLOAK_REALM || null
    },
    
    get adminClientId() {
      return process.env.KEYCLOAK_ADMIN_CLIENT_ID || null
    },
    
    get adminClientSecret() {
      return process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || null
    },
    
    // Check if Keycloak is configured
    get isConfigured() {
      return !!(this.baseUrl && this.realm)
    },
    
    // Public URL for browser redirects (defaults to baseUrl if not specified)
    get publicUrl() {   
      if (!this.baseUrl) return null
      const domain = process.env.KEYCLOAK_DOMAIN;
      if (!domain) return this.baseUrl
      // Use regex to replace the hostname in the URL, preserving protocol and port
      return this.baseUrl.replace(/\/\/([^:/]+)(:[0-9]+)?/, `//${domain}$2`)
    },
    
    // Dynamically construct JWKS URI from base URL and realm
    get jwksUri() {
      if (!this.baseUrl || !this.realm) return null
      return `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/certs`
    },
  },
  
  fhir: {
    // Support multiple FHIR servers - can be a single URL or comma-separated list
    serverBases: (process.env.FHIR_SERVER_BASE ?? 'http://localhost:8081/fhir').split(',').map(s => s.trim()),
    supportedVersions: process.env.FHIR_SUPPORTED_VERSIONS?.split(',').map(s => s.trim()) || ['R4'],
  },

  smart: {
    configCacheTtl: parseInt(process.env.SMART_CONFIG_CACHE_TTL || '300000'), // 5 minutes
    scopesSupported: process.env.SMART_SCOPES_SUPPORTED?.split(',').map(s => s.trim()),
    capabilities: process.env.SMART_CAPABILITIES?.split(',').map(s => s.trim()),
  },

  cors: {
    // Support multiple origins - can be a single URL or comma-separated list
    // Defaults to common development origins
    get origins() {
      const defaultOrigins = [
        'http://localhost:5173', // Vite dev server
        'http://localhost:3000', // React dev server  
        'http://localhost:8445', // App server
        config.baseUrl // Fallback to base URL
      ];
      
      const envOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()) || [];
      
      // In development mode, allow all localhost origins
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        const allOrigins = [...new Set([...defaultOrigins, ...envOrigins])];
        return allOrigins.filter(Boolean);
      }
      
      // In production, only use explicitly configured origins or fallback to base URL
      return envOrigins.length > 0 ? envOrigins : [config.baseUrl];
    }
  }
} as const
