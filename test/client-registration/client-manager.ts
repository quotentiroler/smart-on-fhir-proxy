/**
 * SMART on FHIR Client Manager
 * 
 * This module provides a comprehensive client management system for SMART on FHIR tests.
 * It integrates with the OpenAPI-generated client from test/lib/api-client to perform
 * client registration and management operations.
 * 
 * Features:
 * - Client registration via admin API (primary) with fallback to dynamic registration
 * - Client lookup and management through both local cache and remote API
 * - Support for all SMART client types: backend-service, public-app, confidential-app
 * - Automatic key pair generation for backend services
 * - Persistent client storage for test reuse
 * - Integration with OpenAPI-generated SmartAppsApi and AuthenticationApi
 * 
 * Usage:
 * ```typescript
 * const manager = new ClientManager('http://localhost:8445');
 * manager.setAdminToken('your-admin-token'); // Optional for authenticated operations
 * 
 * const client = await manager.registerClient({
 *   clientId: 'test-client',
 *   clientName: 'Test Client',
 *   clientType: 'public-app',
 *   scope: 'launch/patient patient/*.read'
 * });
 * ```
 */

import * as jose from 'jose';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  SmartAppsApi,
  AuthenticationApi,
  Configuration,
  PostAdminSmartAppsRequest,
  GetAdminSmartApps200ResponseInner,
  PutAdminSmartAppsByClientIdRequest
} from '../lib/api-client';

export interface ClientConfig {
  clientId: string;
  clientName: string;
  clientType: 'backend-service' | 'public-app' | 'confidential-app';
  scope?: string;
  redirectUris?: string[];
  jwksUri?: string;
  jwks?: any;
  privateKey?: any;
  publicKey?: any;
}

export interface RegistrationResponse {
  client_id: string;
  client_secret?: string;
  registration_access_token?: string;
  registration_client_uri?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
}

export class ClientManager {
  private baseUrl: string;
  private registeredClients: Map<string, ClientConfig & RegistrationResponse> = new Map();
  private clientsFile: string;
  private smartAppsApi: SmartAppsApi;
  private authApi: AuthenticationApi;
  private adminToken?: string;

  constructor(baseUrl: string = process.env.FHIR_BASE_URL || 'http://localhost:8445') {
    this.baseUrl = baseUrl;
    this.clientsFile = path.join(__dirname, '.registered-clients.json');

    // Initialize API clients
    const configuration = new Configuration({
      basePath: baseUrl,
      accessToken: async () => {
        // Return admin token if available
        if (this.adminToken) {
          return this.adminToken;
        }
        // For now, return empty string - authentication will be handled separately
        return '';
      }
    });

    this.smartAppsApi = new SmartAppsApi(configuration);
    this.authApi = new AuthenticationApi(configuration);

    this.loadRegisteredClients();
  }

  /**
   * Set admin token for authenticated API calls
   */
  setAdminToken(token: string): void {
    this.adminToken = token;
  }

  /**
   * Load private key from JWK format stored in client data
   */
  async loadPrivateKeyFromJWK(privateKeyJWK: any): Promise<any> {
    if (!privateKeyJWK || typeof privateKeyJWK !== 'object') {
      throw new Error('Invalid private key JWK');
    }

    try {
      return await jose.importJWK(privateKeyJWK, privateKeyJWK.alg || 'ES384');
    } catch (error) {
      throw new Error(`Failed to import private key from JWK: ${error}`);
    }
  }

  /**
   * Load previously registered clients from file
   */
  private loadRegisteredClients(): void {
    try {
      if (fs.existsSync(this.clientsFile)) {
        const data = fs.readFileSync(this.clientsFile, 'utf-8');
        const clients = JSON.parse(data);

        // Convert stored clients back to Map
        for (const [clientId, clientData] of Object.entries(clients)) {
          this.registeredClients.set(clientId, clientData as ClientConfig & RegistrationResponse);
        }
      }
    } catch (error) {
      console.warn('Could not load registered clients:', error);
    }
  }

