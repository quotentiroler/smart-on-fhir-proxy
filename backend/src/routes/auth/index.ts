import { Elysia } from 'elysia'
import { oauthRoutes } from './oauth'
import { clientRegistrationRoutes } from './client-registration'

/**
 * Authentication routes - OAuth2 and Dynamic Client Registration
 */
export const authRoutes = new Elysia({ prefix: '/auth', tags: ['authentication'] })
  .use(oauthRoutes)
  .use(clientRegistrationRoutes)
