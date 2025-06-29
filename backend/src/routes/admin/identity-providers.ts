import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '../../lib/keycloak-plugin'
import type { IdentityProvider } from '../../types'

/**
 * Identity Provider Management - handles external IdP integrations
 */
export const identityProvidersRoutes = new Elysia({ prefix: '/admin/idps' })
  .use(keycloakPlugin)

  .get('/', async ({ getAdmin }) => {
    const providers = await getAdmin().identityProviders.find();
    return providers.map(provider => ({
      alias: provider.alias ?? '',
      providerId: provider.providerId ?? '',
      displayName: provider.displayName ?? '',
      enabled: provider.enabled ?? false,
      config: provider.config ?? {}
    }));
  }, {
    response: t.Array(t.Object({
      alias: t.String({ description: 'Provider alias' }),
      providerId: t.String({ description: 'Provider type' }),
      displayName: t.Optional(t.String({ description: 'Display name' })),
      enabled: t.Optional(t.Boolean({ description: 'Whether provider is enabled' })),
      config: t.Optional(t.Object({}))
    })),
    detail: {
      summary: 'List Identity Providers',
      description: 'Get all configured identity providers',
      tags: ['identity-providers'],
      response: { 200: { description: 'A list of all configured identity providers.' } }
    }
  })

  .post('/', async ({ getAdmin, body }) => {
    await getAdmin().identityProviders.create(body)
    const created = await getAdmin().identityProviders.findOne({ alias: (body as IdentityProvider).alias })
    return {
      alias: created?.alias ?? (body as IdentityProvider).alias ?? '',
      providerId: created?.providerId ?? (body as IdentityProvider).providerId ?? '',
      displayName: created?.displayName ?? '',
      enabled: created?.enabled ?? false,
      config: created?.config ?? {}
    }
  }, {
    body: t.Object({
      alias: t.String(),
      providerId: t.String(),
      config: t.Object({})
    }),
    response: t.Object({
      alias: t.String({ description: 'Provider alias' }),
      providerId: t.String({ description: 'Provider type' }),
      displayName: t.Optional(t.String({ description: 'Display name' })),
      enabled: t.Optional(t.Boolean({ description: 'Whether provider is enabled' })),
      config: t.Optional(t.Object({}))
    }),
    detail: {
      summary: 'Create Identity Provider',
      description: 'Create a new identity provider',
      tags: ['identity-providers'],
      response: { 200: { description: 'Identity provider created successfully.' } }
    }
  })

  .get('/:alias', async ({ getAdmin, params }) => {
    const provider = await getAdmin().identityProviders.findOne({ alias: params.alias })
    return {
      alias: provider?.alias ?? params.alias ?? '',
      providerId: provider?.providerId ?? '',
      displayName: provider?.displayName ?? '',
      enabled: provider?.enabled ?? false,
      config: provider?.config ?? {}
    }
  }, {
    response: t.Object({
      alias: t.String({ description: 'Provider alias' }),
      providerId: t.String({ description: 'Provider type' }),
      displayName: t.Optional(t.String({ description: 'Display name' })),
      enabled: t.Optional(t.Boolean({ description: 'Whether provider is enabled' })),
      config: t.Optional(t.Object({}))
    }),
    detail: {
      summary: 'Get Identity Provider',
      description: 'Get an identity provider by alias',
      tags: ['identity-providers'],
      response: { 200: { description: 'Identity provider details.' } }
    }
  })

  .put('/:alias', async ({ getAdmin, params, body }) => {
    await getAdmin().identityProviders.update({ alias: params.alias }, body)
    return { success: true }
  }, {
    body: t.Object({
      displayName: t.Optional(t.String()),
      enabled: t.Optional(t.Boolean()),
      config: t.Optional(t.Object({}))
    }),
    response: t.Object({
      success: t.Boolean({ description: 'Whether the update was successful' })
    }),
    detail: {
      summary: 'Update Identity Provider',
      description: 'Update an identity provider by alias',
      tags: ['identity-providers'],
      response: { 200: { description: 'Identity provider updated successfully.' } }
    }
  })

  .delete('/:alias', async ({ getAdmin, params }) => {
    await getAdmin().identityProviders.del({ alias: params.alias })
    return { success: true }
  }, {
    response: t.Object({
      success: t.Boolean({ description: 'Whether the delete was successful' })
    }),
    detail: {
      summary: 'Delete Identity Provider',
      description: 'Delete an identity provider by alias',
      tags: ['identity-providers'],
      response: { 200: { description: 'Identity provider deleted successfully.' } }
    }
  })
