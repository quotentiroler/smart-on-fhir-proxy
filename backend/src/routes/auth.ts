import { Elysia } from 'elysia'
import { oauthRoutes } from './oauth'
import { clientRegistrationRoutes } from './auth/client-registration'

/**
 * Authentication routes - OAuth2 and Dynamic Client Registration
 */
export const authRoutes = new Elysia()
  .use(oauthRoutes)
  .use(clientRegistrationRoutes)
