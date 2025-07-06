import { 
  AuthenticationApi, 
  HealthcareUsersApi,
  IdentityProvidersApi,
  LaunchContextsApi,
  RolesApi,
  SmartAppsApi,
  ServersApi,
  Configuration 
} from './api-client';

// Create API client configuration
const createConfig = (token?: string) => {
  // Use environment variable or fallback to localhost:8445
  const basePath = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8445';
  return new Configuration({
    basePath,
    accessToken: token,
  });
};

// Create individual API clients
export const createAuthApi = (token?: string) => new AuthenticationApi(createConfig(token));
export const createHealthcareUsersApi = (token?: string) => new HealthcareUsersApi(createConfig(token));
export const createIdentityProvidersApi = (token?: string) => new IdentityProvidersApi(createConfig(token));
export const createLaunchContextsApi = (token?: string) => new LaunchContextsApi(createConfig(token));
export const createRolesApi = (token?: string) => new RolesApi(createConfig(token));
export const createSmartAppsApi = (token?: string) => new SmartAppsApi(createConfig(token));
export const createServersApi = (token?: string) => new ServersApi(createConfig(token));

// Create all API clients at once
export const createApiClients = (token?: string) => ({
  auth: createAuthApi(token),
  healthcareUsers: createHealthcareUsersApi(token),
  identityProviders: createIdentityProvidersApi(token),
  launchContexts: createLaunchContextsApi(token),
  roles: createRolesApi(token),
  smartApps: createSmartAppsApi(token),
  servers: createServersApi(token),
});

// Helper to get token from localStorage
export const getStoredToken = (): string | null => {
  try {
    const stored = localStorage.getItem('openid_tokens');
    if (!stored) return null;
    
    const tokens = JSON.parse(stored);
    
    // Check if token is valid
    if (!tokens.access_token) return null;
    if (tokens.expires_at && Date.now() >= tokens.expires_at * 1000) {
      return null; // Token is expired
    }
    
    return tokens.access_token;
  } catch {
    return null;
  }
};

// Create authenticated API clients using stored token
export const createAuthenticatedApiClients = () => {
  const token = getStoredToken();
  return createApiClients(token || undefined);
};
