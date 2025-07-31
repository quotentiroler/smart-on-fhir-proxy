import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '../../lib/keycloak-plugin'
import { ErrorResponse } from '../../schemas/common'
import { extractBearerToken, UNAUTHORIZED_RESPONSE, getValidatedAdmin, getUserAttribute, getUserAttributeBoolean, setUserAttribute } from '../../lib/admin-utils'
import { logger } from '../../lib/logger'

/**
 * SMART Launch Context Management - handles patient/encounter/user contexts per SMART App Launch spec
 * 
 * Core SMART context attributes (per SMART App Launch Framework 2.2.0 specification):
 * - fhirUser: The FHIR resource representing the current user (Practitioner, Patient, Person, RelatedPerson)
 * - patient: The patient in context
 * - encounter: The encounter in context  
 * - fhirContext: Array of FHIR resources in context (objects with reference, canonical, or identifier)
 * 
 * Extended attributes aligned with SMART specifications:
 * - intent: Intent string for workflow context (e.g., reconcile-medications)
 * - smart_style_url: URL to CSS stylesheet for branding (per User-access Brands and Endpoints)
 * - tenant: Tenant identifier for multi-tenant deployments
 * - need_patient_banner: Boolean indicating whether patient banner is required
 * 
 * Note: The "locations" parameter in SMART specifications refers to FHIR server endpoints for 
 * multi-server authorization (authorization_details), not physical location context. Physical
 * locations would be included in fhirContext as Location resources if needed.
 */
