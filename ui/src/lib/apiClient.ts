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
  ServerApi,
  Configuration,
  ResponseError
} from './api-client';

// Auth error handler to automatically logout on authentication failures
let onAuthError: (() => void) | null = null;

export const setAuthErrorHandler = (handler: () => void) => {
  onAuthError = handler;
};

// Wrapper function to handle authentication errors
export const handleApiError = (error: unknown) => {
  console.info('handleApiError called with:', error);

  // Check for ResponseError first
  if (error instanceof ResponseError) {
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

// Create individual client APIs
export const createAdminApi = (token?: string) => new AdminApi(createConfig(token));
export const createAuthApi = (token?: string) => new AuthenticationApi(createConfig(token));
export const createHealthcareUsersApi = (token?: string) => new HealthcareUsersApi(createConfig(token));
export const createIdentityProvidersApi = (token?: string) => new IdentityProvidersApi(createConfig(token));
export const createLaunchContextsApi = (token?: string) => new LaunchContextsApi(createConfig(token));
export const createOauthMonitoringApi = (token?: string) => new OauthMonitoringApi(createConfig(token));
export const createRolesApi = (token?: string) => new RolesApi(createConfig(token));
export const createSmartAppsApi = (token?: string) => new SmartAppsApi(createConfig(token));
export const createServersApi = (token?: string) => new ServersApi(createConfig(token));
export const createServerApi = (token?: string) => new ServerApi(createConfig(token));

// Create a wrapper that automatically handles auth errors for any API method
const wrapApiClient = <T extends object>(client: T): T => {
  // Create a Proxy that intercepts method calls
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // If it's a function, wrap it with error handling
      if (typeof value === 'function') {
        return async (...args: unknown[]) => {
          try {
            const result = await value.apply(target, args);
            return result;
          } catch (error) {
            handleApiError(error);
            // If handleApiError doesn't throw (auth error handled), rethrow original error
            throw error;
          }
        };
      }

      // For non-functions, return as-is
      return value;
    }
  });
};

// Create all client APIs at once with automatic auth error handling
export const createClientApis = (token?: string) => ({
  admin: wrapApiClient(createAdminApi(token)),
  auth: wrapApiClient(createAuthApi(token)),
  healthcareUsers: wrapApiClient(createHealthcareUsersApi(token)),
  identityProviders: wrapApiClient(createIdentityProvidersApi(token)),
  launchContexts: wrapApiClient(createLaunchContextsApi(token)),
  oauthMonitoring: wrapApiClient(createOauthMonitoringApi(token)),
  roles: wrapApiClient(createRolesApi(token)),
  smartApps: wrapApiClient(createSmartAppsApi(token)),
  servers: wrapApiClient(createServersApi(token)),
  server: wrapApiClient(createServerApi(token)),
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

// Create authenticated client APIs using stored token
export const createAuthenticatedClientApis = () => {
  const token = getStoredToken();
  return createClientApis(token || undefined);
};
