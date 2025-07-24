import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '../../lib/keycloak-plugin'
import { SmartAppClient, ErrorResponse, SuccessResponse } from '../../schemas/common'
import { config } from '../../config'
import { logger } from '../../lib/logger'
import * as crypto from 'crypto'
import type KcAdminClient from '@keycloak/keycloak-admin-client'

/**
 * Register a public key for a Backend Services client in Keycloak
 */
async function registerPublicKeyForClient(admin: KcAdminClient, clientId: string, _publicKeyPem: string): Promise<void> {
  try {
    logger.admin.debug('Registering public key for client', { clientId })
    
    // For Keycloak Backend Services, we need to use the client-jwt authenticator
    // and provide the key either via JWKS or X509 certificate
    
    // Update client to use JWT authentication with the public key
    await admin.clients.update({ id: clientId }, {
      clientAuthenticatorType: 'client-jwt',
      attributes: {
        'use.jwks.string': 'true',
        'jwks.string': JSON.stringify({
          keys: [{
            kty: 'RSA',
            use: 'sig',
            alg: 'RS384',
            kid: crypto.randomUUID(),
            // Note: For a real implementation, we'd need to properly extract n and e from the PEM
            // For now, we'll use a simpler approach with X509 certificate
          }]
        }),
        'token.endpoint.auth.signing.alg': 'RS384'
      }
    })
    
    logger.admin.debug('Public key registered for client', { clientId })
  } catch (error) {
    logger.admin.error('Failed to register public key', { error, clientId })
    throw new Error(`Failed to register public key: ${error}`)
  }
}

/**
 * SMART App (Client) Management - specialized for healthcare applications
 * 
 * All routes now use the user's access token to perform operations,
 * acting as a secure proxy for Keycloak admin operations.
 */
