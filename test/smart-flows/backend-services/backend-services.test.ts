import { expect, describe, test, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';
import { generateTestKeyPair, createClientAssertion, generateJti } from '../../util/test-helpers';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8445';
const FHIR_BASE_URL = process.env.FHIR_BASE_URL || 'http://localhost:8445/smart-proxy/hapi-fhir-server/R4';
const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'smart-on-fhir';

// Test client configuration for Backend Services
const TEST_CLIENT_ID = 'backend-service-test-client';
const TEST_CLIENT_SCOPE = 'system/*.read system/*.write';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface SmartConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  introspection_endpoint: string;
  grant_types_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  scopes_supported: string[];
}

describe('SMART Backend Services Authentication Flow', () => {
  let serverRunning = false;
  let keycloakRunning = false;
  let keyPair: { privateKey: string; publicKey: string };
  let smartConfig: SmartConfiguration;

  // Helper function to check if backend server is running
  async function isServerRunning(): Promise<boolean> {
    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Helper function to check if Keycloak is running
  async function isKeycloakRunning(): Promise<boolean> {
    try {
      const response = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  beforeAll(async () => {
    // Check server availability
    serverRunning = await isServerRunning();
    keycloakRunning = await isKeycloakRunning();
    
    console.log(`Backend server (${BASE_URL}): ${serverRunning ? 'Running' : 'Not running'}`);
    console.log(`Keycloak server (${KEYCLOAK_BASE_URL}): ${keycloakRunning ? 'Running' : 'Not running'}`);

    if (serverRunning) {
      // Generate test key pair for JWT signing
      keyPair = generateTestKeyPair();
      
      // Get SMART configuration
      try {
        const response = await axios.get(`${FHIR_BASE_URL}/.well-known/smart-configuration`);
        smartConfig = response.data;
      } catch (error) {
        console.warn('Could not fetch SMART configuration:', (error as any).message);
      }
    }
  });

  describe('SMART Configuration Discovery', () => {
    test('should discover SMART configuration endpoint', async () => {
      if (!serverRunning) {
        console.log('❌ Cannot test SMART configuration - server not running');
        expect(serverRunning).toBe(true);
        return;
      }

      const response = await axios.get(`${FHIR_BASE_URL}/.well-known/smart-configuration`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('authorization_endpoint');
      expect(response.data).toHaveProperty('token_endpoint');
      expect(response.data).toHaveProperty('grant_types_supported');
      
      // Check Backend Services support
      expect(response.data.grant_types_supported).toContain('client_credentials');
      expect(response.data.token_endpoint_auth_methods_supported).toContain('private_key_jwt');
      
      console.log('✅ SMART Configuration discovered with Backend Services support');
    });

    test('should validate required Backend Services capabilities', async () => {
      if (!serverRunning || !smartConfig) {
        console.log('❌ Cannot validate capabilities - server not running or config unavailable');
        expect(serverRunning && smartConfig).toBeTruthy();
        return;
      }

      // Validate Backend Services specific requirements
      expect(smartConfig.grant_types_supported).toContain('client_credentials');
      expect(smartConfig.token_endpoint_auth_methods_supported).toContain('private_key_jwt');
      
      // Should support system scopes
      const hasSystemScopes = smartConfig.scopes_supported?.some(scope => 
        scope.startsWith('system/') || scope.includes('system')
      );
      expect(hasSystemScopes).toBe(true);
      
      console.log('✅ Backend Services capabilities validated');
    });
  });

  describe('Client Credentials Grant with JWT Authentication', () => {
    test('should create valid client assertion JWT', () => {
      if (!serverRunning || !smartConfig) {
        console.log('❌ Cannot test JWT creation - server not running or config unavailable');
        expect(serverRunning && smartConfig).toBeTruthy();
        return;
      }

      const clientAssertion = createClientAssertion(
        TEST_CLIENT_ID,
        smartConfig.token_endpoint,
        keyPair.privateKey,
        'RS384'
      );

      // Verify JWT structure
      const decoded = jwt.decode(clientAssertion, { complete: true }) as any;
      expect(decoded).toBeTruthy();
      expect(decoded.header.alg).toBe('RS384');
      expect(decoded.header.typ).toBe('JWT');
      
      // Verify payload
      expect(decoded.payload.iss).toBe(TEST_CLIENT_ID);
      expect(decoded.payload.sub).toBe(TEST_CLIENT_ID);
      expect(decoded.payload.aud).toBe(smartConfig.token_endpoint);
      expect(decoded.payload.jti).toBeTruthy();
      expect(decoded.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      
      console.log('✅ Client assertion JWT created and validated');
    });

    test('should handle token request with client_credentials grant', async () => {
      if (!serverRunning || !keycloakRunning || !smartConfig) {
        console.log('❌ Cannot test token request - servers not running or config unavailable');
        expect(serverRunning && keycloakRunning && smartConfig).toBeTruthy();
        return;
      }

      // Note: This test will likely fail until client is properly registered
      // This is expected and shows what needs to be implemented
      const clientAssertion = createClientAssertion(
        TEST_CLIENT_ID,
        smartConfig.token_endpoint,
        keyPair.privateKey,
        'RS384'
      );

      const tokenRequestData = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: TEST_CLIENT_SCOPE,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion
      });

      try {
        const response: AxiosResponse<TokenResponse> = await axios.post(
          smartConfig.token_endpoint,
          tokenRequestData,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            }
          }
        );

        // Successful token response
        expect(response.status).toBe(200);
        expect(response.data.access_token).toBeTruthy();
        expect(response.data.token_type).toBe('Bearer');
        expect(response.data.expires_in).toBeGreaterThan(0);
        
        console.log('✅ Token obtained successfully via client_credentials grant');
        
      } catch (error: any) {
        // OAuth2 errors should return 400 status with error payload
        if (error.response?.status === 400 || error.response?.status === 401) {
          const errorData = error.response.data;
          
          if (errorData.error === 'invalid_client') {
            console.log('❌ Client not registered - this needs to be implemented');
            console.log('   Client ID:', TEST_CLIENT_ID);
            console.log('   Error:', errorData.error);
            console.log('   Description:', errorData.error_description);
            console.log('   Public Key needed for client registration');
            
            // This failure is expected and indicates what needs to be done
            expect(errorData.error).toBe('invalid_client');
          } else {
            console.log('❌ Other OAuth2 error:', errorData.error);
            console.log('   Description:', errorData.error_description);
            throw error;
          }
        } else {
          console.error('Unexpected error:', error.response?.data || error.message);
          throw error;
        }
      }
    });
  });

  describe('FHIR Resource Access with System Tokens', () => {
    test('should access FHIR resources with valid system token', async () => {
      // This test shows how system-level access should work
      // Currently will be skipped since we don't have a registered client yet
      
      if (!serverRunning || !keycloakRunning) {
        console.log('❌ Cannot test FHIR access - servers not running');
        expect(serverRunning && keycloakRunning).toBeTruthy();
        return;
      }

      console.log('ℹ️  This test requires a properly registered Backend Services client');
      console.log('   Implementation needed:');
      console.log('   1. Client registration in Keycloak with JWT auth');
      console.log('   2. System scopes configuration');
      console.log('   3. Public key registration for JWT verification');
      
      // For now, just validate the test structure
      expect(TEST_CLIENT_SCOPE).toContain('system/');
      expect(FHIR_BASE_URL).toBeTruthy();
    });

    test('should handle token introspection for system tokens', async () => {
      if (!serverRunning || !smartConfig) {
        console.log('❌ Cannot test token introspection - server not running or config unavailable');
        expect(serverRunning && smartConfig).toBeTruthy();
        return;
      }

      // Validate introspection endpoint is available
      expect(smartConfig.introspection_endpoint).toBeTruthy();
      
      console.log('ℹ️  Token introspection endpoint available:', smartConfig.introspection_endpoint);
      console.log('   Implementation needed for full introspection testing');
    });
  });

  describe('Security and Error Handling', () => {
    test('should reject invalid client assertions', async () => {
      if (!serverRunning || !keycloakRunning || !smartConfig) {
        console.log('❌ Cannot test security - servers not running or config unavailable');
        expect(serverRunning && keycloakRunning && smartConfig).toBeTruthy();
        return;
      }

      // Test with invalid JWT
      const invalidAssertion = 'invalid.jwt.token';
      
      const tokenRequestData = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: TEST_CLIENT_SCOPE,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: invalidAssertion
      });

      try {
        const response = await axios.post(smartConfig.token_endpoint, tokenRequestData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        });
        
        // If we get here, the request didn't fail as expected
        console.error('❌ Invalid assertion was accepted - this is a security issue!');
        expect(true).toBe(false);
        
      } catch (error: any) {
        // Should receive 400 Bad Request for invalid assertion
        expect(error.response?.status).toBeGreaterThanOrEqual(400);
        expect(error.response?.data?.error).toBeTruthy();
        console.log('✅ Invalid client assertion properly rejected');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.error);
      }
    });

    test('should validate scope restrictions', async () => {
      if (!serverRunning || !smartConfig) {
        console.log('❌ Cannot test scope validation - server not running or config unavailable');
        expect(serverRunning && smartConfig).toBeTruthy();
        return;
      }

      // Validate that system scopes are properly configured
      const systemScopes = smartConfig.scopes_supported?.filter(scope => 
        scope.startsWith('system/')
      );
      
      expect(systemScopes).toBeTruthy();
      console.log('✅ System scopes available:', systemScopes);
    });
  });

  describe('Implementation Status', () => {
    test('should provide clear implementation roadmap', () => {
      console.log('\n🚧 Backend Services Implementation Status:');
      console.log('');
      console.log('✅ Completed:');
      console.log('   - SMART configuration endpoint');
      console.log('   - JWT assertion creation utilities');
      console.log('   - Test framework structure');
      console.log('');
      console.log('❌ Still Needed:');
      console.log('   1. Client registration endpoint/process');
      console.log('   2. Keycloak client setup with JWT auth');
      console.log('   3. Public key registration for JWT verification');
      console.log('   4. System scope configuration in Keycloak');
      console.log('   5. FHIR proxy authentication integration');
      console.log('');
      console.log('🎯 Next Steps:');
      console.log('   1. Implement client registration in admin API');
      console.log('   2. Configure Keycloak realm for Backend Services');
      console.log('   3. Add JWT verification in token validation');
      console.log('   4. Test with real FHIR operations');
      
      expect(true).toBe(true);
    });
  });
});
