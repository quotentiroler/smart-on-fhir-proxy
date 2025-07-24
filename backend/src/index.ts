import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { keycloakPlugin } from './lib/keycloak-plugin'
import { fhirRoutes } from './routes/fhir'
import { serverRoutes } from './routes/info'
import { serverDiscoveryRoutes } from './routes/fhir-servers'
import { config } from './config'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { logger } from './lib/logger'
import { initializeServer, displayServerEndpoints } from './init'

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
  
  // Wildcard catch-all routes for common FHIR paths that don't include server/version
  // Based on issue: /metadata should return 200, /Patient should return 401
  .get('/metadata', ({ set }) => {
    // For FHIR proxies, metadata should indicate available servers rather than serving a default
    set.status = 200
    return { 
      resourceType: 'CapabilityStatement',
      id: 'smart-proxy-capability',
      status: 'active',
      experimental: true,
      name: 'SMART on FHIR Proxy',
      title: 'SMART on FHIR Proxy Server',
      description: 'This is a SMART on FHIR proxy server. Please specify a server name and FHIR version in your requests.',
      kind: 'instance',
      software: {
        name: 'SMART on FHIR Proxy',
        version: '1.0.0'
      },
      fhirVersion: '4.0.1',
      format: ['application/fhir+json'],
      rest: [{
        mode: 'server',
        documentation: `Available FHIR servers can be found at: ${config.baseUrl}/fhir-servers`,
        resource: []
      }]
    }
  })
  .all('/Patient*', ({ set }) => {
    set.status = 401
    return { 
      error: 'Authentication required',
      message: 'FHIR resource requests must include server name, version, and authorization. Example: /smart-proxy/{server_name}/{fhir_version}/Patient with Bearer token',
      availableServers: `${config.baseUrl}/fhir-servers`
    }
  })
  .all('/Patient', ({ set }) => {
    set.status = 401
    return { 
      error: 'Authentication required',
      message: 'FHIR resource requests must include server name, version, and authorization. Example: /smart-proxy/{server_name}/{fhir_version}/Patient with Bearer token',
      availableServers: `${config.baseUrl}/fhir-servers`
    }
  })
  .all('/Observation*', ({ set }) => {
    set.status = 401
    return { 
      error: 'Authentication required',
      message: 'FHIR resource requests must include server name, version, and authorization. Example: /smart-proxy/{server_name}/{fhir_version}/Observation with Bearer token',
      availableServers: `${config.baseUrl}/fhir-servers`
    }
  })
  .all('/Observation', ({ set }) => {
    set.status = 401
    return { 
      error: 'Authentication required',
      message: 'FHIR resource requests must include server name, version, and authorization. Example: /smart-proxy/{server_name}/{fhir_version}/Observation with Bearer token',
      availableServers: `${config.baseUrl}/fhir-servers`
    }
  })
  .all('/Encounter*', ({ set }) => {
    set.status = 401
    return { 
      error: 'Authentication required',
      message: 'FHIR resource requests must include server name, version, and authorization. Example: /smart-proxy/{server_name}/{fhir_version}/Encounter with Bearer token',
      availableServers: `${config.baseUrl}/fhir-servers`
    }
  })
  .all('/Encounter', ({ set }) => {
    set.status = 401
    return { 
      error: 'Authentication required',
      message: 'FHIR resource requests must include server name, version, and authorization. Example: /smart-proxy/{server_name}/{fhir_version}/Encounter with Bearer token',
      availableServers: `${config.baseUrl}/fhir-servers`
    }
  })
  
  .use(fhirRoutes) // the actual FHIR proxy endpoints

// Initialize and start server
initializeServer()
  .then(async () => {
    app.listen(config.port, async () => {
      await displayServerEndpoints()
    })
  })
  .catch((error) => {
    logger.server.error('Failed to start server', { error })
    process.exit(1)
  })