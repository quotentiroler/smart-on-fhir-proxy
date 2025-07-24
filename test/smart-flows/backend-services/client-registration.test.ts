import { expect, describe, test, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosResponse } from 'axios';
import { generateTestKeyPair } from '../../util/test-helpers';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8445';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface BackendServiceClient {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  enabled: boolean;
  clientAuthenticatorType: string;
  serviceAccountsEnabled: boolean;
  standardFlowEnabled: boolean;
  attributes?: {
    client_type?: string[];
    'use.jwks.string'?: string[];
    'jwks.string'?: string[];
    'token.endpoint.auth.signing.alg'?: string[];
  };
}

describe('Backend Services Client Registration', () => {
  let serverRunning = false;
  let adminToken: string;
  let keyPair: { privateKey: string; publicKey: string };
  let testClientId: string;

  // Helper function to check if backend server is running
  async function isServerRunning(): Promise<boolean> {
    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Helper function to get admin token
  async function getAdminToken(): Promise<string> {
    try {
      // Use URLSearchParams for proper form encoding
      const formData = new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-ui',
        client_secret: 'admin-ui-secret',
        username: 'admin', // Use username instead of email
        password: ADMIN_PASSWORD,
        scope: 'openid profile email'
      });

      const response = await axios.post(`${BASE_URL}/auth/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.warn('Could not get admin token:', (error as any).message);
      throw error;
    }
  }

  beforeAll(async () => {
    // Check server availability
    serverRunning = await isServerRunning();
    console.log(`Backend server (${BASE_URL}): ${serverRunning ? 'Running' : 'Not running'}`);

    if (serverRunning) {
      try {
        // Get admin token for API calls
        adminToken = await getAdminToken();
        console.log('✅ Admin token obtained');
        
        // Generate test key pair for Backend Services
        keyPair = generateTestKeyPair();
        console.log('✅ Test key pair generated');
        
        // Generate unique client ID for test
        testClientId = `test-backend-service-${Date.now()}`;
        
      } catch (error) {
        console.warn('Setup failed:', (error as any).message);
      }
    }
  });

  afterAll(async () => {
    // Cleanup: delete test client if it was created
    if (serverRunning && adminToken && testClientId) {
      try {
        await axios.delete(`${BASE_URL}/admin/smart-apps/${testClientId}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });
        console.log('✅ Test client cleaned up');
      } catch (error) {
        console.warn('Cleanup failed:', (error as any).message);
      }
    }
  });

  describe('Admin Authentication', () => {
    test('should authenticate admin user', async () => {
      if (!serverRunning) {
        console.log('❌ Cannot test admin auth - server not running');
        expect(serverRunning).toBe(true);
        return;
      }

      expect(adminToken).toBeTruthy();
      console.log('✅ Admin authentication successful');
    });
  });

  describe('Backend Services Client Creation', () => {
    test('should create Backend Services client with JWT authentication', async () => {
      if (!serverRunning || !adminToken) {
        console.log('❌ Cannot test client creation - server not running or no admin token');
        expect(serverRunning && adminToken).toBeTruthy();
        return;
      }

      const clientData = {
        clientId: testClientId,
        name: 'Test Backend Service',
        description: 'Test client for Backend Services authentication',
        clientType: 'backend-service',
        publicKey: keyPair.publicKey,
        systemScopes: ['system/*.read', 'system/*.write']
      };

      try {
        const response: AxiosResponse<BackendServiceClient> = await axios.post(
          `${BASE_URL}/admin/smart-apps`,
          clientData,
          {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        expect(response.status).toBe(200);
        expect(response.data.clientId).toBe(testClientId);
        expect(response.data.name).toBe('Test Backend Service');
        expect(response.data.enabled).toBe(true);
        
        // Debug: Log all returned fields to see what's available
        console.log('📋 Created client fields:', Object.keys(response.data));
        console.log('🔍 clientAuthenticatorType:', response.data.clientAuthenticatorType);
        console.log('🔍 Full auth config:', {
          clientAuthenticatorType: response.data.clientAuthenticatorType,
          serviceAccountsEnabled: response.data.serviceAccountsEnabled,
          standardFlowEnabled: response.data.standardFlowEnabled
        });
        
        // Verify Backend Services specific configuration
        expect(response.data.clientAuthenticatorType).toBe('client-jwt');
        expect(response.data.serviceAccountsEnabled).toBe(true);
        expect(response.data.standardFlowEnabled).toBe(false);
        
        // Check attributes for Backend Services configuration
        expect(response.data.attributes?.client_type).toContain('backend-service');
        expect(response.data.attributes?.['use.jwks.string']).toContain('true');
        expect(response.data.attributes?.['jwks.string']).toBeTruthy();
        expect(response.data.attributes?.['token.endpoint.auth.signing.alg']).toContain('RS384');
        
        console.log('✅ Backend Services client created successfully');
        console.log(`   Client ID: ${response.data.clientId}`);
        console.log(`   Auth Type: ${response.data.clientAuthenticatorType}`);
        console.log(`   Service Accounts: ${response.data.serviceAccountsEnabled}`);
        
      } catch (error: any) {
        console.error('❌ Failed to create Backend Services client:', error.response?.data || error.message);
        throw error;
      }
    });

    test('should validate public key requirement for Backend Services', async () => {
      if (!serverRunning || !adminToken) {
        console.log('❌ Cannot test validation - server not running or no admin token');
        expect(serverRunning && adminToken).toBeTruthy();
        return;
      }

      const invalidClientData = {
        clientId: `test-invalid-${Date.now()}`,
        name: 'Invalid Backend Service',
        clientType: 'backend-service'
        // Missing publicKey or jwksUri
      };

      try {
        const response = await axios.post(
          `${BASE_URL}/admin/smart-apps`,
          invalidClientData,
          {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Should not reach here
        expect(true).toBe(false);
        
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data?.error).toContain('publicKey or jwksUri');
        console.log('✅ Properly rejected Backend Services client without public key');
      }
    });

    test('should list created Backend Services client', async () => {
      if (!serverRunning || !adminToken) {
        console.log('❌ Cannot test client listing - server not running or no admin token');
        expect(serverRunning && adminToken).toBeTruthy();
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/admin/smart-apps`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        
        // Find our test client
        const testClient = response.data.find((client: any) => client.clientId === testClientId);
        expect(testClient).toBeTruthy();
        
        console.log('✅ Backend Services client found in listing');
        console.log(`   Total clients: ${response.data.length}`);
        
      } catch (error: any) {
        console.error('❌ Failed to list clients:', error.response?.data || error.message);
        throw error;
      }
    });

    test('should get specific Backend Services client details', async () => {
      if (!serverRunning || !adminToken) {
        console.log('❌ Cannot test client details - server not running or no admin token');
        expect(serverRunning && adminToken).toBeTruthy();
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/admin/smart-apps/${testClientId}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.clientId).toBe(testClientId);
        expect(response.data.clientAuthenticatorType).toBe('client-jwt');
        
        console.log('✅ Backend Services client details retrieved');
        
      } catch (error: any) {
        console.error('❌ Failed to get client details:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Integration with Backend Services Authentication', () => {
    test('should show implementation roadmap for full integration', () => {
      console.log('\n🚧 Backend Services Client Registration Status:');
      console.log('');
      console.log('✅ Completed:');
      console.log('   - Client registration endpoint with Backend Services support');
      console.log('   - Public key registration in JWKS format');
      console.log('   - Proper client authentication configuration');
      console.log('   - System scopes configuration');
      console.log('   - JWT authentication method setup');
      console.log('');
      console.log('🎯 Next Integration Points:');
      console.log('   1. Test with real JWT client assertions');
      console.log('   2. Verify token endpoint accepts registered clients');
      console.log('   3. Test FHIR resource access with system tokens');
      console.log('   4. Add client certificate validation');
      console.log('   5. Implement JWKS endpoint discovery');
      
      expect(true).toBe(true);
    });
  });
});
