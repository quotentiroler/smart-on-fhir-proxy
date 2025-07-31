import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '../../lib/keycloak-plugin'
import { ErrorResponse } from '../../schemas/common'
import { handleAdminError } from '../../lib/admin-error-handler'
import type { IdentityProvider } from '../../types'

/**
 * Identity Provider Management - handles external IdP integrations
 */
export const identityProvidersRoutes = new Elysia({ prefix: '/idps' })
  .use(keycloakPlugin)

  .get('/count', async ({ getAdmin, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const providers = await admin.identityProviders.find()
      // Count only enabled providers
      const enabledCount = providers.filter(provider => provider.enabled !== false).length
      return { count: enabledCount, total: providers.length }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    responses: {
      200: t.Object({
        count: t.Number({ description: 'Number of enabled identity providers' }),
        total: t.Number({ description: 'Total number of identity providers' })
      }, { description: 'Identity providers count' }),
      401: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Get Identity Providers Count',
      description: 'Get the count of enabled and total identity providers',
      tags: ['identity-providers'],
      responses: {
        200: { description: 'Identity providers count' }
      }
    }
  })

  .get('/', async ({ getAdmin, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const providers = await admin.identityProviders.find()
      return providers.map(provider => ({
        alias: provider.alias ?? '',
        providerId: provider.providerId ?? '',
        displayName: provider.displayName ?? '',
        enabled: provider.enabled ?? false,
        config: provider.config ?? {}
      }));
    } catch (error) {
      set.status = 500
      return { error: 'Failed to fetch identity providers', details: error }
    }
  }, {
    responses: {
      200: t.Array(t.Object({
        alias: t.String({ description: 'Provider alias' }),
        providerId: t.String({ description: 'Provider type' }),
        displayName: t.Optional(t.String({ description: 'Display name' })),
        enabled: t.Optional(t.Boolean({ description: 'Whether provider is enabled' })),
        config: t.Optional(t.Object({}))
      }), { description: 'A list of all configured identity providers' }),
      401: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'List Identity Providers',
      description: 'Get all configured identity providers',
      tags: ['identity-providers'],
      responses: {
        200: { description: 'A list of all configured identity providers' }
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
      await admin.identityProviders.create(body)
      const created = await admin.identityProviders.findOne({ alias: (body as IdentityProvider).alias })
      return {
        alias: created?.alias ?? (body as IdentityProvider).alias ?? '',
        providerId: created?.providerId ?? (body as IdentityProvider).providerId ?? '',
        displayName: created?.displayName ?? '',
        enabled: created?.enabled ?? false,
        config: created?.config ?? {}
      }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to create identity provider', details: error }
    }
  }, {
    body: t.Object({
      alias: t.String(),
      providerId: t.String(),
      displayName: t.Optional(t.String()),
      enabled: t.Optional(t.Boolean()),
      config: t.Object({
        // Common fields
        displayName: t.Optional(t.String()),
        entityId: t.Optional(t.String()),
        singleSignOnServiceUrl: t.Optional(t.String()),
        singleLogoutServiceUrl: t.Optional(t.String()),
        metadataDescriptorUrl: t.Optional(t.String()),
        enabled: t.Optional(t.Boolean()),
        
        // OIDC/OAuth2 specific fields
        clientSecret: t.Optional(t.String()),
        tokenUrl: t.Optional(t.String()),
        userInfoUrl: t.Optional(t.String()),
        issuer: t.Optional(t.String()),
        defaultScopes: t.Optional(t.String()),
        logoutUrl: t.Optional(t.String()),
        
        // SAML specific fields
        signatureAlgorithm: t.Optional(t.String()),
        nameIdPolicyFormat: t.Optional(t.String()),
        signingCertificate: t.Optional(t.String()),
        validateSignature: t.Optional(t.Boolean()),
        wantAuthnRequestsSigned: t.Optional(t.Boolean()),
        
        // Allow additional configuration
        additionalConfig: t.Optional(t.Object({}, { 
          description: 'Additional configuration as key-value pairs',
          additionalProperties: t.Any()
        }))
      })
    }),
    responses: {
      200: t.Object({
        alias: t.String({ description: 'Provider alias' }),
        providerId: t.String({ description: 'Provider type' }),
        displayName: t.Optional(t.String({ description: 'Display name' })),
        enabled: t.Optional(t.Boolean({ description: 'Whether provider is enabled' })),
        config: t.Optional(t.Object({}))
      }, { description: 'Identity provider created successfully' }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Create Identity Provider',
      description: 'Create a new identity provider',
      tags: ['identity-providers'],
      responses: {
        200: { description: 'Identity provider created successfully' }
      }
    }
  })

  .get('/:alias', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const provider = await admin.identityProviders.findOne({ alias: params.alias })
      if (!provider) {
        set.status = 404
        return { error: 'Identity provider not found' }
      }
      return {
        alias: provider.alias ?? params.alias ?? '',
        providerId: provider.providerId ?? '',
        displayName: provider.displayName ?? '',
        enabled: provider.enabled ?? false,
        config: provider.config ?? {}
      }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to fetch identity provider', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        alias: t.String({ description: 'Provider alias' }),
        providerId: t.String({ description: 'Provider type' }),
        displayName: t.Optional(t.String({ description: 'Display name' })),
        enabled: t.Optional(t.Boolean({ description: 'Whether provider is enabled' })),
        config: t.Optional(t.Object({}))
      }, { description: 'Identity provider details' }),
      401: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Get Identity Provider',
      description: 'Get an identity provider by alias',
      tags: ['identity-providers'],
      responses: {
        200: { description: 'Identity provider details' }
      }
    }
  })

  .put('/:alias', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.identityProviders.update({ alias: params.alias }, body)
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to update identity provider', details: error }
    }
  }, {
    body: t.Object({
      displayName: t.Optional(t.String()),
      enabled: t.Optional(t.Boolean()),
      config: t.Optional(t.Object({
        // Common fields
        displayName: t.Optional(t.String()),
        entityId: t.Optional(t.String()),
        singleSignOnServiceUrl: t.Optional(t.String()),
        singleLogoutServiceUrl: t.Optional(t.String()),
        metadataDescriptorUrl: t.Optional(t.String()),
        enabled: t.Optional(t.Boolean()),
        
        // OIDC/OAuth2 specific fields
        clientSecret: t.Optional(t.String()),
        tokenUrl: t.Optional(t.String()),
        userInfoUrl: t.Optional(t.String()),
        issuer: t.Optional(t.String()),
        defaultScopes: t.Optional(t.String()),
        logoutUrl: t.Optional(t.String()),
        
        // SAML specific fields
        signatureAlgorithm: t.Optional(t.String()),
        nameIdPolicyFormat: t.Optional(t.String()),
        signingCertificate: t.Optional(t.String()),
        validateSignature: t.Optional(t.Boolean()),
        wantAuthnRequestsSigned: t.Optional(t.Boolean()),
        
        // Allow additional configuration
        additionalConfig: t.Optional(t.Object({}, { 
          description: 'Additional configuration as key-value pairs',
          additionalProperties: t.Any()
        }))
      }))
    }),
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }, { description: 'Identity provider updated successfully' }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Update Identity Provider',
      description: 'Update an identity provider by alias',
      tags: ['identity-providers'],
      responses: {
        200: { description: 'Identity provider updated successfully' }
      }
    }
  })

  .delete('/:alias', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.identityProviders.del({ alias: params.alias })
      return { success: true }
    } catch (error) {
      set.status = 404
      return { error: 'Identity provider not found or could not be deleted', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }, { description: 'Identity provider deleted successfully' }),
      401: ErrorResponse,
      404: ErrorResponse
    },
    detail: {
      summary: 'Delete Identity Provider',
      description: 'Delete an identity provider by alias',
      tags: ['identity-providers'],
      responses: {
        200: { description: 'Identity provider deleted successfully' }
      }
    }
  })
