import { 
  AuthenticationApi, 
  HealthcareUsersApi,
  IdentityProvidersApi,
  LaunchContextsApi,
  RolesApi,
  SmartAppsApi,
  Configuration 
} from './api-client';

// Create API client configuration
const createConfig = (token?: string) => {
  return new Configuration({
    basePath: window.location.origin,
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

// Create all API clients at once
export const createApiClients = (token?: string) => ({
  auth: createAuthApi(token),
  healthcareUsers: createHealthcareUsersApi(token),
  identityProviders: createIdentityProvidersApi(token),
  launchContexts: createLaunchContextsApi(token),
  roles: createRolesApi(token),
  smartApps: createSmartAppsApi(token),
});

// Helper to get token from localStorage
export const getStoredToken = (): string | null => {
  return localStorage.getItem('access_token');
};

// Create authenticated API clients using stored token
export const createAuthenticatedApiClients = () => {
  const token = getStoredToken();
  return createApiClients(token || undefined);
};
