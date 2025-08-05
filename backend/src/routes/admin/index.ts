import { Elysia } from 'elysia'
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
  .use(smartAppsRoutes)
  .use(healthcareUsersRoutes)
  .use(rolesRoutes)
  .use(launchContextRoutes)
  .use(identityProvidersRoutes)
  .use(smartConfigAdminRoutes)
  .use(clientRegistrationSettingsRoutes)
  .use(keycloakConfigRoutes)
