/**
 * SMART Backend Services Flow Tests
 * 
 * Implements the complete SMART Backend Services authentication flow as specified in:
 * SMART App Launch Framework 2.2.0 - Backend Services Flow
 * 
 * Test Flow:
 * 1. Retrieve .well-known/smart-configuration
 * 2. Register backend service client with private_key_jwt authentication
 * 3. Generate client assertion JWT
 * 4. Retrieve access token using client_credentials grant
 * 5. Access FHIR API with the bearer token
 * 
 * This test validates the complete server-to-server authentication flow
 * without user interaction, using asymmetric key authentication.
 */

import { Configuration } from '../../lib/api-client';
import { ClientManager, ClientConfig } from '../../client-registration/client-manager';
import { createClientAssertion, generateJti } from '../../util/test-helpers';

describe('SMART Backend Services Flow', () => {
    let clientManager: ClientManager;
    let backendClient: any;
    let smartConfig: any;

    const baseUrl = process.env.FHIR_BASE_URL || 'http://localhost:8445/v/R4/fhir';
    const serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:8445';

    beforeAll(async () => {
        // Initialize API clients
        const config = new Configuration({
            basePath: serverBaseUrl
        });

        clientManager = new ClientManager(baseUrl);

        // Verify server is accessible
        try {
            await clientManager.testServerConnection();
        } catch (error: any) {
            throw new Error(`Server is not accessible at ${baseUrl}. Backend services tests require a running server. Error: ${error.message}`);
        }
    });

    describe('Step 1: Retrieve .well-known/smart-configuration', () => {
        it('should fetch SMART configuration from discovery endpoint', async () => {
            // Make direct HTTP request to the discovery endpoint since it might not be in the generated API
            const discoveryUrl = `${baseUrl}/.well-known/smart-configuration`;

            const response = await fetch(discoveryUrl, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            expect(response.status).toBe(200);
            expect(response.headers.get('content-type')).toContain('application/json');

            smartConfig = await response.json();

            // Validate required SMART configuration properties for backend services
            expect(smartConfig).toHaveProperty('token_endpoint');
            expect(smartConfig).toHaveProperty('grant_types_supported');
            expect(smartConfig).toHaveProperty('token_endpoint_auth_methods_supported');
            expect(smartConfig).toHaveProperty('scopes_supported');
            expect(smartConfig).toHaveProperty('capabilities');

            // Check for backend services specific capabilities
            expect(smartConfig.grant_types_supported).toContain('client_credentials');
            expect(smartConfig.token_endpoint_auth_methods_supported).toContain('private_key_jwt');
            expect(smartConfig.capabilities).toContain('client-confidential-asymmetric');

            // Check for system-level scopes
            expect(smartConfig.scopes_supported.some((scope: string) =>
                scope.startsWith('system/') || scope.includes('system/*')
            )).toBe(true);

            console.log('SMART Configuration:', JSON.stringify(smartConfig, null, 2));
        });

        it('should support required backend services authentication methods', () => {
            expect(smartConfig.token_endpoint_auth_methods_supported).toContain('private_key_jwt');
            expect(smartConfig.token_endpoint_auth_signing_alg_values_supported).toContainEqual(
                expect.stringMatching(/^(RS|ES)\d+$/)
            );
        });

        it('should advertise system-level scopes for backend services', () => {
            const systemScopes = smartConfig.scopes_supported.filter((scope: string) =>
                scope.startsWith('system/')
            );

            expect(systemScopes.length).toBeGreaterThan(0);
            expect(systemScopes).toContain('system/*.rs'); // Should support read and search
        });
    });

    describe('Step 2: Register Backend Service Client', () => {
        const backendServiceConfig: ClientConfig = {
            clientId: 'test-backend-service-flow',
            clientName: 'Test Backend Service Flow Client',
            clientType: 'backend-service',
            scope: 'system/*.rs' // Request system-level read and search access
        };

        afterAll(async () => {
            // Clean up test client
            try {
                await clientManager.unregisterClient(backendServiceConfig.clientId);
            } catch (error) {
                // Client may not exist, that's okay
            }
        });

        it('should register a backend service client with asymmetric authentication', async () => {
            backendClient = await clientManager.registerClient(backendServiceConfig);

            expect(backendClient).toHaveProperty('client_id', backendServiceConfig.clientId);
            expect(backendClient).toHaveProperty('clientType', 'backend-service');
            expect(backendClient).toHaveProperty('privateKey');
            expect(backendClient).toHaveProperty('publicKey');
            expect(backendClient).toHaveProperty('jwks');

            // Verify the client has asymmetric keys for authentication
            expect(backendClient.privateKey).toBeTruthy();
            expect(backendClient.jwks.keys).toHaveLength(1);
            expect(backendClient.jwks.keys[0]).toHaveProperty('alg');
            expect(backendClient.jwks.keys[0]).toHaveProperty('use', 'sig');

            console.log('Registered Backend Client:', {
                client_id: backendClient.client_id,
                clientType: backendClient.clientType,
                scope: backendClient.scope,
                hasPrivateKey: !!backendClient.privateKey,
                algorithm: backendClient.jwks.keys[0].alg
            });
        });

        it('should have proper JWT signing algorithm', () => {
            const algorithm = backendClient.jwks.keys[0].alg;
            expect(['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512']).toContain(algorithm);
            expect(smartConfig.token_endpoint_auth_signing_alg_values_supported).toContain(algorithm);
        });
    });

    describe('Step 3: Generate Client Assertion JWT', () => {
        let clientAssertion: string;

        it('should create a valid client assertion JWT', () => {
            expect(backendClient).toBeTruthy();
            expect(smartConfig.token_endpoint).toBeTruthy();

            clientAssertion = createClientAssertion(
                backendClient.client_id,
                smartConfig.token_endpoint,
                backendClient.privateKey,
                backendClient.jwks.keys[0].alg
            );

            expect(clientAssertion).toBeTruthy();
            expect(typeof clientAssertion).toBe('string');

            // JWT should have 3 parts separated by dots
            const jwtParts = clientAssertion.split('.');
            expect(jwtParts).toHaveLength(3);

            console.log('Generated Client Assertion JWT (header):',
                JSON.parse(Buffer.from(jwtParts[0], 'base64url').toString())
            );
            console.log('Generated Client Assertion JWT (payload):',
                JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString())
            );
        });

        it('should have correct JWT claims for backend services', () => {
            const payload = JSON.parse(
                Buffer.from(clientAssertion.split('.')[1], 'base64url').toString()
            );

            expect(payload).toHaveProperty('iss', backendClient.client_id);
            expect(payload).toHaveProperty('sub', backendClient.client_id);
            expect(payload).toHaveProperty('aud', smartConfig.token_endpoint);
            expect(payload).toHaveProperty('jti');
            expect(payload).toHaveProperty('exp');

            // Expiration should be in the future but not too far
            const now = Math.floor(Date.now() / 1000);
            expect(payload.exp).toBeGreaterThan(now);
            expect(payload.exp).toBeLessThanOrEqual(now + 300); // Max 5 minutes
        });
    });

    describe('Step 4: Retrieve Access Token', () => {
        let accessToken: string;
        let tokenResponse: any;

        it('should exchange client assertion for access token', async () => {
            const clientAssertion = createClientAssertion(
                backendClient.client_id,
                smartConfig.token_endpoint,
                backendClient.privateKey,
                backendClient.jwks.keys[0].alg
            );

            // Prepare token request according to SMART Backend Services spec
            const tokenRequest = new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'system/*.rs',
                client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                client_assertion: clientAssertion
            });

            // Make direct HTTP request to token endpoint since the generated API might not support form data
            const response = await fetch(smartConfig.token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: tokenRequest.toString()
            });

            expect(response.status).toBe(200);
            expect(response.headers.get('content-type')).toContain('application/json');

            tokenResponse = await response.json();

            expect(tokenResponse).toHaveProperty('access_token');
            expect(tokenResponse).toHaveProperty('token_type', 'Bearer');
            expect(tokenResponse).toHaveProperty('expires_in');
            expect(tokenResponse).toHaveProperty('scope');

            // Should not have error properties
            expect(tokenResponse).not.toHaveProperty('error');
            expect(tokenResponse).not.toHaveProperty('error_description');

            accessToken = tokenResponse.access_token;

            console.log('Token Response:', {
                token_type: tokenResponse.token_type,
                expires_in: tokenResponse.expires_in,
                scope: tokenResponse.scope,
                hasAccessToken: !!tokenResponse.access_token
            });
        });

        it('should grant appropriate scopes for system access', () => {
            expect(tokenResponse.scope).toBeTruthy();
            expect(tokenResponse.scope).toContain('system/');

            // Should grant read/search access to system resources
            const grantedScopes = tokenResponse.scope.split(' ');
            expect(grantedScopes.some((scope: string) =>
                scope.includes('system/') && (scope.includes('.rs') || scope.includes('.read'))
            )).toBe(true);
        });

        it('should have reasonable token expiration', () => {
            expect(tokenResponse.expires_in).toBeGreaterThan(0);
            expect(tokenResponse.expires_in).toBeLessThanOrEqual(3600); // Should not exceed 1 hour
        });
    });

    describe('Step 5: Access FHIR API', () => {
        let accessToken: string;

        beforeAll(async () => {
            // Get fresh access token
            const clientAssertion = createClientAssertion(
                backendClient.client_id,
                smartConfig.token_endpoint,
                backendClient.privateKey,
                backendClient.jwks.keys[0].alg
            );

            const tokenRequest = new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'system/*.rs',
                client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                client_assertion: clientAssertion
            });

            const response = await fetch(smartConfig.token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: tokenRequest.toString()
            });

            const tokenResponse = await response.json();
            accessToken = tokenResponse.access_token;
        });

        it('should access FHIR metadata endpoint with bearer token', async () => {
            const metadataUrl = `${baseUrl}/metadata`;

            const response = await fetch(metadataUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/fhir+json'
                }
            });

            expect(response.status).toBe(200);

            const metadata = await response.json();
            expect(metadata).toHaveProperty('resourceType', 'CapabilityStatement');
            expect(metadata).toHaveProperty('fhirVersion');

            console.log('FHIR Metadata accessed successfully:', {
                resourceType: metadata.resourceType,
                fhirVersion: metadata.fhirVersion,
                softwareName: metadata.software?.name
            });
        });

        it('should access FHIR Patient resources with system-level permissions', async () => {
            const patientUrl = `${baseUrl}/Patient?_count=5`;

            const response = await fetch(patientUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/fhir+json'
                }
            });

            expect(response.status).toBe(200);

            const bundle = await response.json();
            expect(bundle).toHaveProperty('resourceType', 'Bundle');
            expect(bundle).toHaveProperty('type', 'searchset');
            expect(bundle).toHaveProperty('entry');

            console.log('Patient search successful:', {
                resourceType: bundle.resourceType,
                type: bundle.type,
                totalEntries: bundle.entry?.length || 0,
                total: bundle.total
            });
        });

        it('should handle unauthorized requests appropriately', async () => {
            const patientUrl = `${baseUrl}/Patient?_count=1`;

            // Make request without authorization header
            const response = await fetch(patientUrl, {
                headers: {
                    'Accept': 'application/fhir+json'
                }
            });

            expect(response.status).toBe(401);
        });

        it('should handle requests with invalid token appropriately', async () => {
            const patientUrl = `${baseUrl}/Patient?_count=1`;

            // Make request with invalid token
            const response = await fetch(patientUrl, {
                headers: {
                    'Authorization': 'Bearer invalid-token-12345',
                    'Accept': 'application/fhir+json'
                }
            });

            expect(response.status).toBe(401);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should reject invalid client assertions', async () => {
            const invalidAssertion = 'invalid.jwt.token';

            const tokenRequest = new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'system/*.rs',
                client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                client_assertion: invalidAssertion
            });

            const response = await fetch(smartConfig.token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: tokenRequest.toString()
            });

            expect(response.status).toBe(400);

            const errorResponse = await response.json();
            expect(errorResponse).toHaveProperty('error');
        });

        it('should reject unsupported grant types', async () => {
            const clientAssertion = createClientAssertion(
                backendClient.client_id,
                smartConfig.token_endpoint,
                backendClient.privateKey,
                backendClient.jwks.keys[0].alg
            );

            const tokenRequest = new URLSearchParams({
                grant_type: 'authorization_code', // Wrong grant type for backend services
                scope: 'system/*.rs',
                client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                client_assertion: clientAssertion
            });

            const response = await fetch(smartConfig.token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: tokenRequest.toString()
            });

            expect(response.status).toBe(400);

            const errorResponse = await response.json();
            expect(errorResponse).toHaveProperty('error', 'unsupported_grant_type');
        });

        it('should handle expired client assertions', async () => {
            // Create an assertion that's already expired
            const jwt = require('jsonwebtoken');
            const now = Math.floor(Date.now() / 1000);

            const expiredPayload = {
                iss: backendClient.client_id,
                sub: backendClient.client_id,
                aud: smartConfig.token_endpoint,
                jti: generateJti(),
                exp: now - 60, // Expired 1 minute ago
                iat: now - 120
            };

            const expiredAssertion = jwt.sign(expiredPayload, backendClient.privateKey, {
                algorithm: backendClient.jwks.keys[0].alg,
                keyid: backendClient.jwks.keys[0].kid
            });

            const tokenRequest = new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'system/*.rs',
                client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                client_assertion: expiredAssertion
            });

            const response = await fetch(smartConfig.token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: tokenRequest.toString()
            });

            expect(response.status).toBe(400);

            const errorResponse = await response.json();
            expect(errorResponse).toHaveProperty('error');
        });
    });
});
