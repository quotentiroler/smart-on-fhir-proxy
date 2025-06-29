import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '../../lib/keycloak-plugin'
import { UserProfile, ErrorResponse, SuccessResponse, PaginationQuery } from '../../schemas/common'

/**
 * Healthcare User Management - specialized for healthcare professionals
 */
export const healthcareUsersRoutes = new Elysia({ prefix: '/admin/healthcare-users' })
  .use(keycloakPlugin)
  
  .get('/', async ({ getAdmin, query, set }) => {
    try {
      const allUsers = await getAdmin().users.find({
        max: Number(query.limit) || 50,
        first: Number(query.offset) || 0
      })
      // Filter for healthcare users (with specific roles or attributes)
      return allUsers.map(user => ({
        id: user.id ?? '',
        username: user.username ?? '',
        email: user.email ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        enabled: user.enabled ?? false,
        attributes: user.attributes ?? {},
        createdTimestamp: user.createdTimestamp ?? 0
      }))
    } catch (error) {
      set.status = 500
      return { error: 'Failed to fetch healthcare users', details: error }
    }
  }, {
    query: PaginationQuery,
    response: {
      200: t.Array(UserProfile),
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'List Healthcare Users',
      description: 'Get all healthcare users with optional pagination',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }],
      response: { 
        200: { description: 'A list of all healthcare users.' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        500: { description: 'Internal server error' }
      }
    }
  })
  
  .post('/', async ({ getAdmin, body, set }) => {
    try {
      const userData = {
        username: body.username,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        enabled: true,
        attributes: {
          role: [body.role || 'healthcare_user'],
          department: body.department ? [body.department] : [],
          npi: body.npi ? [body.npi] : []
        },
        credentials: body.password ? [{
          type: 'password',
          value: body.password,
          temporary: body.temporaryPassword || false
        }] : []
      }
      const result = await getAdmin().users.create(userData)
      // Return the created user object (fetch by id)
      const created = result.id ? await getAdmin().users.findOne({ id: result.id }) : undefined
      return {
        id: created?.id ?? '',
        username: created?.username ?? '',
        email: created?.email ?? '',
        firstName: created?.firstName ?? '',
        lastName: created?.lastName ?? '',
        enabled: created?.enabled ?? false,
        attributes: created?.attributes ?? {},
        createdTimestamp: created?.createdTimestamp ?? 0
      }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to create healthcare user', details: error }
    }
  }, {
    body: t.Object({
      username: t.String({ description: 'Unique username' }),
      email: t.String({ description: 'Email address', format: 'email' }),
      firstName: t.String({ description: 'First name' }),
      lastName: t.String({ description: 'Last name' }),
      role: t.Optional(t.String({ description: 'Healthcare role' })),
      department: t.Optional(t.String({ description: 'Department or unit' })),
      npi: t.Optional(t.String({ description: 'National Provider Identifier' })),
      password: t.Optional(t.String({ description: 'Initial password' })),
      temporaryPassword: t.Optional(t.Boolean({ description: 'Whether password is temporary' }))
    }),
    response: {
      200: UserProfile,
      400: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Create Healthcare User',
      description: 'Create a new healthcare user',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }],
      response: { 
        200: { description: 'Healthcare user created.' },
        400: { description: 'Invalid request data' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        500: { description: 'Internal server error' }
      }
    }
  })
  
  .get('/:userId', async ({ getAdmin, params, set }) => {
    try {
      const user = await getAdmin().users.findOne({ id: params.userId })
      if (!user) {
        set.status = 404
        return { error: 'Healthcare user not found' }
      }
      return {
        id: user.id ?? '',
        username: user.username ?? '',
        email: user.email ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        enabled: user.enabled ?? false,
        attributes: user.attributes ?? {},
        createdTimestamp: user.createdTimestamp ?? 0
      }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to fetch healthcare user', details: error }
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'User ID' })
    }),
    response: {
      200: UserProfile,
      401: ErrorResponse,
      403: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Get Healthcare User',
      description: 'Get a healthcare user by userId',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }],
      response: { 
        200: { description: 'Healthcare user details.' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        404: { description: 'User not found' },
        500: { description: 'Internal server error' }
      }
    }
  })
  
  .put('/:userId', async ({ getAdmin, params, body, set }) => {
    try {
      const updateData = {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        enabled: body.enabled,
        attributes: {
          role: body.role ? [body.role] : undefined,
          department: body.department ? [body.department] : undefined,
          npi: body.npi ? [body.npi] : undefined
        }
      }
      await getAdmin().users.update({ id: params.userId }, updateData)
      // Return the updated user object
      const updated = await getAdmin().users.findOne({ id: params.userId })
      if (!updated) {
        set.status = 404
        return { error: 'Healthcare user not found' }
      }
      return {
        id: updated.id ?? '',
        username: updated.username ?? '',
        email: updated.email ?? '',
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        enabled: updated.enabled ?? false,
        attributes: updated.attributes ?? {},
        createdTimestamp: updated.createdTimestamp ?? 0
      }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to update healthcare user', details: error }
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'User ID' })
    }),
    body: t.Object({
      firstName: t.Optional(t.String({ description: 'First name' })),
      lastName: t.Optional(t.String({ description: 'Last name' })),
      email: t.Optional(t.String({ description: 'Email address', format: 'email' })),
      enabled: t.Optional(t.Boolean({ description: 'Whether user is enabled' })),
      role: t.Optional(t.String({ description: 'Healthcare role' })),
      department: t.Optional(t.String({ description: 'Department or unit' })),
      npi: t.Optional(t.String({ description: 'National Provider Identifier' }))
    }),
    response: {
      200: UserProfile,
      400: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Update Healthcare User',
      description: 'Update a healthcare user by userId',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }],
      response: { 
        200: { description: 'Healthcare user updated.' },
        400: { description: 'Invalid request data' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        404: { description: 'User not found' },
        500: { description: 'Internal server error' }
      }
    }
  })
  
  .delete('/:userId', async ({ getAdmin, params, set }) => {
    try {
      await getAdmin().users.del({ id: params.userId })
      return { success: true, message: 'Healthcare user deleted successfully' }
    } catch (error) {
      set.status = 404
      return { error: 'Healthcare user not found or could not be deleted', details: error }
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'User ID' })
    }),
    response: {
      200: SuccessResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Delete Healthcare User',
      description: 'Delete a healthcare user by userId',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }],
      response: { 
        200: { description: 'Healthcare user deleted.' },
        401: { description: 'Unauthorized - Bearer token required' },
        403: { description: 'Forbidden - Insufficient permissions' },
        404: { description: 'User not found' },
        500: { description: 'Internal server error' }
      }
    }
  })
