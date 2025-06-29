/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test suite for Keycloak admin functionality
 * This tests the backend's ability to authenticate with Keycloak and perform admin operations
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import keycloakAdmin from '../src/lib/keycloak';
import type KcAdminClient from '@keycloak/keycloak-admin-client';

// Load environment variables from parent .env file
import { join } from 'path';
import { readFileSync } from 'fs';

const envPath = join(__dirname, '../.env');
try {
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = envContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && line.includes('='));
    
    envVars.forEach(line => {
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
            const key = line.substring(0, equalIndex).trim();
            const value = line.substring(equalIndex + 1).trim();
            if (key && value && !process.env[key]) {
                process.env[key] = value;
            }
        }
    });
    console.log('✅ Loaded environment variables from .env file');
} catch (error) {
    console.warn('⚠️ Could not load .env file:', error);
}

describe('Keycloak Admin Integration', () => {
    let admin: KcAdminClient;

    beforeAll(async () => {
        console.log('Testing Keycloak admin authentication...');
        try {
            admin = await keycloakAdmin();
            console.log('✅ Keycloak admin client initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Keycloak admin client:', error);
            throw error;
        }
    });

    test('should authenticate with Keycloak using client credentials', async () => {
        expect(admin).toBeDefined();
        expect(admin.accessToken).toBeDefined();
        console.log('✅ Authentication successful, token obtained');
    });

    test('should be able to list clients in the realm', async () => {
        try {
            const clients = await admin.clients.find();
            expect(Array.isArray(clients)).toBe(true);
            console.log(`✅ Successfully retrieved ${clients.length} clients from Keycloak`);
            
            // Log some client details for debugging
            const backendClient = clients.find((c: any) => c.clientId === 'smart-on-fhir-backend');
            if (backendClient) {
                console.log('✅ Found backend client in Keycloak');
            } else {
                console.warn('⚠️  Backend client not found in Keycloak clients list');
            }
        } catch (error) {
            console.error('❌ Failed to list clients:', error);
            throw error;
        }
    });

    test('should be able to find a specific client by clientId', async () => {
        try {
            const clients = await admin.clients.find({ clientId: 'smart-on-fhir-backend' });
            expect(Array.isArray(clients)).toBe(true);
            
            if (clients.length > 0) {
                console.log('✅ Found backend client by clientId');
                console.log(`   Client ID: ${clients[0].clientId}`);
                console.log(`   Client Name: ${clients[0].name}`);
                console.log(`   Service Accounts Enabled: ${clients[0].serviceAccountsEnabled}`);
            } else {
                throw new Error('Backend client not found');
            }
        } catch (error) {
            console.error('❌ Failed to find backend client:', error);
            throw error;
        }
    });

    test('should be able to get service account user for backend client', async () => {
        try {
            const clients = await admin.clients.find({ clientId: 'smart-on-fhir-backend' });
            expect(clients.length).toBeGreaterThan(0);
            
            const clientId = clients[0].id;
            if (!clientId) throw new Error('Client ID is undefined');
            
            const serviceAccountUser = await admin.clients.getServiceAccountUser({ id: clientId });
            
            expect(serviceAccountUser).toBeDefined();
            expect(serviceAccountUser.id).toBeDefined();
            console.log('✅ Found service account user');
            console.log(`   User ID: ${serviceAccountUser.id}`);
            console.log(`   Username: ${serviceAccountUser.username}`);
        } catch (error) {
            console.error('❌ Failed to get service account user:', error);
            throw error;
        }
    });

    test('should verify service account has admin role', async () => {
        try {
            const clients = await admin.clients.find({ clientId: 'smart-on-fhir-backend' });
            const clientId = clients[0].id;
            if (!clientId) throw new Error('Client ID is undefined');
            
            const serviceAccountUser = await admin.clients.getServiceAccountUser({ id: clientId });
            if (!serviceAccountUser.id) throw new Error('Service account user ID is undefined');
            
            // Get realm role mappings for the service account user
            const roleMappings = await admin.users.listRealmRoleMappings({ id: serviceAccountUser.id });
            
            console.log('✅ Service account role mappings:');
            roleMappings.forEach((role: any) => {
                console.log(`   - ${role.name}`);
            });
            
            const hasAdminRole = roleMappings.some((role: any) => role.name === 'admin');
            expect(hasAdminRole).toBe(true);
            console.log('✅ Service account has admin role');
        } catch (error) {
            console.error('❌ Failed to verify admin role:', error);
            throw error;
        }
    });

    test('should be able to create a test client', async () => {
        const testClientId = 'test-keycloak-admin-client';
        
        try {
            // First, check if the client already exists and delete it
            const existingClients = await admin.clients.find({ clientId: testClientId });
            if (existingClients.length > 0) {
                const clientId = existingClients[0].id;
                if (!clientId) throw new Error('Existing client ID is undefined');
                await admin.clients.del({ id: clientId });
                console.log('✅ Deleted existing test client');
            }
            
            // Create a new test client
            const newClient = await admin.clients.create({
                clientId: testClientId,
                name: 'Test Keycloak Admin Client',
                enabled: true,
                protocol: 'openid-connect',
                publicClient: true,
                redirectUris: ['http://localhost:3000/callback']
            });
            
            expect(newClient).toBeDefined();
            console.log('✅ Successfully created test client');
            
            // Verify the client was created
            const verifyClients = await admin.clients.find({ clientId: testClientId });
            expect(verifyClients.length).toBe(1);
            console.log('✅ Verified test client creation');
            
            // Clean up - delete the test client
            const deleteClientId = verifyClients[0].id;
            if (!deleteClientId) throw new Error('Verify client ID is undefined');
            await admin.clients.del({ id: deleteClientId });
            console.log('✅ Cleaned up test client');
            
        } catch (error) {
            console.error('❌ Failed to create/delete test client:', error);
            throw error;
        }
    });
});