  /**
   * Save registered clients to file
   */
  private saveRegisteredClients(): void {
    try {
      const clientsObj = Object.fromEntries(this.registeredClients.entries());
      fs.writeFileSync(this.clientsFile, JSON.stringify(clientsObj, null, 2));
    } catch (error) {
      console.warn('Could not save registered clients:', error);
    }
  }

  /**
   * Generate a key pair for client authentication
   */
  async generateKeyPair(algorithm: string = 'ES384'): Promise<{ privateKey: any; publicKey: any; jwks: any; privateKeyJWK: any }> {
    const { publicKey, privateKey } = await jose.generateKeyPair(algorithm);

    // Export both keys as JWK for storage
    const publicKeyJWK = await jose.exportJWK(publicKey);
    const privateKeyJWK = await jose.exportJWK(privateKey);
    const keyId = crypto.randomBytes(8).toString('hex');

    const jwks = {
      keys: [{
        ...publicKeyJWK,
        kid: keyId,
        use: 'sig',
        alg: algorithm
      }]
    };

    // Add kid to private key JWK for consistency
    privateKeyJWK.kid = keyId;
    privateKeyJWK.use = 'sig';
    privateKeyJWK.alg = algorithm;

    return { privateKey, publicKey, jwks, privateKeyJWK };
  }

  /**
   * Register a new SMART client using the OpenAPI client
   */
  async registerClient(config: ClientConfig): Promise<ClientConfig & RegistrationResponse> {
    // Always verify server connectivity first
    await this.testServerConnection();

    // Check if client is already registered using the improved getClient method
    const existingClient = await this.getClient(config.clientId);
    if (existingClient) {
      console.log(`✅ Client ${config.clientId} already exists, skipping registration`);
      return existingClient;
    }

    try {
      // Prepare registration request using OpenAPI types
      const registrationRequest: PostAdminSmartAppsRequest = {
        clientId: config.clientId,
        name: config.clientName,
        description: `Test client for ${config.clientType}`,
        publicClient: config.clientType === 'public-app',
        redirectUris: config.redirectUris || [],
        webOrigins: config.redirectUris || [],
        scopes: config.scope ? config.scope.split(' ') : [],
        smartVersion: '2.0.0',
        fhirVersion: 'R4'
      };

      // Generate key pair for backend services
      if (config.clientType === 'backend-service') {
        if (!config.jwks) {
          const { privateKey, publicKey, jwks, privateKeyJWK } = await this.generateKeyPair();
          // Store JWK format of private key for serialization
          config.privateKey = privateKeyJWK;
          config.publicKey = publicKey;
          config.jwks = jwks;
        }
      }

      // Register client via OpenAPI
      try {
        const registrationResponse = await this.smartAppsApi.postAdminSmartApps({
          postAdminSmartAppsRequest: registrationRequest
        });

        const fullClientConfig = {
          ...config,
          client_id: registrationResponse.clientId || config.clientId,
          // Map API response to our RegistrationResponse interface
          registration_access_token: 'admin-token', // Using admin API, no separate registration token
          client_id_issued_at: Date.now()
        };

        // Store registered client
        this.registeredClients.set(config.clientId, fullClientConfig);
        this.saveRegisteredClients();

        console.log(`Successfully registered client: ${config.clientId}`);
        return fullClientConfig;
      } catch (registrationError: any) {
        // Log the registration request for debugging 500 errors
        if (registrationError.response && registrationError.response.status === 500) {
          console.error('Registration request that caused 500 error:', JSON.stringify(registrationRequest, null, 2));
        }
        throw registrationError;
      }

    } catch (error: any) {
      console.error(`Admin API registration failed for ${config.clientId}:`, error);

      // Get more details from the error response if available
      let errorDetails = error.message;
      if (error.response) {
        try {
          const responseText = await error.response.text();
          errorDetails = `HTTP ${error.response.status}: ${responseText}`;
        } catch (responseError) {
          errorDetails = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.body) {
        errorDetails = `${error.message}. Response: ${JSON.stringify(error.body)}`;
      }

      // No fallbacks - require server connectivity and admin API to work
      throw new Error(`Client registration requires server and admin API. Registration failed for ${config.clientId}: ${errorDetails}`);
    }
  }

  /**
   * Get a registered client by ID (always checks server first)
   */
  async getClient(clientId: string): Promise<ClientConfig & RegistrationResponse | undefined> {
    // Always verify server connectivity first
    await this.testServerConnection();

    // Fetch from API (no local fallback to ensure we always validate server state)
    try {
      const apiClient = await this.smartAppsApi.getAdminSmartAppsByClientId({ clientId });
      if (apiClient) {
        // Convert API response to our format
        const clientConfig: ClientConfig & RegistrationResponse = {
          clientId: apiClient.clientId || clientId,
          clientName: apiClient.name || 'Unknown',
          clientType: this.inferClientTypeFromApiResponse(apiClient),
          client_id: apiClient.clientId || clientId,
          scope: this.extractScopesFromAttributes(apiClient.attributes)
        };

        // Cache it locally
        this.registeredClients.set(clientId, clientConfig);
        this.saveRegisteredClients();

        return clientConfig;
      }
    } catch (error: any) {
      // Check if this is a 404 (client not found) - try searching in all clients as fallback
      if (error.response && error.response.status === 404) {
        console.log(`Client ${clientId} not found via direct lookup (404), searching in all clients...`);

        try {
          // Fallback: Search through all clients
          const allClients = await this.getAllClients();
          const foundClient = allClients.find(client => client.clientId === clientId);

          if (foundClient) {
            console.log(`Found client ${clientId} in all clients list`);
            return foundClient;
          } else {
            console.log(`Client ${clientId} not found in all clients list either`);
            return undefined;
          }
        } catch (listError) {
          console.warn(`Warning: Could not search all clients for ${clientId}: ${listError}`);
          return undefined;
        }
      }

      // Check if this is a connectivity error
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        throw new Error(`Server connectivity error while fetching client ${clientId}: ${error.message}`);
      }

      // For other errors, log them but don't fail the operation
      console.warn(`Warning: Could not fetch client ${clientId} from API: ${error.message}`);
      return undefined;
    }

    return undefined;
  }

