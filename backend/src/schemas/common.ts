import { t } from 'elysia'

/**
 * Common schemas used across API routes
 */

// Standard error response
export const ErrorResponse = t.Object({
  error: t.String({ description: 'Error message' }),
  code: t.Optional(t.String({ description: 'Error code' })),
  details: t.Optional(t.Any({ description: 'Additional error details' }))
}, { description: 'Error response' })

// Success response
export const SuccessResponse = t.Object({
  success: t.Boolean({ description: 'Whether the operation was successful' }),
  message: t.Optional(t.String({ description: 'Success message' }))
}, { description: 'Success response' })

// Common response schemas for different HTTP status codes
export const CommonResponses = {
  400: ErrorResponse,
  401: ErrorResponse,
  403: ErrorResponse,
  404: ErrorResponse,
  500: ErrorResponse
}

// Pagination query parameters
export const PaginationQuery = t.Object({
  limit: t.Optional(t.Numeric({ description: 'Maximum number of items to return', minimum: 1, maximum: 100, default: 50 })),
  offset: t.Optional(t.Numeric({ description: 'Number of items to skip', minimum: 0, default: 0 }))
})

// User profile schema (reusable across routes)
export const UserProfile = t.Object({
  id: t.String({ description: 'User ID' }),
  username: t.String({ description: 'Username' }),
  email: t.String({ description: 'Email address' }),
  firstName: t.String({ description: 'First name' }),
  lastName: t.String({ description: 'Last name' }),
  enabled: t.Boolean({ description: 'Whether user is enabled' }),
  attributes: t.Optional(t.Record(t.String(), t.Union([t.String(), t.Array(t.String())]))),
  createdTimestamp: t.Optional(t.Number({ description: 'Creation timestamp' })),
  lastLogin: t.Optional(t.Union([t.Number(), t.Null()], { description: 'Last login timestamp' })),
  realmRoles: t.Optional(t.Array(t.String(), { description: 'Keycloak realm roles' })),
  clientRoles: t.Optional(t.Record(t.String(), t.Array(t.String()), { description: 'Keycloak client roles' })),
  organization: t.Optional(t.String({ description: 'Organization' })),
  fhirUser: t.Optional(t.String({ description: 'FHIR User identifier' }))
})

// SMART App/Client schema (reusable)
export const SmartAppClient = t.Object({
  id: t.Optional(t.String({ description: 'Client ID' })),
  clientId: t.Optional(t.String({ description: 'Client identifier' })),
  name: t.Optional(t.String({ description: 'Application name' })),
  description: t.Optional(t.String({ description: 'Application description' })),
  enabled: t.Optional(t.Boolean({ description: 'Whether app is enabled' })),
  protocol: t.Optional(t.String({ description: 'OAuth protocol' })),
  publicClient: t.Optional(t.Boolean({ description: 'Whether app is public client' })),
  redirectUris: t.Optional(t.Array(t.String({ description: 'Redirect URIs' }))),
  webOrigins: t.Optional(t.Array(t.String({ description: 'Web origins' }))),
  attributes: t.Optional(t.Record(t.String(), t.Union([t.String(), t.Array(t.String())]))),
  // Backend Services specific fields
  clientAuthenticatorType: t.Optional(t.String({ description: 'Client authentication method (client-jwt, client-secret, none)' })),
  serviceAccountsEnabled: t.Optional(t.Boolean({ description: 'Whether service accounts (client_credentials) are enabled' })),
  standardFlowEnabled: t.Optional(t.Boolean({ description: 'Whether authorization code flow is enabled' })),
  implicitFlowEnabled: t.Optional(t.Boolean({ description: 'Whether implicit flow is enabled' })),
  directAccessGrantsEnabled: t.Optional(t.Boolean({ description: 'Whether password grants are enabled' })),
  // SMART specific attributes
  defaultClientScopes: t.Optional(t.Array(t.String({ description: 'Default OAuth scopes' }))),
  optionalClientScopes: t.Optional(t.Array(t.String({ description: 'Optional OAuth scopes' }))),
  access: t.Optional(t.Record(t.String(), t.Boolean(), { description: 'Access permissions' }))
})

// Role schema (reusable)
export const Role = t.Object({
  id: t.Optional(t.String({ description: 'Role ID' })),
  name: t.String({ description: 'Role name' }),
  description: t.Optional(t.String({ description: 'Role description' })),
  attributes: t.Optional(t.Record(t.String(), t.Union([t.String(), t.Array(t.String())])))
})

