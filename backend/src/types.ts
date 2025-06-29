import type KcAdminClient from '@keycloak/keycloak-admin-client'

export interface SmartConfiguration {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  introspection_endpoint: string
  code_challenge_methods_supported: string[]
  grant_types_supported: string[]
  response_types_supported: string[]
  scopes_supported: string[]
  capabilities: string[]
  token_endpoint_auth_methods_supported: string[]
  token_endpoint_auth_signing_alg_values_supported: string[]
}

export interface IdentityProvider {
  alias: string
  providerId: string
  config: Record<string, unknown>
}

export interface AppDecorators {
  getAdmin(): KcAdminClient
}
