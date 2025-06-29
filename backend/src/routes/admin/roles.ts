import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '../../lib/keycloak-plugin'

/**
 * Healthcare Roles & Permissions Management
 */
export const rolesRoutes = new Elysia({ prefix: '/admin/roles' })
  .use(keycloakPlugin)
  
  .get('/', async ({ getAdmin }) => {
    const realmRoles = await getAdmin().roles.find()
    // Filter for healthcare-specific roles
    return realmRoles.filter(role => 
      role.name?.includes('healthcare') || 
      role.name?.includes('patient') ||
      role.name?.includes('practitioner') ||
      role.attributes?.['smart_role']?.includes('true')
    )
  }, {
    response: t.Array(t.Object({
      id: t.Optional(t.String({ description: 'Role ID' })),
      name: t.Optional(t.String({ description: 'Role name' })),
      description: t.Optional(t.String({ description: 'Role description' })),
      attributes: t.Optional(t.Record(t.String(), t.Array(t.String()))),
    })),
    detail: {
      summary: 'List Healthcare Roles',
      description: 'Get all healthcare-specific roles',
      tags: ['roles']
    }
  })
  
  .post('/', async ({ getAdmin, body }) => {
    const roleData = {
      name: body.name,
      description: body.description,
      attributes: {
        smart_role: ['true'],
        fhir_scopes: body.fhirScopes || []
      }
    }
    await getAdmin().roles.create(roleData)
    // Return the created role object (fetch by name)
    const created = await getAdmin().roles.findOneByName({ name: body.name })
    return created ?? {}
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      fhirScopes: t.Optional(t.Array(t.String()))
    }),
    response: t.Object({
      id: t.Optional(t.String({ description: 'Role ID' })),
      name: t.Optional(t.String({ description: 'Role name' })),
      description: t.Optional(t.String({ description: 'Role description' })),
      attributes: t.Optional(t.Record(t.String(), t.Array(t.String()))),
    }),
    detail: {
      summary: 'Create Healthcare Role',
      description: 'Create a new healthcare-specific role',
      tags: ['roles']
    }
  })

  .get('/:roleName', async ({ getAdmin, params }) => {
    const role = await getAdmin().roles.findOneByName({ name: params.roleName })
    return role ?? {}
  }, {
    response: t.Object({
      id: t.Optional(t.String({ description: 'Role ID' })),
      name: t.Optional(t.String({ description: 'Role name' })),
      description: t.Optional(t.String({ description: 'Role description' })),
      attributes: t.Optional(t.Record(t.String(), t.Array(t.String()))),
    }),
    detail: {
      summary: 'Get Healthcare Role',
      description: 'Get a healthcare-specific role by name',
      tags: ['roles']
    }
  })

  .put('/:roleName', async ({ getAdmin, params, body }) => {
    const role = await getAdmin().roles.findOneByName({ name: params.roleName })
    if (!role) throw new Error('Role not found')

    const updateData = {
      description: body.description,
      attributes: {
        ...role.attributes,
        fhir_scopes: body.fhirScopes || role.attributes?.fhir_scopes || []
      }
    }

    await getAdmin().roles.updateByName({ name: params.roleName }, updateData)
    return { success: true }
  }, {
    body: t.Object({
      description: t.Optional(t.String()),
      fhirScopes: t.Optional(t.Array(t.String()))
    }),
    response: t.Object({
      success: t.Boolean({ description: 'Whether the update was successful' })
    }),
    detail: {
      summary: 'Update Healthcare Role',
      description: 'Update a healthcare-specific role by name',
      tags: ['roles']
    }
  })

  .delete('/:roleName', async ({ getAdmin, params }) => {
    await getAdmin().roles.delByName({ name: params.roleName })
    return { success: true }
  }, {
    response: t.Object({
      success: t.Boolean({ description: 'Whether the delete was successful' })
    }),
    detail: {
      summary: 'Delete Healthcare Role',
      description: 'Delete a healthcare-specific role by name',
      tags: ['roles']
    }
  })