  /**
   * Get all registered clients (combines local and API data)
   */
  async getAllClients(): Promise<(ClientConfig & RegistrationResponse)[]> {
    const localClients = Array.from(this.registeredClients.values());

    try {
      // Fetch all clients from API
      const apiClients = await this.smartAppsApi.getAdminSmartApps();

      // Merge with local clients, API data takes precedence
      const allClients = new Map<string, ClientConfig & RegistrationResponse>();

      // Add local clients first
      localClients.forEach(client => {
        allClients.set(client.clientId, client);
      });

      // Add/update with API clients
      apiClients.forEach(apiClient => {
        const clientId = apiClient.clientId;
        if (clientId) {
          const clientConfig: ClientConfig & RegistrationResponse = {
            clientId,
            clientName: apiClient.name || 'Unknown',
            clientType: this.inferClientTypeFromApiResponse(apiClient),
            client_id: clientId,
            scope: this.extractScopesFromAttributes(apiClient.attributes)
          };
          allClients.set(clientId, clientConfig);
        }
      });

      return Array.from(allClients.values());
    } catch (error: any) {
      // Instead of falling back to local data, throw an error to ensure server connectivity
      throw new Error(`Failed to fetch clients from API: ${error.message}. Server connectivity is required for client operations.`);
    }
  }

  /**
   * Infer client type from API response
   */
  private inferClientTypeFromApiResponse(apiClient: GetAdminSmartApps200ResponseInner): ClientConfig['clientType'] {
    // This is a heuristic based on typical SMART client configurations
    if (apiClient.publicClient) {
      return 'public-app';
    }

    const scopeString = this.extractScopesFromAttributes(apiClient.attributes);
    if (scopeString && scopeString.includes('system/')) {
      return 'backend-service';
    }

    return 'confidential-app';
  }

