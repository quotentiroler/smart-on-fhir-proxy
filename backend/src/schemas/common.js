import { t } from 'elysia';
/**
 * Common schemas used across API routes
 */
// Standard error response
export const ErrorResponse = t.Object({
    error: t.String({ description: 'Error message' }),
    code: t.Optional(t.String({ description: 'Error code' })),
    details: t.Optional(t.Any({ description: 'Additional error details' }))
});
// Success response
export const SuccessResponse = t.Object({
    success: t.Boolean({ description: 'Whether the operation was successful' }),
    message: t.Optional(t.String({ description: 'Success message' }))
});
// Common response schemas for different HTTP status codes
export const CommonResponses = {
    400: ErrorResponse,
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
    500: ErrorResponse
};
// Pagination query parameters
export const PaginationQuery = t.Object({
    limit: t.Optional(t.Numeric({ description: 'Maximum number of items to return', minimum: 1, maximum: 100, default: 50 })),
    offset: t.Optional(t.Numeric({ description: 'Number of items to skip', minimum: 0, default: 0 }))
});
// User profile schema (reusable across routes)
export const UserProfile = t.Object({
    id: t.String({ description: 'User ID' }),
    username: t.String({ description: 'Username' }),
    email: t.String({ description: 'Email address' }),
    firstName: t.String({ description: 'First name' }),
    lastName: t.String({ description: 'Last name' }),
    enabled: t.Boolean({ description: 'Whether user is enabled' }),
    attributes: t.Optional(t.Record(t.String(), t.Union([t.String(), t.Array(t.String())]))),
    createdTimestamp: t.Optional(t.Number({ description: 'Creation timestamp' }))
});
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
    attributes: t.Optional(t.Record(t.String(), t.Union([t.String(), t.Array(t.String())])))
});
// Role schema (reusable)
export const Role = t.Object({
    id: t.Optional(t.String({ description: 'Role ID' })),
    name: t.String({ description: 'Role name' }),
    description: t.Optional(t.String({ description: 'Role description' })),
    attributes: t.Optional(t.Record(t.String(), t.Union([t.String(), t.Array(t.String())])))
});
// Launch context schema (reusable)
export const LaunchContext = t.Object({
    id: t.String({ description: 'Launch context ID' }),
    userId: t.String({ description: 'User ID' }),
    patientId: t.Optional(t.String({ description: 'Patient ID' })),
    encounterId: t.Optional(t.String({ description: 'Encounter ID' })),
    createdAt: t.Optional(t.String({ description: 'Creation timestamp' }))
});
// Identity Provider schema (reusable)
export const IdentityProvider = t.Object({
    id: t.Optional(t.String({ description: 'Identity Provider ID' })),
    alias: t.String({ description: 'Identity Provider alias' }),
    displayName: t.Optional(t.String({ description: 'Display name' })),
    providerId: t.String({ description: 'Provider type' }),
    enabled: t.Optional(t.Boolean({ description: 'Whether IdP is enabled' })),
    config: t.Optional(t.Record(t.String(), t.String()))
});