export const launchContextRoutes = new Elysia({ prefix: '/launch-contexts' })
  .use(keycloakPlugin)
  
  .get('/', async ({ getAdmin, headers, set }) => {
    logger.admin.info('Fetching users with launch context attributes')
    
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        logger.admin.warn('Unauthorized access attempt - no bearer token provided')
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      // Get users with SMART launch context attributes
      const admin = await getValidatedAdmin(getAdmin, token)
      logger.admin.debug('Successfully validated admin token for launch contexts request')
      
      const users = await admin.users.find()
      const filteredUsers = users
        .filter(user => 
          user.attributes?.['smart_fhir_user'] || 
          user.attributes?.['smart_patient'] || 
          user.attributes?.['smart_encounter'] ||
          user.attributes?.['smart_fhir_context'] ||
          user.attributes?.['smart_intent'] ||
          user.attributes?.['smart_style_url'] ||
          user.attributes?.['smart_tenant'] ||
          user.attributes?.['smart_need_patient_banner'] ||
          // Legacy support
          user.attributes?.['launch_patient'] ||
          user.attributes?.['launch_encounter']
        )
        .map(user => ({
          userId: user.id ?? '',
          username: user.username ?? '',
          fhirUser: getUserAttribute(user, 'smart_fhir_user'),
          patient: getUserAttribute(user, 'smart_patient'),
          encounter: getUserAttribute(user, 'smart_encounter'),
          fhirContext: getUserAttribute(user, 'smart_fhir_context'),
          intent: getUserAttribute(user, 'smart_intent'),
          smartStyleUrl: getUserAttribute(user, 'smart_style_url'),
          tenant: getUserAttribute(user, 'smart_tenant'),
          needPatientBanner: getUserAttributeBoolean(user, 'smart_need_patient_banner'),
          // Legacy support for existing attributes
          launchPatient: getUserAttribute(user, 'launch_patient'),
          launchEncounter: getUserAttribute(user, 'launch_encounter')
        }))
      
      logger.admin.info('Successfully retrieved launch context users', { 
        totalUsers: users.length, 
        usersWithContexts: filteredUsers.length 
      })
      
      return filteredUsers
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.admin.error('Failed to fetch launch contexts', { error: errorMessage }, error instanceof Error ? error : undefined)
      set.status = 500
      return { error: 'Failed to fetch launch contexts', details: error }
    }
  }, {
    responses: {
      200: t.Array(t.Object({
        userId: t.String({ description: 'User ID' }),
        username: t.String({ description: 'Username' }),
        fhirUser: t.String({ description: 'FHIR resource representing the current user (e.g., Practitioner/123)' }),
        patient: t.String({ description: 'Patient context (e.g., Patient/456)' }),
        encounter: t.String({ description: 'Encounter context (e.g., Encounter/789)' }),
        fhirContext: t.String({ description: 'Additional FHIR resources in context (JSON array)' }),
        intent: t.String({ description: 'Intent string (e.g., reconcile-medications)' }),
        smartStyleUrl: t.String({ description: 'URL to CSS stylesheet for styling' }),
        tenant: t.String({ description: 'Tenant identifier' }),
        needPatientBanner: t.Boolean({ description: 'Whether patient banner is required' }),
        // Legacy support
        launchPatient: t.String({ description: 'Legacy patient context' }),
        launchEncounter: t.String({ description: 'Legacy encounter context' })
      }), { description: 'List of users with launch context attributes' }),
      401: ErrorResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'List Launch Contexts',
      description: 'Get all users with launch context attributes',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'List of users with launch context attributes' }
      }
    }
  })
  
  // SMART on FHIR context management routes
  .post('/:userId/fhir-user/:fhirUserId', async ({ getAdmin, params, headers, set }) => {
    logger.admin.info('Setting FHIR user context', { userId: params.userId, fhirUserId: params.fhirUserId })
    
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        logger.admin.warn('Unauthorized attempt to set FHIR user context', { userId: params.userId })
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      await setUserAttribute(admin, params.userId, 'smart_fhir_user', params.fhirUserId)
      
      logger.admin.info('Successfully set FHIR user context', { 
        userId: params.userId, 
        fhirUserId: params.fhirUserId 
      })
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.admin.error('Failed to set FHIR user context', { 
        userId: params.userId, 
        fhirUserId: params.fhirUserId,
        error: errorMessage 
      }, error instanceof Error ? error : undefined)
      set.status = 400
      return { error: 'Failed to set fhirUser context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }, { description: 'FHIR user context set successfully' }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Set FHIR User Context',
      description: 'Set the fhirUser context for a user (e.g., Practitioner/123)',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'FHIR user context set successfully' }
      }
    }
  })

  .post('/:userId/patient/:patientId', async ({ getAdmin, params, headers, set }) => {
    logger.admin.info('Setting patient context', { userId: params.userId, patientId: params.patientId })
    
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        logger.admin.warn('Unauthorized attempt to set patient context', { userId: params.userId })
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      // Set both new and legacy attributes for backwards compatibility
      await setUserAttribute(admin, params.userId, 'smart_patient', params.patientId, 'launch_patient')
      
      logger.admin.info('Successfully set patient context', { 
        userId: params.userId, 
        patientId: params.patientId 
      })
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.admin.error('Failed to set patient context', { 
        userId: params.userId, 
        patientId: params.patientId,
        error: errorMessage 
      }, error instanceof Error ? error : undefined)
      set.status = 400
      return { error: 'Failed to set patient context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Set Patient Context',
      description: 'Set the patient context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Patient context set successfully' }
      }
    }
  })
  
  .post('/:userId/encounter/:encounterId', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { 
          smart_encounter: [params.encounterId],
          // Keep legacy attribute for backwards compatibility
          launch_encounter: [params.encounterId]
        } }
      )
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to set encounter context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Set Encounter Context',
      description: 'Set the encounter context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Encounter context set successfully' }
      }
    }
  })
  
  .post('/:userId/fhir-context', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      
      // Validate fhirContext format - should be array of objects
      let fhirContextArray
      try {
        fhirContextArray = JSON.parse(body.fhirContext)
        if (!Array.isArray(fhirContextArray)) {
          throw new Error('fhirContext must be an array')
        }
        
        // Validate each context object has required properties
        for (const contextItem of fhirContextArray) {
          if (!contextItem.reference && !contextItem.canonical && !contextItem.identifier) {
            throw new Error('Each fhirContext item must have at least one of: reference, canonical, or identifier')
          }
        }
      } catch {
        set.status = 400
        return { error: 'Invalid fhirContext format. Must be JSON array of objects with reference, canonical, or identifier properties' }
      }

      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_fhir_context: [body.fhirContext] } }
      )
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to set fhirContext', details: error }
    }
  }, {
    body: t.Object({
      fhirContext: t.String({ description: 'Additional FHIR resources in context (JSON array of objects)' })
    }),
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Set FHIR Context',
      description: 'Set additional FHIR resources in context as per SMART 2.2.0 spec',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'FHIR context set successfully' }
      }
    }
  })

  // Delete routes for new SMART attributes
  .delete('/:userId/fhir-user', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_fhir_user
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to remove fhirUser context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Remove FHIR User Context',
      description: 'Remove the fhirUser context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'FHIR user context removed successfully' }
      }
    }
  })

  .delete('/:userId/patient', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        // Clean up both new and legacy attributes
        delete user.attributes.smart_patient
        delete user.attributes.launch_patient
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to remove patient context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Remove Patient Context',
      description: 'Remove the patient context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Patient context removed successfully' }
      }
    }
  })

  .delete('/:userId/encounter', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        // Clean up both new and legacy attributes
        delete user.attributes.smart_encounter
        delete user.attributes.launch_encounter
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to remove encounter context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Remove Encounter Context',
      description: 'Remove the encounter context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Encounter context removed successfully' }
      }
    }
  })

  .delete('/:userId/fhir-context', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_fhir_context
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to remove fhirContext', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Remove FHIR Context',
      description: 'Remove additional FHIR resources in context',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'FHIR context removed successfully' }
      }
    }
  })

  // Additional SMART context attributes routes
  .put('/:userId/intent', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_intent: [body.intent] } }
      )
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to set intent context', details: error }
    }
  }, {
    body: t.Object({
      intent: t.String({ description: 'Intent string (e.g., reconcile-medications)' })
    }),
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Set Intent Context',
      description: 'Set the intent context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Intent context set successfully' }
      }
    }
  })

  .put('/:userId/need-patient-banner', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_need_patient_banner: [body.needPatientBanner.toString()] } }
      )
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to set need-patient-banner context', details: error }
    }
  }, {
    body: t.Object({
      needPatientBanner: t.Boolean({ description: 'Whether patient banner is required' })
    }),
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Set Need Patient Banner Context',
      description: 'Set whether patient banner is required for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Need patient banner context set successfully' }
      }
    }
  })

  .put('/:userId/smart-style-url', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_style_url: [body.styleUrl] } }
      )
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to set smart-style-url context', details: error }
    }
  }, {
    body: t.Object({
      styleUrl: t.String({ description: 'URL to CSS stylesheet for styling' })
    }),
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Set Smart Style URL Context',
      description: 'Set the smart-style-url context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Smart style URL context set successfully' }
      }
    }
  })

  .put('/:userId/tenant', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_tenant: [body.tenant] } }
      )
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to set tenant context', details: error }
    }
  }, {
    body: t.Object({
      tenant: t.String({ description: 'Tenant identifier' })
    }),
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Set Tenant Context',
      description: 'Set the tenant context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Tenant context set successfully' }
      }
    }
  })

  // Delete routes for additional SMART context attributes
  .delete('/:userId/intent', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_intent
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to remove intent context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Remove Intent Context',
      description: 'Remove the intent context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Intent context removed successfully' }
      }
    }
  })

  .delete('/:userId/need-patient-banner', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_need_patient_banner
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to remove need-patient-banner context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Remove Need Patient Banner Context',
      description: 'Remove the need-patient-banner context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Need patient banner context removed successfully' }
      }
    }
  })

  .delete('/:userId/smart-style-url', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_style_url
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to remove smart-style-url context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }, { description: 'Smart style URL context removed successfully' }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Remove Smart Style URL Context',
      description: 'Remove the smart-style-url context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Smart style URL context removed successfully' }
      }
    }
  })

  .delete('/:userId/tenant', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_tenant
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to remove tenant context', details: error }
    }
  }, {
    responses: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
      }),
      400: ErrorResponse,
      401: ErrorResponse
    },
    detail: {
      summary: 'Remove Tenant Context',
      description: 'Remove the tenant context for a user',
      tags: ['launch-contexts'],
      responses: {
        200: { description: 'Tenant context removed successfully' }
      }
    }
  })
