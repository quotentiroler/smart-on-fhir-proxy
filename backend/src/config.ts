/**
 * Application configuration from environment variables
 */
export const config = {
  baseUrl: process.env.BASE_URL!,
  port: process.env.PORT || 8445,
  
  keycloak: {
    baseUrl: process.env.KEYCLOAK_BASE_URL!,
    realm: process.env.KEYCLOAK_REALM!,
    // Note: clientId and clientSecret no longer needed for admin API
    // We use the user's token directly
    clientId: process.env.KEYCLOAK_CLIENT_ID!,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
    jwksUri: process.env.KEYCLOAK_JWKS_URI!,
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
