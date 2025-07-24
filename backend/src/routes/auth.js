import { Elysia } from 'elysia';
import { oauthRoutes } from './oauth';
/**
 * Authentication routes - currently only OAuth2
 */
export const authRoutes = new Elysia()
    .use(oauthRoutes);
