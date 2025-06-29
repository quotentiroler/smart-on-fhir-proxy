import { Elysia } from 'elysia'
import { oauthRoutes } from './oauth'
import { adminRoutes } from './admin'

/**
 * Authentication routes - combines OAuth and admin functionality
 */
export const authRoutes = new Elysia()
  .use(oauthRoutes)
  .use(adminRoutes)
