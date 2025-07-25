import { 
  AdminApi,
  AuthenticationApi, 
  HealthcareUsersApi,
  IdentityProvidersApi,
  LaunchContextsApi,
  OauthMonitoringApi,
  RolesApi,
  SmartAppsApi,
  ServersApi,
  Configuration,
  ResponseError
} from './api-client';

// Auth error handler to automatically logout on authentication failures
let onAuthError: (() => void) | null = null;

export const setAuthErrorHandler = (handler: () => void) => {
  console.log('Auth error handler set');
  onAuthError = handler;
};

// Wrapper function to handle authentication errors
export const handleApiError = (error: unknown) => {
  console.log('handleApiError called with:', error);
  
  // Check for ResponseError first
  if (error instanceof ResponseError) {
    console.log('ResponseError detected, status:', error.response.status);
    if (error.response.status === 401 || error.response.status === 403) {
      console.warn('Authentication error detected (ResponseError), triggering logout');
      if (onAuthError) {
        onAuthError();
        return; // Don't throw again, auth error handler will handle logout
      }
    }
  }
  
  // Check for other error formats that might contain status
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    // Check various possible error formats
    const status = (err.status as number) || 
                  ((err.response as Record<string, unknown>)?.status as number) || 
                  ((err.responseData as Record<string, unknown>)?.status as number);
    if (status === 401 || status === 403) {
      console.warn('Authentication error detected (status check), triggering logout');
      if (onAuthError) {
        onAuthError();
        return; // Don't throw again
      }
    }
    
    // Check for HTTP 401 in error message
    if (typeof err.message === 'string' && err.message.includes('401')) {
      console.warn('Authentication error detected (message check), triggering logout');
      if (onAuthError) {
        onAuthError();
        return; // Don't throw again
      }
    }
    
    // Check for nested error data
    const responseData = err.responseData as Record<string, unknown>;
    if (responseData && typeof responseData.error === 'string' && responseData.error.includes('401')) {
      console.warn('Authentication error detected (responseData check), triggering logout');
      if (onAuthError) {
        onAuthError();
        return; // Don't throw again
      }
    }
  }
  
  console.log('No authentication error detected, rethrowing error');
  throw error;
};

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
export const createAdminApi = (token?: string) => new AdminApi(createConfig(token));
export const createAuthApi = (token?: string) => new AuthenticationApi(createConfig(token));
export const createHealthcareUsersApi = (token?: string) => new HealthcareUsersApi(createConfig(token));
export const createIdentityProvidersApi = (token?: string) => new IdentityProvidersApi(createConfig(token));
export const createLaunchContextsApi = (token?: string) => new LaunchContextsApi(createConfig(token));
export const createOauthMonitoringApi = (token?: string) => new OauthMonitoringApi(createConfig(token));
export const createRolesApi = (token?: string) => new RolesApi(createConfig(token));
export const createSmartAppsApi = (token?: string) => new SmartAppsApi(createConfig(token));
export const createServersApi = (token?: string) => new ServersApi(createConfig(token));

// Create all API clients at once
export const createApiClients = (token?: string) => ({
  admin: createAdminApi(token),
  auth: createAuthApi(token),
  healthcareUsers: createHealthcareUsersApi(token),
  identityProviders: createIdentityProvidersApi(token),
  launchContexts: createLaunchContextsApi(token),
  oauthMonitoring: createOauthMonitoringApi(token),
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
