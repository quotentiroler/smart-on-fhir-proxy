import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '../../lib/keycloak-plugin'
import { ErrorResponse } from '../../schemas/common'

/**
 * Healthcare Roles & Permissions Management
 * 
 * All routes now use the user's access token to perform operations,
 * acting as a secure proxy for Keycloak admin operations.
 */
export const rolesRoutes = new Elysia({ prefix: '/admin/roles' })
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
      const realmRoles = await admin.roles.find()

      return realmRoles;
    } catch (error) {
      set.status = 500
      return { error: 'Failed to fetch roles', details: error }
    }
  }, {
    response: {
      200: t.Array(t.Object({
        id: t.Optional(t.String({ description: 'Role ID' })),
        name: t.Optional(t.String({ description: 'Role name' })),
        description: t.Optional(t.String({ description: 'Role description' })),
        attributes: t.Optional(t.Record(t.String(), t.Array(t.String()))),
      })),
      401: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'List All Roles',
      description: 'Get all roles',
      tags: ['roles']
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
      const roleData = {
        name: body.name,
        description: body.description,
        attributes: {
          smart_role: ['true'],
          fhir_scopes: body.fhirScopes || []
        }
      }

      await admin.roles.create(roleData)
      // Return the created role object (fetch by name)
      const created = await admin.roles.findOneByName({ name: body.name })
      return created ?? {}
    } catch (error) {
      set.status = 400
      return { error: 'Failed to create role', details: error }
    }
  }, {
    body: t.Object({
      name: t.String({ description: 'Role name' }),
      description: t.Optional(t.String({ description: 'Role description' })),
      fhirScopes: t.Optional(t.Array(t.String({ description: 'FHIR scopes for this role' })))
    }),
    response: {
      200: t.Object({
        id: t.Optional(t.String({ description: 'Role ID' })),
        name: t.Optional(t.String({ description: 'Role name' })),
        description: t.Optional(t.String({ description: 'Role description' })),
        attributes: t.Optional(t.Record(t.String(), t.Array(t.String()))),
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Create Healthcare Role',
      description: 'Create a new healthcare-specific role',
      tags: ['roles']
    }
  })

  .get('/:roleName', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const role = await admin.roles.findOneByName({ name: params.roleName })

      if (!role) {
        set.status = 404
        return { error: 'Role not found' }
      }

      return role
    } catch (error) {
      set.status = 500
      return { error: 'Failed to fetch role', details: error }
    }
  }, {
    response: {
      200: t.Object({
        id: t.Optional(t.String({ description: 'Role ID' })),
        name: t.Optional(t.String({ description: 'Role name' })),
        description: t.Optional(t.String({ description: 'Role description' })),
        attributes: t.Optional(t.Record(t.String(), t.Array(t.String()))),
      }),
      401: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Get Healthcare Role',
      description: 'Get a healthcare-specific role by name',
      tags: ['roles']
    }
  })

  .put('/:roleName', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const role = await admin.roles.findOneByName({ name: params.roleName })

      if (!role) {
        set.status = 404
        return { error: 'Role not found' }
      }

      const updateData = {
        description: body.description,
        attributes: {
          ...role.attributes,
          fhir_scopes: body.fhirScopes || role.attributes?.fhir_scopes || []
        }
      }

      await admin.roles.updateByName({ name: params.roleName }, updateData)
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to update role', details: error }
    }
  }, {
    body: t.Object({
      description: t.Optional(t.String({ description: 'Role description' })),
      fhirScopes: t.Optional(t.Array(t.String({ description: 'FHIR scopes for this role' })))
    }),
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse,
      404: ErrorResponse
    },
    detail: {
      summary: 'Update Healthcare Role',
      description: 'Update a healthcare-specific role by name',
      tags: ['roles']
    }
  })

  .delete('/:roleName', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)

      // Check if role exists before deletion
      const role = await admin.roles.findOneByName({ name: params.roleName })
      if (!role) {
        set.status = 404
        return { error: 'Role not found' }
      }

      await admin.roles.delByName({ name: params.roleName })
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to delete role', details: error }
    }
  }, {
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse,
      404: ErrorResponse
    },
    detail: {
      summary: 'Delete Healthcare Role',
      description: 'Delete a healthcare-specific role by name',
      tags: ['roles']
    }
  })
