import { Elysia } from 'elysia'
import keycloakAdmin from './keycloak'

/**
 * Plugin that adds Keycloak admin client decorator
 */
export const keycloakPlugin = new Elysia()
  .decorate('getAdmin', () => keycloakAdmin())