// Launch context configuration schema (admin-defined workflow integration)
export const LaunchContextConfig = t.Object({
  id: t.String({ description: 'Launch context configuration ID' }),
  name: t.String({ description: 'Launch context name' }),
  description: t.Optional(t.String({ description: 'Launch context description' })),
  intent: t.String({ description: 'Launch intent (e.g., patient-chart, encounter-summary)' }),
  
  // FHIR Server Association
  fhirServerName: t.Optional(t.String({ description: 'Specific FHIR server this context is for (if server-specific)' })),
  supportedServers: t.Optional(t.Array(t.String({ description: 'List of FHIR server names this context supports' }))),
  serverScope: t.Optional(t.Union([
    t.Literal('global', { description: 'Works with any FHIR server' }),
    t.Literal('specific', { description: 'Works only with specified servers' }),
    t.Literal('single', { description: 'Works with one specific server' })
  ], { description: 'Server scope for this launch context' })),
  
  targetClientIds: t.Optional(t.Array(t.String({ description: 'Client IDs this context can launch' }))),
  embedLocation: t.Optional(t.String({ description: 'Where in EHR this context appears' })),
  fhirContextTemplate: t.Optional(t.Array(t.Object({
    type: t.String({ description: 'FHIR resource type (e.g., Patient, Encounter)' }),
    reference: t.String({ description: 'Reference template (e.g., {patient.id}, {encounter.id})' }),
    display: t.Optional(t.String({ description: 'Display name template' }))
  }))),
  requiredScopes: t.Optional(t.Array(t.String({ description: 'Required SMART scopes for this context' }))),
  optionalScopes: t.Optional(t.Array(t.String({ description: 'Optional SMART scopes for this context' }))),
  needPatientBanner: t.Optional(t.Boolean({ description: 'Whether patient banner is required' })),
  needEncounterContext: t.Optional(t.Boolean({ description: 'Whether encounter context is required' })),
  smartStyleUrl: t.Optional(t.String({ description: 'SMART style URL for this context' })),
  parameters: t.Optional(t.Record(t.String(), t.String({ description: 'Additional launch parameters' }))),
  isActive: t.Optional(t.Boolean({ description: 'Whether this launch context is active' })),
  createdBy: t.Optional(t.String({ description: 'User who created this context' })),
  createdAt: t.Optional(t.String({ description: 'Creation timestamp' })),
  lastModified: t.Optional(t.String({ description: 'Last modification timestamp' }))
})

// Runtime launch context (generated when app is actually launched)
export const RuntimeLaunchContext = t.Object({
  id: t.String({ description: 'Runtime launch context ID' }),
  configId: t.String({ description: 'Launch context configuration ID' }),
  fhirServerName: t.String({ description: 'FHIR server being used for this launch' }),
  fhirServerUrl: t.String({ description: 'FHIR server base URL' }),
  clientId: t.String({ description: 'Client ID being launched' }),
  userId: t.String({ description: 'User ID who initiated launch' }),
  patientId: t.Optional(t.String({ description: 'Current patient ID' })),
  encounterId: t.Optional(t.String({ description: 'Current encounter ID' })),
  launchUrl: t.String({ description: 'Generated launch URL' }),
  createdAt: t.String({ description: 'Launch timestamp' }),
  expiresAt: t.Optional(t.String({ description: 'Launch context expiration' }))
})

// Identity Provider schema (reusable)
export const IdentityProvider = t.Object({
  id: t.Optional(t.String({ description: 'Identity Provider ID' })),
  alias: t.String({ description: 'Identity Provider alias' }),
  displayName: t.Optional(t.String({ description: 'Display name' })),
  providerId: t.String({ description: 'Provider type' }),
  enabled: t.Optional(t.Boolean({ description: 'Whether IdP is enabled' })),
  config: t.Optional(t.Record(t.String(), t.String()))
})

// FHIR Server configuration schema
export const FhirServerConfig = t.Object({
  name: t.String({ description: 'Server identifier/name' }),
  displayName: t.String({ description: 'Human-readable server name' }),
  url: t.String({ description: 'FHIR server base URL' }),
  fhirVersion: t.String({ description: 'FHIR version (e.g., R4, R5)' }),
  serverName: t.Optional(t.String({ description: 'Server software name' })),
  serverVersion: t.Optional(t.String({ description: 'Server software version' })),
  supported: t.Boolean({ description: 'Whether server is supported' }),
  enabled: t.Optional(t.Boolean({ description: 'Whether server is enabled for use' })),
  endpoints: t.Object({
    base: t.String({ description: 'Base FHIR endpoint' }),
    smartConfig: t.String({ description: 'SMART configuration endpoint' }),
    metadata: t.String({ description: 'FHIR metadata endpoint' })
  }),
  capabilities: t.Optional(t.Array(t.String({ description: 'Server capabilities' }))),
  lastUpdated: t.Optional(t.String({ description: 'Last metadata refresh timestamp' }))
})

// Server-Context association (for many-to-many relationships)
export const ServerContextAssociation = t.Object({
  id: t.String({ description: 'Association ID' }),
  fhirServerName: t.String({ description: 'FHIR server name' }),
  launchContextId: t.String({ description: 'Launch context configuration ID' }),
  isDefault: t.Optional(t.Boolean({ description: 'Whether this is the default context for this server' })),
  customParameters: t.Optional(t.Record(t.String(), t.String({ description: 'Server-specific launch parameters' }))),
  createdAt: t.Optional(t.String({ description: 'Association creation timestamp' }))
})
