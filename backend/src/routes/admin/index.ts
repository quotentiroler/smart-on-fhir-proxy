import { Elysia } from 'elysia'
import { smartAppsRoutes } from './smart-apps'
import { healthcareUsersRoutes } from './healthcare-users'
import { rolesRoutes } from './roles'
import { launchContextRoutes } from './launch-contexts'
import { identityProvidersRoutes } from './identity-providers'

/**
 * Admin routes aggregator - combines all admin functionality
 */
export const adminRoutes = new Elysia()
  .use(smartAppsRoutes)
  .use(healthcareUsersRoutes)
  .use(rolesRoutes)
  .use(launchContextRoutes)
  .use(identityProvidersRoutes)
