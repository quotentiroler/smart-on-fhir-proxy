import { Elysia, t } from 'elysia'
import { logger } from '../../lib/logger'
import { ErrorResponse } from '../../schemas/common'
import { smartAppsRoutes } from './smart-apps'
import { healthcareUsersRoutes } from './healthcare-users'
import { rolesRoutes } from './roles'
import { launchContextRoutes } from './launch-contexts'
import { identityProvidersRoutes } from './identity-providers'
import { smartConfigAdminRoutes } from './smart-config'
import { clientRegistrationSettingsRoutes } from './client-registration-settings'
import { keycloakConfigRoutes } from './keycloak-config'

/**
 * Admin routes aggregator - combines all admin functionality
 */
export const adminRoutes = new Elysia({ prefix: '/admin' })
  .guard({
    detail: {
      security: [{ BearerAuth: [] }]
    }
  })
  // Operational: Shutdown server
  .post('/shutdown', async ({ set }) => {
    try {
      logger.server.info('🛑 Shutdown requested via admin API')
      setTimeout(() => {
        logger.server.info('🛑 Shutting down server...')
        process.exit(0)
      }, 100)
      return { success: true, message: 'Server shutdown initiated', timestamp: new Date().toISOString() }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to shutdown server', details: error }
    }
  }, {
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String(),
        timestamp: t.String()
      }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Shutdown Server',
      description: 'Gracefully shutdown the SMART on FHIR server (admin only)',
      tags: ['admin']
    }
  })
  // Operational: Restart server
  .post('/restart', async ({ set }) => {
    try {
      logger.server.info('🔄 Restart requested via admin API')
      setTimeout(() => {
        logger.server.info('🔄 Restarting server...')
        process.exit(1)
      }, 100)
      return { success: true, message: 'Server restart initiated', timestamp: new Date().toISOString() }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to restart server', details: error }
    }
  }, {
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String(),
        timestamp: t.String()
      }),
      500: ErrorResponse
    },
    detail: {
      summary: 'Restart Server',
      description: 'Restart the SMART on FHIR server (admin only)',
      tags: ['admin']
    }
  })
  .use(smartAppsRoutes)
  .use(healthcareUsersRoutes)
  .use(rolesRoutes)
  .use(launchContextRoutes)
  .use(identityProvidersRoutes)
  .use(smartConfigAdminRoutes)
  .use(clientRegistrationSettingsRoutes)
  .use(keycloakConfigRoutes)
