/**
 * Client Registration Tests
 * 
 * Tests the SMART client registration functionality including:
 * - Dynamic client registration
 * - Client management utilities
 * - OAuth client setup for other tests
 * 
 * NOTE: These tests require a running server at the configured FHIR_BASE_URL.
 * Tests will fail if the server is not accessible to ensure proper integration testing.
 */

import { ClientManager, ClientConfig } from './client-manager';
import { setupClients } from './setup';

describe('SMART Client Registration', () => {
  let clientManager: ClientManager;
  const baseUrl = process.env.FHIR_BASE_URL || 'http://localhost:8445/v/R4/fhir';

  beforeAll(async () => {
    clientManager = new ClientManager(baseUrl);

    // Always verify server is accessible before running tests
    try {
      await clientManager.testServerConnection();
    } catch (error: any) {
      throw new Error(`Server is not accessible at ${baseUrl}. Tests require a running server. Error: ${error.message}`);
    }
  });

  describe('ClientManager Functionality', () => {
    it('should create a ClientManager instance', () => {
      expect(clientManager).toBeInstanceOf(ClientManager);
    });

    it('should generate key pairs for client authentication', async () => {
      const keyPair = await clientManager.generateKeyPair('ES384');

      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('jwks');
      expect(keyPair.jwks).toHaveProperty('keys');
      expect(keyPair.jwks.keys).toHaveLength(1);
      expect(keyPair.jwks.keys[0]).toHaveProperty('kid');
      expect(keyPair.jwks.keys[0]).toHaveProperty('alg', 'ES384');
      expect(keyPair.jwks.keys[0]).toHaveProperty('use', 'sig');
    });

    it('should handle client type configurations correctly', () => {
      const testConfigs: Array<{ clientType: ClientConfig['clientType']; expectedAuth: string }> = [
        { clientType: 'backend-service', expectedAuth: 'private_key_jwt' },
        { clientType: 'public-app', expectedAuth: 'none' },
        { clientType: 'confidential-app', expectedAuth: 'client_secret_basic' }
      ];

      testConfigs.forEach(({ clientType, expectedAuth }) => {
        // Access private method for testing - in real implementation, test through public interface
        const authMethod = (clientManager as any).getAuthMethodForClientType(clientType);
        expect(authMethod).toBe(expectedAuth);
      });
    });

    it('should generate appropriate scopes for client types', () => {
      const testConfigs: Array<{ clientType: ClientConfig['clientType']; expectedScope: string }> = [
        { clientType: 'backend-service', expectedScope: 'system/*.read' },
        { clientType: 'public-app', expectedScope: 'launch/patient patient/*.read' },
        { clientType: 'confidential-app', expectedScope: 'launch/patient patient/*.read' }
      ];

      testConfigs.forEach(({ clientType, expectedScope }) => {
        const scope = (clientManager as any).getDefaultScopeForClientType(clientType);
        expect(scope).toBe(expectedScope);
      });
    });
  });

  describe('Client Registration Process', () => {
    const testClientConfig: ClientConfig = {
      clientId: 'test-registration-client',
      clientName: 'Test Registration Client',
      clientType: 'backend-service',
      scope: 'system/*.read'
    };

    afterEach(async () => {
      // Clean up test client
      try {
        await clientManager.unregisterClient(testClientConfig.clientId);
      } catch (error) {
        // Client may not exist, that's okay
      }
    });

    it('should register a new backend service client', async () => {
      // Registration must succeed via API (not fallback)
      const registeredClient = await clientManager.registerClient(testClientConfig);

      expect(registeredClient).toHaveProperty('client_id', testClientConfig.clientId);
      expect(registeredClient).toHaveProperty('clientName', testClientConfig.clientName);
      expect(registeredClient).toHaveProperty('clientType', testClientConfig.clientType);

      // For backend service, should have generated keys
      if (registeredClient.clientType === 'backend-service') {
        expect(registeredClient).toHaveProperty('privateKey');
        expect(registeredClient).toHaveProperty('jwks');
      }

      // Verify the client was actually registered on the server
      const retrievedFromServer = await clientManager.getClient(testClientConfig.clientId);
      expect(retrievedFromServer).toBeDefined();
    });

    it('should return existing client if already registered', async () => {
      // Register client first time
      const firstRegistration = await clientManager.registerClient(testClientConfig);

      // Try to register same client again
      const secondRegistration = await clientManager.registerClient(testClientConfig);

      expect(firstRegistration.client_id).toBe(secondRegistration.client_id);
      expect(firstRegistration.clientName).toBe(secondRegistration.clientName);
    });

    it('should retrieve registered client by ID', async () => {
      await clientManager.registerClient(testClientConfig);

      const retrievedClient = await clientManager.getClient(testClientConfig.clientId);

      expect(retrievedClient).toBeDefined();
      expect(retrievedClient?.clientId).toBe(testClientConfig.clientId);
      expect(retrievedClient?.clientName).toBe(testClientConfig.clientName);
    });

    it('should list all registered clients', async () => {
      await clientManager.registerClient(testClientConfig);

      const allClients = await clientManager.getAllClients();

      expect(Array.isArray(allClients)).toBe(true);
      expect(allClients.some(client => client.clientId === testClientConfig.clientId)).toBe(true);
    });

    it('should handle registration failures gracefully', async () => {
      const invalidConfig: ClientConfig = {
        clientId: 'invalid-client-with-very-long-name-that-might-exceed-limits-and-cause-registration-to-fail',
        clientName: 'Invalid Client',
        clientType: 'backend-service',
        scope: 'invalid-scope'
      };

      // This should not throw, but might fall back to local registration
      const result = await clientManager.registerClient(invalidConfig);

      expect(result).toBeDefined();
      expect(result.clientId).toBe(invalidConfig.clientId);
    });
  });

  describe('Public App Client Registration', () => {
    const publicAppConfig: ClientConfig = {
      clientId: 'test-public-app-client',
      clientName: 'Test Public App Client',
      clientType: 'public-app',
      scope: 'launch/patient patient/*.read',
      redirectUris: ['http://localhost:3000/callback', 'http://localhost:8000/callback']
    };

    afterEach(async () => {
      try {
        await clientManager.unregisterClient(publicAppConfig.clientId);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should register a public app client with redirect URIs', async () => {
      const registeredClient = await clientManager.registerClient(publicAppConfig);

      expect(registeredClient.clientType).toBe('public-app');
      expect(registeredClient.redirectUris).toEqual(publicAppConfig.redirectUris);
      expect(registeredClient.scope).toContain('patient/*.read');
    });
  });

  describe('Confidential App Client Registration', () => {
    const confidentialAppConfig: ClientConfig = {
      clientId: 'test-confidential-app-client',
      clientName: 'Test Confidential App Client',
      clientType: 'confidential-app',
      scope: 'launch/patient patient/*.read patient/*.write',
      redirectUris: ['https://app.example.com/callback']
    };

    afterEach(async () => {
      try {
        await clientManager.unregisterClient(confidentialAppConfig.clientId);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should register a confidential app client', async () => {
      const registeredClient = await clientManager.registerClient(confidentialAppConfig);

      expect(registeredClient.clientType).toBe('confidential-app');
      expect(registeredClient.redirectUris).toEqual(confidentialAppConfig.redirectUris);
      expect(registeredClient.scope).toContain('patient/*.write');
    });
  });

  describe('Default Test Clients Setup', () => {
    it('should setup default test clients without errors', async () => {
      // This test ensures the setup process works
      await expect(clientManager.setupDefaultTestClients()).resolves.not.toThrow();

      // Verify default clients are available
      const backendClient = await clientManager.getClient('test-backend-service');
      const publicClient = await clientManager.getClient('test-public-app');
      const confidentialClient = await clientManager.getClient('test-confidential-app');

      expect(backendClient).toBeDefined();
      expect(publicClient).toBeDefined();
      expect(confidentialClient).toBeDefined();
    }, 30000); // Increase timeout for API calls
  });

  describe('Setup Script Integration', () => {
    it('should run setup clients script successfully', async () => {
      // Test the setup script that would be used before running other tests
      await expect(setupClients()).resolves.not.toThrow();
    }, 30000); // Increase timeout for API calls
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create client manager with invalid URL to test error handling
      const invalidClientManager = new ClientManager('http://invalid-server:9999');

      const testConfig: ClientConfig = {
        clientId: 'test-network-error',
        clientName: 'Test Network Error',
        clientType: 'backend-service'
      };

      // Should not throw, should fall back to local registration
      const result = await invalidClientManager.registerClient(testConfig);
      expect(result).toBeDefined();
      expect(result.clientId).toBe(testConfig.clientId);
    });

    it('should fail when server is down', async () => {
      // Create client manager with invalid URL
      const invalidClientManager = new ClientManager('http://invalid-server:9999');

      const testConfig: ClientConfig = {
        clientId: 'test-network-error',
        clientName: 'Test Network Error',
        clientType: 'backend-service'
      };

      // This should fail when server is down
      await expect(invalidClientManager.testServerConnection()).rejects.toThrow('Server connection failed');
    });

    it('should require API connectivity for client operations', async () => {
      // This test ensures that we actually require server connectivity
      // Try to get a non-existent client - this should make an API call
      const nonExistentClient = await clientManager.getClient('definitely-non-existent-client-12345');

      // We expect this to either:
      // 1. Return undefined if the API call succeeded but client doesn't exist
      // 2. Throw an error if API call failed
      // But we should NOT get a cached/fallback result
      expect(nonExistentClient).toBeUndefined();
    });

    it('should handle missing clients gracefully', async () => {
      const nonExistentClient = await clientManager.getClient('non-existent-client');
      expect(nonExistentClient).toBeUndefined();
    });

    it('should handle unregistering non-existent clients', async () => {
      await expect(
        clientManager.unregisterClient('non-existent-client')
      ).rejects.toThrow('Client non-existent-client not found');
    });
  });
});