  /**
   * Extract scopes from client attributes
   */
  private extractScopesFromAttributes(attributes: any): string | undefined {
    if (!attributes || typeof attributes !== 'object') {
      return undefined;
    }

    // Common attribute keys where scopes might be stored
    const scopeKeys = ['scopes', 'scope', 'oauth2.scopes', 'client.scopes'];

    for (const key of scopeKeys) {
      const value = attributes[key];
      if (value) {
        if (typeof value === 'string') {
          return value;
        }
        if (Array.isArray(value)) {
          return value.join(' ');
        }
      }
    }

    return undefined;
  }

  /**
   * Unregister a client using the OpenAPI client
   */
  async unregisterClient(clientId: string): Promise<void> {
    const client = this.registeredClients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    try {
      // Try to delete via admin API first
      await this.smartAppsApi.deleteAdminSmartAppsByClientId({ clientId });
      console.log(`Successfully unregistered client ${clientId} via admin API`);
    } catch (error) {
      console.warn(`Could not unregister client ${clientId} via admin API:`, error);

      // Try dynamic registration endpoint if available
      try {
        if (client.registration_client_uri && client.registration_access_token) {
          const response = await fetch(client.registration_client_uri, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${client.registration_access_token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Delete failed: ${response.status}`);
          }
        }
      } catch (deleteError) {
        console.warn(`Could not unregister client ${clientId} via dynamic registration:`, deleteError);
      }
    }

    this.registeredClients.delete(clientId);
    this.saveRegisteredClients();
    console.log(`Removed client ${clientId} from local storage`);
  }

  /**
   * Clear all registered clients
   */
  async clearAllClients(): Promise<void> {
    const clientIds = Array.from(this.registeredClients.keys());
    for (const clientId of clientIds) {
      try {
        await this.unregisterClient(clientId);
      } catch (error) {
        console.warn(`Could not unregister client ${clientId}:`, error);
      }
    }
  }

  /**
   * Setup default test clients
   */
  async setupDefaultTestClients(): Promise<void> {
    const defaultClients: ClientConfig[] = [
      {
        clientId: 'test-backend-service',
        clientName: 'Test Backend Service Client',
        clientType: 'backend-service',
        scope: 'system/*.read system/*.write'
      },
      {
        clientId: 'test-public-app',
        clientName: 'Test Public SMART App',
        clientType: 'public-app',
        scope: 'launch/patient patient/*.read',
        redirectUris: ['http://localhost:3000/callback', 'http://localhost:8000/callback']
      },
      {
        clientId: 'test-confidential-app',
        clientName: 'Test Confidential SMART App',
        clientType: 'confidential-app',
        scope: 'launch/patient patient/*.read patient/*.write',
        redirectUris: ['https://app.example.com/callback']
      }
    ];

    console.log('Setting up default test clients...');

    for (const clientConfig of defaultClients) {
      try {
        await this.registerClient(clientConfig);
      } catch (error) {
        console.error(`Failed to register client ${clientConfig.clientId}:`, error);
      }
    }

    console.log('Default test clients setup complete');
  }

  /**
   * Test server connection to verify it's accessible
   * @throws Error if server is not accessible
   */
  async testServerConnection(): Promise<void> {
    try {
      // Use a simple public endpoint to test connectivity
      const response = await fetch(`${this.baseUrl}`, {
        method: 'GET'
      });

      // Accept any response status as long as we can connect
      // The server is considered accessible if we get any HTTP response
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED') || error.name === 'TypeError') {
        throw new Error(`Server connection failed: ${error.message}`);
      }
      // Re-throw other errors
      throw error;
    }
  }
}

// Export singleton instance
export const clientManager = new ClientManager();