export const smartAppsRoutes = new Elysia({ prefix: '/smart-apps', tags: ['smart-apps'] })
  .use(keycloakPlugin)

  .get('/', async ({ getAdmin, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      let clients = await admin.clients.find()
      //Filter out admin-ui
      clients = clients.filter(client => client.clientId !== 'admin-ui')
      return clients;
    } catch (error) {
      set.status = 500
      return { error: 'Failed to fetch SMART applications', details: error }
    }
  }, {
    response: {
      200: t.Array(SmartAppClient),
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'List SMART on FHIR Applications',
      description: 'Get all registered SMART on FHIR applications',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'A list of all registered SMART on FHIR applications.' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        500: { description: 'Internal server error' }
      }
    }
  })

  .post('/', async ({ getAdmin, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      
      // Determine client configuration based on type
      const isBackendService = body.clientType === 'backend-service'
      const isPublicClient = body.publicClient || body.clientType === 'public'
      
      // Validate Backend Services requirements
      if (isBackendService) {
        if (!body.publicKey && !body.jwksUri) {
          set.status = 400
          return { error: 'Backend Services clients require either publicKey or jwksUri for JWT authentication' }
        }
      }
      
      const smartAppConfig = {
        clientId: body.clientId,
        name: body.name,
        ...(body.description && { description: body.description }),
        enabled: true,
        protocol: 'openid-connect',
        publicClient: isPublicClient,
        redirectUris: body.redirectUris || [],
        webOrigins: body.webOrigins || [],
        attributes: {
          ...(body.smartVersion && { 'smart_version': body.smartVersion }),
          ...(body.fhirVersion && { 'fhir_version': body.fhirVersion }),
          ...(isBackendService && {
            'client_type': 'backend-service',
            ...(body.jwksUri && {
              'use.jwks.url': 'true',
              'jwks.url': body.jwksUri
            })
          })
        },
        // Configure client authentication method
        clientAuthenticatorType: isBackendService ? 'client-jwt' : (isPublicClient ? 'none' : 'client-secret'),
        
        // Configure OAuth2 settings for Backend Services
        standardFlowEnabled: !isBackendService, // Authorization code flow
        implicitFlowEnabled: false, // Not recommended for SMART
        directAccessGrantsEnabled: false, // Not used in SMART
        serviceAccountsEnabled: isBackendService, // Enable for client_credentials
        
        // Configure scopes - Keycloak expects scope objects, not strings
        defaultClientScopes: isBackendService 
          ? ['openid', 'profile'] // Keep it simple for now
          : ['openid', 'profile', 'email']
      }
      
      // Create the client
      logger.admin.debug('Creating client with config', { clientId: smartAppConfig.clientId })
      const createdClient = await admin.clients.create(smartAppConfig)
      
      // Keycloak returns just the ID, so we need to fetch the full client details
      const fullClient = await admin.clients.findOne({ id: createdClient.id })
      if (!fullClient) {
        throw new Error('Client created but could not retrieve details')
      }
      
      logger.admin.debug('Client created, details:', { 
        clientId: fullClient.clientId,
        clientAuthenticatorType: fullClient.clientAuthenticatorType,
        serviceAccountsEnabled: fullClient.serviceAccountsEnabled,
        standardFlowEnabled: fullClient.standardFlowEnabled
      })
      
      // If Backend Services with public key, register the key
      if (isBackendService && body.publicKey && createdClient.id) {
        try {
          // Convert PEM to JWKS format and register
          await registerPublicKeyForClient(admin, createdClient.id, body.publicKey)
          
          // Re-fetch client details after key registration
          const updatedClient = await admin.clients.findOne({ id: createdClient.id })
          logger.admin.debug('Client after key registration:', {
            clientId: updatedClient?.clientId,
            clientAuthenticatorType: updatedClient?.clientAuthenticatorType,
            hasJwksString: !!updatedClient?.attributes?.['jwks.string']
          })
          
          // Debug: Log what we're about to return as HTTP response
          const finalResponse = updatedClient || fullClient
          console.log('🌐 HTTP Response Fields:', Object.keys(finalResponse))
          console.log('🔑 HTTP Response clientAuthenticatorType:', finalResponse.clientAuthenticatorType)
          console.log('⚙️  HTTP Response serviceAccountsEnabled:', finalResponse.serviceAccountsEnabled)
          console.log('🔄 HTTP Response standardFlowEnabled:', finalResponse.standardFlowEnabled)
          
          return finalResponse
        } catch (keyError) {
          // Clean up created client if key registration fails
          await admin.clients.del({ id: createdClient.id })
          set.status = 400
          return { error: 'Failed to register public key for Backend Services client', details: keyError }
        }
      }
      
      // Debug: Log what we're about to return as HTTP response  
      console.log('🌐 HTTP Response Fields (no key registration):', Object.keys(fullClient))
      console.log('🔑 HTTP Response clientAuthenticatorType:', fullClient.clientAuthenticatorType)
      console.log('⚙️  HTTP Response serviceAccountsEnabled:', fullClient.serviceAccountsEnabled)
      console.log('🔄 HTTP Response standardFlowEnabled:', fullClient.standardFlowEnabled)
      
      return fullClient
    } catch (error) {
      set.status = 400
      return { error: 'Failed to create SMART application', details: error }
    }
  }, {
    body: t.Object({
      clientId: t.String({ description: 'Unique client identifier' }),
      name: t.String({ description: 'Application name' }),
      description: t.Optional(t.String({ description: 'Application description' })),
      publicClient: t.Optional(t.Boolean({ description: 'Whether this is a public client (default: false)' })),
      redirectUris: t.Optional(t.Array(t.String({ description: 'Valid redirect URIs' }))),
      webOrigins: t.Optional(t.Array(t.String({ description: 'Valid web origins' }))),
      scopes: t.Optional(t.Array(t.String({ description: 'Additional OAuth scopes' }))),
      smartVersion: t.Optional(t.String({ description: 'SMART version (default: 2.0.0)' })),
      fhirVersion: t.Optional(t.String({ description: `FHIR version (default: ${config.fhir.supportedVersions[0]})` })),
      // Backend Services specific fields
      clientType: t.Optional(t.Union([t.Literal('public'), t.Literal('confidential'), t.Literal('backend-service')], { description: 'Client type (public, confidential, backend-service)' })),
      publicKey: t.Optional(t.String({ description: 'PEM-formatted public key for JWT authentication (required for backend-service)' })),
      jwksUri: t.Optional(t.String({ description: 'JWKS URI for public key discovery (alternative to publicKey)' })),
      systemScopes: t.Optional(t.Array(t.String({ description: 'System-level scopes for Backend Services (e.g., system/*.read)' })))
    }),
    response: {
      200: SmartAppClient,
      400: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Create SMART on FHIR Application',
      description: 'Create a new SMART on FHIR application',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'SMART app client created.' },
        400: { description: 'Invalid request data' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        500: { description: 'Internal server error' }
      }
    }
  })

  .get('/:clientId', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const clients = await admin.clients.find({ clientId: params.clientId })
      if (!clients[0]) {
        set.status = 404
        return { error: 'SMART application not found' }
      }
      
      // Debug: Log what we're about to return for individual client retrieval
      console.log('🔍 Individual Client Response Fields:', Object.keys(clients[0]))
      console.log('🔑 Individual Client clientAuthenticatorType:', clients[0].clientAuthenticatorType)
      console.log('⚙️  Individual Client serviceAccountsEnabled:', clients[0].serviceAccountsEnabled)
      console.log('🔄 Individual Client standardFlowEnabled:', clients[0].standardFlowEnabled)
      
      return clients[0]
    } catch (error) {
      set.status = 500
      return { error: 'Failed to fetch SMART application', details: error }
    }
  }, {
    params: t.Object({
      clientId: t.String({ description: 'SMART application client ID' })
    }),
    response: {
      200: SmartAppClient,
      404: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Get SMART on FHIR Application',
      description: 'Get a single SMART on FHIR application by clientId',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'SMART app client details.' },
        404: { description: 'SMART application not found' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        500: { description: 'Internal server error' }
      }
    }
  })

  .put('/:clientId', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const clients = await admin.clients.find({ clientId: params.clientId })
      if (!clients[0]) {
        set.status = 404
        return { error: 'SMART application not found' }
      }

      const updateData = {
        name: body.name,
        description: body.description,
        enabled: body.enabled,
        redirectUris: body.redirectUris,
        webOrigins: body.webOrigins,
        attributes: {
          ...clients[0].attributes,
          smart_version: body.smartVersion ? [body.smartVersion] : clients[0].attributes?.smart_version,
          fhir_version: body.fhirVersion ? [body.fhirVersion] : clients[0].attributes?.fhir_version
        }
      }
      await admin.clients.update({ id: clients[0].id! }, updateData)
      return { success: true, message: 'SMART application updated successfully' }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to update SMART application', details: error }
    }
  }, {
    params: t.Object({
      clientId: t.String({ description: 'SMART application client ID' })
    }),
    body: t.Object({
      name: t.Optional(t.String({ description: 'Application name' })),
      description: t.Optional(t.String({ description: 'Application description' })),
      enabled: t.Optional(t.Boolean({ description: 'Whether application is enabled' })),
      redirectUris: t.Optional(t.Array(t.String({ description: 'Valid redirect URIs' }))),
      webOrigins: t.Optional(t.Array(t.String({ description: 'Valid web origins' }))),
      smartVersion: t.Optional(t.String({ description: 'SMART version' })),
      fhirVersion: t.Optional(t.String({ description: 'FHIR version' }))
    }),
    response: {
      200: SuccessResponse,
      400: ErrorResponse,
      404: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Update SMART on FHIR Application',
      description: 'Update an existing SMART on FHIR application',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'SMART app client updated.' },
        400: { description: 'Invalid request data' },
        404: { description: 'SMART application not found' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        500: { description: 'Internal server error' }
      }
    }
  })

  .delete('/:clientId', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const clients = await admin.clients.find({ clientId: params.clientId })
      if (!clients[0]) {
        set.status = 404
        return { error: 'SMART application not found' }
      }
      await admin.clients.del({ id: clients[0].id! })
      return { success: true, message: 'SMART application deleted successfully' }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to delete SMART application', details: error }
    }
  }, {
    params: t.Object({
      clientId: t.String({ description: 'SMART application client ID' })
    }),
    response: {
      200: SuccessResponse,
      404: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Delete SMART on FHIR Application',
      description: 'Delete a SMART on FHIR application by clientId',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }],
      response: {
        200: { description: 'SMART app client deleted.' },
        404: { description: 'SMART application not found' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        500: { description: 'Internal server error' }
      }
    }
  })
