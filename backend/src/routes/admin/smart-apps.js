import { Elysia, t } from 'elysia';
import { keycloakPlugin } from '../../lib/keycloak-plugin';
import { SmartAppClient, ErrorResponse, SuccessResponse } from '../../schemas/common';
import { config } from '../../config';
/**
 * SMART App (Client) Management - specialized for healthcare applications
 */
export const smartAppsRoutes = new Elysia({ prefix: '/admin/smart-apps', tags: ['smart-apps'] })
    .use(keycloakPlugin)
    .get('/', async ({ getAdmin, set }) => {
    try {
        const admin = await getAdmin();
        const clients = await admin.clients.find();
        // Filter for SMART apps based on SMART-specific characteristics:
        // 1. OpenID Connect protocol
        // 2. Not internal system clients (backend service, admin UI)
        // 3. Either has SMART scopes or is explicitly named as a test client
        return clients.filter(client => {
            if (client.protocol !== 'openid-connect')
                return false;
            // Exclude internal system clients
            const isInternalClient = ['smart-on-fhir-backend', 'admin-ui'].includes(client.clientId || '');
            if (isInternalClient)
                return false;
            // Include if it's a test client or has SMART-like characteristics
            const isTestClient = client.clientId?.startsWith('test-');
            const hasSmartScopes = client.defaultClientScopes?.some(scope => ['launch', 'patient', 'user', 'system'].some(smartScope => scope.includes(smartScope))) || client.optionalClientScopes?.some(scope => ['launch', 'patient', 'user', 'system'].some(smartScope => scope.includes(smartScope)));
            return isTestClient || hasSmartScopes;
        });
    }
    catch (error) {
        set.status = 500;
        return { error: 'Failed to fetch SMART applications', details: error };
    }
}, {
    response: {
        200: t.Array(SmartAppClient),
        401: ErrorResponse,
        403: ErrorResponse,
        500: ErrorResponse
    },
    detail: {
        summary: 'List SMART on FHIR Applications',
        description: 'Get all registered SMART on FHIR applications',
        tags: ['smart-apps'],
        security: [{ BearerAuth: [] }],
        response: {
            200: { description: 'A list of all registered SMART on FHIR applications.' },
            401: { description: 'Unauthorized - Bearer token required' },
            403: { description: 'Forbidden - Insufficient permissions' },
            500: { description: 'Internal server error' }
        }
    }
})
    .post('/', async ({ getAdmin, body, set }) => {
    try {
        const admin = await getAdmin();
        const smartAppConfig = {
            clientId: body.clientId,
            name: body.name,
            description: body.description,
            enabled: true,
            protocol: 'openid-connect',
            publicClient: body.publicClient || false,
            redirectUris: body.redirectUris || [],
            webOrigins: body.webOrigins || [],
            attributes: {
                'smart_version': [body.smartVersion || '2.0.0'],
                'fhir_version': [body.fhirVersion || config.fhir.supportedVersions[0]]
            },
            defaultClientScopes: [
                'openid', 'profile', 'launch', 'launch/patient', 'offline_access',
                ...(body.scopes || [])
            ]
        };
        return admin.clients.create(smartAppConfig);
    }
    catch (error) {
        set.status = 400;
        return { error: 'Failed to create SMART application', details: error };
    }
}, {
    body: t.Object({
        clientId: t.String({ description: 'Unique client identifier' }),
        name: t.String({ description: 'Application name' }),
        description: t.Optional(t.String({ description: 'Application description' })),
        publicClient: t.Optional(t.Boolean({ description: 'Whether this is a public client (default: false)' })),
        redirectUris: t.Optional(t.Array(t.String({ description: 'Valid redirect URIs' }))),
        webOrigins: t.Optional(t.Array(t.String({ description: 'Valid web origins' }))),
        scopes: t.Optional(t.Array(t.String({ description: 'Additional OAuth scopes' }))),
        smartVersion: t.Optional(t.String({ description: 'SMART version (default: 2.0.0)' })),
        fhirVersion: t.Optional(t.String({ description: `FHIR version (default: ${config.fhir.supportedVersions[0]})` }))
    }),
    response: {
        200: SmartAppClient,
        400: ErrorResponse,
        401: ErrorResponse,
        403: ErrorResponse,
        404: ErrorResponse,
        500: ErrorResponse
    },
    detail: {
        summary: 'Create SMART on FHIR Application',
        description: 'Create a new SMART on FHIR application',
        tags: ['smart-apps'],
        security: [{ BearerAuth: [] }],
        response: {
            200: { description: 'SMART app client created.' },
            400: { description: 'Invalid request data' },
            401: { description: 'Unauthorized - Bearer token required' },
            403: { description: 'Forbidden - Insufficient permissions' },
            500: { description: 'Internal server error' }
        }
    }
})
    .get('/:clientId', async ({ getAdmin, params, set }) => {
    try {
        const admin = await getAdmin();
        const clients = await admin.clients.find({ clientId: params.clientId });
        if (!clients[0]) {
            set.status = 404;
            return { error: 'SMART application not found' };
        }
        return clients[0];
    }
    catch (error) {
        set.status = 500;
        return { error: 'Failed to fetch SMART application', details: error };
    }
}, {
    params: t.Object({
        clientId: t.String({ description: 'SMART application client ID' })
    }),
    response: {
        200: SmartAppClient,
        404: ErrorResponse,
        401: ErrorResponse,
        403: ErrorResponse,
        500: ErrorResponse
    },
    detail: {
        summary: 'Get SMART on FHIR Application',
        description: 'Get a single SMART on FHIR application by clientId',
        tags: ['smart-apps'],
        security: [{ BearerAuth: [] }],
        response: {
            200: { description: 'SMART app client details.' },
            404: { description: 'SMART application not found' },
            401: { description: 'Unauthorized - Bearer token required' },
            403: { description: 'Forbidden - Insufficient permissions' },
            500: { description: 'Internal server error' }
        }
    }
})
    .put('/:clientId', async ({ getAdmin, params, body, set }) => {
    try {
        const admin = await getAdmin();
        const clients = await admin.clients.find({ clientId: params.clientId });
        if (!clients[0]) {
            set.status = 404;
            return { error: 'SMART application not found' };
        }
        const updateData = {
            name: body.name,
            description: body.description,
            enabled: body.enabled,
            redirectUris: body.redirectUris,
            webOrigins: body.webOrigins,
            attributes: {
                ...clients[0].attributes,
                smart_version: body.smartVersion ? [body.smartVersion] : clients[0].attributes?.smart_version,
                fhir_version: body.fhirVersion ? [body.fhirVersion] : clients[0].attributes?.fhir_version
            }
        };
        await admin.clients.update({ id: clients[0].id }, updateData);
        return { success: true, message: 'SMART application updated successfully' };
    }
    catch (error) {
        set.status = 400;
        return { error: 'Failed to update SMART application', details: error };
    }
}, {
    params: t.Object({
        clientId: t.String({ description: 'SMART application client ID' })
    }),
    body: t.Object({
        name: t.Optional(t.String({ description: 'Application name' })),
        description: t.Optional(t.String({ description: 'Application description' })),
        enabled: t.Optional(t.Boolean({ description: 'Whether application is enabled' })),
        redirectUris: t.Optional(t.Array(t.String({ description: 'Valid redirect URIs' }))),
        webOrigins: t.Optional(t.Array(t.String({ description: 'Valid web origins' }))),
        smartVersion: t.Optional(t.String({ description: 'SMART version' })),
        fhirVersion: t.Optional(t.String({ description: 'FHIR version' }))
    }),
    response: {
        200: SuccessResponse,
        400: ErrorResponse,
        404: ErrorResponse,
        401: ErrorResponse,
        403: ErrorResponse,
        500: ErrorResponse
    },
    detail: {
        summary: 'Update SMART on FHIR Application',
        description: 'Update an existing SMART on FHIR application',
        tags: ['smart-apps'],
        security: [{ BearerAuth: [] }],
        response: {
            200: { description: 'SMART app client updated.' },
            400: { description: 'Invalid request data' },
            404: { description: 'SMART application not found' },
            401: { description: 'Unauthorized - Bearer token required' },
            403: { description: 'Forbidden - Insufficient permissions' },
            500: { description: 'Internal server error' }
        }
    }
})
    .delete('/:clientId', async ({ getAdmin, params, set }) => {
    try {
        const admin = await getAdmin();
        const clients = await admin.clients.find({ clientId: params.clientId });
        if (!clients[0]) {
            set.status = 404;
            return { error: 'SMART application not found' };
        }
        await admin.clients.del({ id: clients[0].id });
        return { success: true, message: 'SMART application deleted successfully' };
    }
    catch (error) {
        set.status = 500;
        return { error: 'Failed to delete SMART application', details: error };
    }
}, {
    params: t.Object({
        clientId: t.String({ description: 'SMART application client ID' })
    }),
    response: {
        200: SuccessResponse,
        404: ErrorResponse,
        401: ErrorResponse,
        403: ErrorResponse,
        500: ErrorResponse
    },
    detail: {
        summary: 'Delete SMART on FHIR Application',
        description: 'Delete a SMART on FHIR application by clientId',
        tags: ['smart-apps'],
        security: [{ BearerAuth: [] }],
        response: {
            200: { description: 'SMART app client deleted.' },
            404: { description: 'SMART application not found' },
            401: { description: 'Unauthorized - Bearer token required' },
            403: { description: 'Forbidden - Insufficient permissions' },
            500: { description: 'Internal server error' }
        }
    }
});
