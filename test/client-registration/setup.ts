#!/usr/bin/env node
/**
 * Setup script to ensure the SMART on FHIR server is running and all required clients are registered.
 * This script:
 * 1. Checks if the server is running
 * 2. If not, starts the server with `bun run dev`
 * 3. Waits for the server to be ready
 * 4. Registers any missing SMART clients for testing
 */

import { ClientManager } from './client-manager';
import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Check if the server is accessible
 */
async function isServerRunning(): Promise<boolean> {
    try {
        // Try a basic HTTP request to the server first (don't require auth for this check)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('http://localhost:8445/swagger', {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // If we can reach the swagger endpoint, the server is running
        if (response.status === 200 || response.status === 404) {
            return true;
        }
    } catch (error) {
        // If basic HTTP fails, try the ClientManager test as fallback
        try {
            const clientManager = new ClientManager();
            await clientManager.testServerConnection();
            return true;
        } catch (clientError) {
            return false;
        }
    }

    return false;
}

/**
 * Start the SMART on FHIR server
 */
async function startServer(): Promise<void> {
    console.log('🚀 Starting SMART on FHIR server...');

    // Go up one directory from test to reach the project root
    const projectRoot = path.resolve(__dirname, '../../');

    return new Promise((resolve, reject) => {
        const serverProcess = spawn('bun', ['run', 'dev'], {
            cwd: projectRoot,
            stdio: 'pipe', // Capture output
            shell: true
        });

        let serverOutput = '';
        let serverReady = false;

        // Listen for server output to detect when it's ready
        serverProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            serverOutput += output;

            // Look for the specific message that indicates the server is ready
            if (output.includes('Elysia SMART proxy listening at http://localhost:8445') ||
                output.includes('API Documentation available at http://localhost:8445/swagger')) {
                console.log('✅ Server appears to be starting...');
            }
        });

        serverProcess.stderr?.on('data', (data) => {
            const output = data.toString();
            console.log('Server stderr:', output);
        });

        serverProcess.on('error', (error) => {
            console.error('❌ Failed to start server:', error);
            reject(error);
        });

        // Give the server some time to start, then check if it's accessible
        setTimeout(async () => {
            for (let i = 0; i < 60; i++) { // Try for 60 seconds (increased from 30)
                try {
                    if (await isServerRunning()) {
                        console.log('✅ Server is now accessible!');
                        serverReady = true;
                        resolve();
                        return;
                    }
                } catch (error) {
                    // Server not ready yet, continue waiting
                }

                console.log(`⏳ Waiting for server to be ready... (${i + 1}/60)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (!serverReady) {
                console.error('❌ Server did not become ready within 60 seconds');
                console.log('Server output:', serverOutput);
                serverProcess.kill();
                reject(new Error('Server startup timeout'));
            }
        }, 5000); // Wait 5 seconds before starting to check (increased from 2)
    });
}

/**
 * Create the backend service client in Keycloak if it doesn't exist
 */
async function ensureBackendClient(): Promise<void> {
    console.log('🔑 Checking if backend service client exists in Keycloak...');

    try {
        // Get admin token from Keycloak
        const tokenResponse = await fetch('http://localhost:8080/realms/master/protocol/openid-connect/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=password&client_id=admin-cli&username=admin&password=admin'
        });

        if (!tokenResponse.ok) {
            throw new Error(`Failed to get Keycloak admin token: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json() as any;
        const adminToken = tokenData.access_token;

        // Check if the smart-on-fhir-backend client exists
        const clientsResponse = await fetch('http://localhost:8080/admin/realms/smart-on-fhir/clients?clientId=smart-on-fhir-backend', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!clientsResponse.ok) {
            throw new Error(`Failed to check existing clients: ${clientsResponse.status}`);
        }

        const existingClients = await clientsResponse.json() as any[];

        if (existingClients.length > 0) {
            console.log('✅ Backend service client already exists in Keycloak');
            return;
        }

        console.log('🔄 Creating backend service client in Keycloak...');

        // Create the backend service client
        const clientConfig = {
            clientId: 'smart-on-fhir-backend',
            name: 'SMART on FHIR Backend Service',
            enabled: true,
            clientAuthenticatorType: 'client-secret',
            secret: 'your-client-secret',
            protocol: 'openid-connect',
            publicClient: false,
            bearerOnly: false,
            standardFlowEnabled: false,
            implicitFlowEnabled: false,
            directAccessGrantsEnabled: false,
            serviceAccountsEnabled: true,
            authorizationServicesEnabled: false,
            fullScopeAllowed: true,
            defaultClientScopes: [
                'web-origins',
                'acr',
                'profile',
                'roles',
                'email'
            ],
            optionalClientScopes: [
                'address',
                'phone',
                'offline_access',
                'microprofile-jwt'
            ]
        };

        const createResponse = await fetch('http://localhost:8080/admin/realms/smart-on-fhir/clients', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clientConfig)
        });

        if (!createResponse.ok) {
            const errorBody = await createResponse.text();
            throw new Error(`Failed to create backend client: ${createResponse.status} - ${errorBody}`);
        }

        console.log('✅ Successfully created backend service client in Keycloak');

        // Wait a moment for the client to be fully registered
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
        console.error('❌ Failed to ensure backend client exists:', error.message || error);
        throw new Error(`Backend client setup failed: ${error.message}`);
    }
}

/**
 * Get admin token from Keycloak
 */
async function getAdminToken(): Promise<string> {
    const tokenResponse = await fetch('http://localhost:8080/realms/master/protocol/openid-connect/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=password&client_id=admin-cli&username=admin&password=admin'
    });

    if (!tokenResponse.ok) {
        throw new Error(`Failed to get Keycloak admin token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json() as any;
    return tokenData.access_token;
}

/**
 * Setup SMART clients for testing
 */
async function setupClients() {
    console.log('🔧 Setting up SMART on FHIR test clients...');

    const clientManager = new ClientManager();

    // Get admin token and set it on the client manager
    try {
        const adminToken = await getAdminToken();
        clientManager.setAdminToken(adminToken);
    } catch (error) {
        throw new Error(`Failed to get admin token for client operations: ${error}`);
    }

    // Now test if the admin API is accessible
    console.log('🔍 Testing admin API accessibility...');
    try {
        // Try to list existing clients to test admin API
        const existingClients = await clientManager.getAllClients();
        console.log(`✅ Admin API is accessible. Found ${existingClients.length} existing clients.`);
    } catch (error: any) {
        console.error('❌ Admin API test failed:', error.message || error);

        if (error.response) {
            console.error(`   Status: ${error.response.status} ${error.response.statusText}`);
            try {
                const errorBody = await error.response.text();
                console.error(`   Response body: ${errorBody}`);
            } catch (bodyError) {
                console.error(`   Could not read response body: ${bodyError}`);
            }
        }

        throw new Error('Admin API is not accessible. Server may not be fully ready or there may be authentication issues.');
    }

    // Define the clients we need for our test flows
    const requiredClients = [
        {
            clientId: 'test-public-client',
            clientName: 'Test Public Client',
            clientType: 'public-app' as const,
            scope: 'openid profile launch launch/patient patient/*.read user/*.read',
            redirectUris: ['http://localhost:3000/callback']
        },
        {
            clientId: 'test-confidential-client',
            clientName: 'Test Confidential Client',
            clientType: 'confidential-app' as const,
            scope: 'openid profile launch launch/patient patient/*.read user/*.read system/*.read',
            redirectUris: ['http://localhost:3000/callback']
        },
        {
            clientId: 'test-backend-service',
            clientName: 'Test Backend Service Client',
            clientType: 'backend-service' as const,
            scope: 'system/*.read system/*.write',
            redirectUris: []
        }
    ];

    let registeredCount = 0;
    let skippedCount = 0;

    for (const clientConfig of requiredClients) {
        console.log(`\n📝 Checking client: ${clientConfig.clientId}`);

        try {
            const existingClient = await clientManager.getClient(clientConfig.clientId);
            if (existingClient) {
                console.log(`✅ Client already exists: ${clientConfig.clientId}`);
                skippedCount++;
                continue;
            }

            console.log(`🔄 Registering new client: ${clientConfig.clientId}`);
            const newClient = await clientManager.registerClient(clientConfig);
            console.log(`✅ Successfully registered: ${newClient.clientId}`);
            registeredCount++;

        } catch (error: any) {
            console.error(`❌ Failed to register client ${clientConfig.clientId}:`, error.message || error);

            // Try to get more details about the error
            if (error.response) {
                console.error(`   Status: ${error.response.status} ${error.response.statusText}`);
                console.error(`   URL: ${error.response.url}`);

                try {
                    const errorBody = await error.response.text();
                    console.error(`   Response body: ${errorBody}`);
                } catch (bodyError) {
                    console.error(`   Could not read response body: ${bodyError}`);
                }
            }

            throw error;
        }
    }

    console.log(`\n🎉 Client setup complete!`);
    console.log(`   • Registered: ${registeredCount} new clients`);
    console.log(`   • Skipped: ${skippedCount} existing clients`);
    console.log(`   • Total clients: ${registeredCount + skippedCount}`);

    // Display client information for reference
    console.log('\n📋 Available clients for tests:');
    for (const clientConfig of requiredClients) {
        const client = await clientManager.getClient(clientConfig.clientId);
        if (client) {
            console.log(`   • ${client.clientId} (${client.clientType})`);
            if ((client.clientType === 'confidential-app' || client.clientType === 'backend-service') && client.privateKey) {
                console.log(`     - Uses JWT authentication with stored private key`);
            }
        }
    }

    console.log('\n✨ Ready to run tests!');
}

/**
 * Main setup function that ensures server is running and clients are registered
 */
async function setup() {
    console.log('🔧 SMART on FHIR Test Environment Setup');
    console.log('=====================================\n');

    try {
        // Check if server is already running
        console.log('🔍 Checking if SMART on FHIR server is running...');

        if (await isServerRunning()) {
            console.log('✅ Server is already running and accessible!');
        } else {
            console.log('❌ Server is not running or not accessible');
            await startServer();
        }

        // Ensure the backend service client exists
        await ensureBackendClient();

        // Setup test clients
        await setupClients();

        console.log('\n🎯 Environment setup complete! You can now run tests.');

    } catch (error) {
        console.error('\n❌ Setup failed:', error);
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    setup().catch(error => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}

export { setup, setupClients };
