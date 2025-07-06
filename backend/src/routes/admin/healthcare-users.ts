import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '../../lib/keycloak-plugin'
import { UserProfile, ErrorResponse, SuccessResponse, PaginationQuery } from '../../schemas/common'
import { extractBearerToken, UNAUTHORIZED_RESPONSE, getValidatedAdmin, mapUserProfile } from '../../lib/admin-utils'

/**
 * Classify user role based on role and department attributes
 */
function classifyUserRole(role: string, department: string): 'physician' | 'researcher' | 'nurse' | 'admin' | 'other' {
  const roleLower = role.toLowerCase()
  const deptLower = department.toLowerCase()
  
  // Check for researchers
  if (roleLower.includes('research') || deptLower.includes('research') || 
      roleLower.includes('scientist') || deptLower.includes('clinical trial')) {
    return 'researcher'
  }
  
  // Check for physicians
  if (roleLower.includes('physician') || roleLower.includes('doctor') || 
      roleLower.includes('md') || roleLower.includes('attending')) {
    return 'physician'
  }
  
  // Check for nurses
  if (roleLower.includes('nurse') || roleLower.includes('rn') || 
      roleLower.includes('nursing')) {
    return 'nurse'
  }
  
  // Check for admin roles
  if (roleLower.includes('admin') || roleLower.includes('manager') || 
      roleLower.includes('coordinator')) {
    return 'admin'
  }
  
  return 'other'
}

/**
 * Healthcare User Management - specialized for healthcare professionals
 */
export const healthcareUsersRoutes = new Elysia({ prefix: '/admin/healthcare-users' })
  .use(keycloakPlugin)
  
  .get('/', async ({ getAdmin, query, set, headers }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      console.log('Healthcare users request - token present:', !!token)
      
      if (!token) {
        console.log('No token found in request')
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      console.log('Attempting to get admin client with token...')
      const admin = await getValidatedAdmin(getAdmin, token)
      console.log('Admin client obtained successfully')
      
      console.log('Fetching users from Keycloak...')
      const allUsers = await admin.users.find({
        max: Number(query.limit) || 50,
        first: Number(query.offset) || 0
      })
      
      console.log(`Found ${allUsers.length} users`)
      
      // Filter for healthcare users and map them with role information
      const healthcareUsers = allUsers.map(user => {
        const profile = mapUserProfile(user)
        // Add role classification for statistics
        const role = user.attributes?.role?.[0] || 'healthcare_user'
        const department = user.attributes?.department?.[0] || ''
        
        return {
          ...profile,
          roleType: classifyUserRole(role, department),
          isActive: user.enabled || false
        }
      })
      
      console.log(`Returning ${healthcareUsers.length} healthcare users`)
      return healthcareUsers
    } catch (error) {
      console.error('Error in healthcare users endpoint:', error)
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
  
  .post('/', async ({ getAdmin, body, set, headers }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

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
      
      const admin = await getValidatedAdmin(getAdmin, token)
      const result = await admin.users.create(userData)
      
      // Return the created user object (fetch by id)
      const created = result.id ? await admin.users.findOne({ id: result.id }) : undefined
      return created ? mapUserProfile(created) : { error: 'Failed to retrieve created user' }
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
  
  .get('/:userId', async ({ getAdmin, params, set, headers }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      const user = await admin.users.findOne({ id: params.userId })
      if (!user) {
        set.status = 404
        return { error: 'Healthcare user not found' }
      }
      return mapUserProfile(user)
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
  
  .put('/:userId', async ({ getAdmin, params, body, set, headers }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

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
      
      const admin = await getValidatedAdmin(getAdmin, token)
      await admin.users.update({ id: params.userId }, updateData)
      
      // Return the updated user object
      const updated = await admin.users.findOne({ id: params.userId })
      if (!updated) {
        set.status = 404
        return { error: 'Healthcare user not found' }
      }
      return mapUserProfile(updated)
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
  
  .delete('/:userId', async ({ getAdmin, params, set, headers }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      await admin.users.del({ id: params.userId })
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
