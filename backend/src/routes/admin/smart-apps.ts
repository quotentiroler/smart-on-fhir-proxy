import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '../../lib/keycloak-plugin'
import { SmartAppClient, ErrorResponse, SuccessResponse } from '../../schemas/common'
import { config } from '../../config'

/**
 * SMART App (Client) Management - specialized for healthcare applications
 * 
 * All routes now use the user's access token to perform operations,
 * acting as a secure proxy for Keycloak admin operations.
 */
export const smartAppsRoutes = new Elysia({ prefix: '/admin/smart-apps', tags: ['smart-apps'] })
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
      
      // Filter out system/internal Keycloak clients - only show actual SMART on FHIR applications
      const systemClients = [
        'admin-ui',
        'account',
        'account-console', 
        'admin-cli',
        'broker',
        'realm-management',
        'security-admin-console',
        'master-realm',
        'admin-cli'
      ]
      
      clients = clients.filter(client => {
        // Filter out system clients
        if (systemClients.includes(client.clientId || '')) {
          return false
        }
        
        // Filter out clients with placeholder/template names
        if (client.name && client.name.includes('${client_')) {
          return false
        }
        
        // Filter out clients with clientId starting with system prefixes
        if (client.clientId && (
          client.clientId.startsWith('admin-') ||
          client.clientId.startsWith('security-') ||
          client.clientId.startsWith('account-') ||
          client.clientId.startsWith('broker-') ||
          client.clientId.startsWith('realm-')
        )) {
          return false
        }
        
        return true
      })
      
      // Enhance client data with UI-specific fields
      const enhancedClients = clients.map(client => {
        // Determine app type from attributes or client configuration
        const hasRedirectUris = client.redirectUris && client.redirectUris.length > 0
        const isBackendService = !hasRedirectUris && !client.publicClient
        
        let appType: 'backend-service' | 'standalone-app' | 'ehr-launch-app' | 'agent' = 'standalone-app'
        if (isBackendService) {
          appType = 'backend-service'
        } else if (client.attributes?.launch_context) {
          appType = 'ehr-launch-app'
        } else if (client.attributes?.app_type?.[0] === 'agent') {
          appType = 'agent'
        }

        // Determine authentication type
        let authenticationType: 'asymmetric' | 'symmetric' | 'none' = 'asymmetric'
        if (client.publicClient) {
          authenticationType = 'none'
        } else if (client.attributes?.token_endpoint_auth_method?.[0] === 'client_secret_basic') {
          authenticationType = 'symmetric'
        }

        return {
          id: client.id,
          clientId: client.clientId,
          name: client.name || client.clientId || 'Unnamed Application',
          description: client.description || `SMART on FHIR application: ${client.clientId}`,
          enabled: client.enabled,
          protocol: client.protocol,
          publicClient: client.publicClient,
          redirectUris: client.redirectUris,
          webOrigins: client.webOrigins,
          attributes: client.attributes,
          defaultClientScopes: client.defaultClientScopes,
          appType,
          authenticationType,
          lastUsed: client.attributes?.last_used?.[0] || new Date().toISOString().split('T')[0],
          scopeSetId: client.attributes?.scope_set_id?.[0] || '',
          customScopes: client.attributes?.custom_scopes || []
        }
      })
      
      return enhancedClients;
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
      const smartAppConfig = {
        clientId: body.clientId,
        name: body.name,
        description: body.description,
        enabled: true,
        protocol: 'openid-connect',
        publicClient: body.publicClient || false,
        redirectUris: body.redirectUris || [],
        webOrigins: body.webOrigins || [],
        attributes: {
          'smart_version': [body.smartVersion || '2.0.0'],
          'fhir_version': [body.fhirVersion || config.fhir.supportedVersions[0]],
          'app_type': body.appType ? [body.appType] : ['standalone-app'],
          'token_endpoint_auth_method': body.authenticationType === 'symmetric' ? ['client_secret_basic'] : ['private_key_jwt'],
          'scope_set_id': body.scopeSetId ? [body.scopeSetId] : [],
          'custom_scopes': body.customScopes || [],
          'last_used': [new Date().toISOString().split('T')[0]]
        },
        defaultClientScopes: [
          'openid', 'profile', 'launch', 'launch/patient', 'offline_access',
          ...(body.scopes || [])
        ]
      }
      
      const createdClient = await admin.clients.create(smartAppConfig)
      
      // Get the full client data after creation
      const fullClient = await admin.clients.findOne({ id: createdClient.id })
      
      if (!fullClient) {
        throw new Error('Failed to retrieve created client')
      }
      
      // Return enhanced client data
      return {
        id: fullClient.id,
        clientId: fullClient.clientId,
        name: fullClient.name,
        description: fullClient.description,
        enabled: fullClient.enabled,
        protocol: fullClient.protocol,
        publicClient: fullClient.publicClient,
        redirectUris: fullClient.redirectUris,
        webOrigins: fullClient.webOrigins,
        attributes: fullClient.attributes,
        defaultClientScopes: fullClient.defaultClientScopes,
        appType: body.appType || 'standalone-app',
        authenticationType: body.authenticationType || (body.publicClient ? 'none' : 'asymmetric'),
        lastUsed: new Date().toISOString().split('T')[0],
        scopeSetId: body.scopeSetId || '',
        customScopes: body.customScopes || []
      }
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
      // Enhanced UI fields
      appType: t.Optional(t.Union([
        t.Literal('backend-service'),
        t.Literal('standalone-app'),
        t.Literal('ehr-launch-app'),
        t.Literal('agent')
      ], { description: 'SMART app type' })),
      authenticationType: t.Optional(t.Union([
        t.Literal('asymmetric'),
        t.Literal('symmetric'),
        t.Literal('none')
      ], { description: 'Authentication type' })),
      scopeSetId: t.Optional(t.String({ description: 'Associated scope set ID' })),
      customScopes: t.Optional(t.Array(t.String({ description: 'Custom scopes' })))
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
