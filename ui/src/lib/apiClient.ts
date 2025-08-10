import { config } from '@/config';
import { getItem } from './storage';
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

// Global flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;

// Wrapper function to handle authentication errors with refresh attempt
export const handleApiError = async (error: unknown) => {
  console.info('handleApiError called with:', error);

  let shouldTryRefresh = false;

  // Check for ResponseError first
  if (error instanceof ResponseError) {
    if (error.response.status === 401 || error.response.status === 403) {
      console.warn('Authentication error detected (ResponseError)');
      shouldTryRefresh = true;
    }
  }

  // Check for other error formats that might contain status
  if (!shouldTryRefresh && error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    // Check various possible error formats
    const status = (err.status as number) ||
      ((err.response as Record<string, unknown>)?.status as number) ||
      ((err.responseData as Record<string, unknown>)?.status as number);
    if (status === 401 || status === 403) {
      console.warn('Authentication error detected (status check)');
      shouldTryRefresh = true;
    }

    // Check for HTTP 401 in error message
    if (!shouldTryRefresh && typeof err.message === 'string' && err.message.includes('401')) {
      console.warn('Authentication error detected (message check)');
      shouldTryRefresh = true;
    }

    // Check for nested error data
    if (!shouldTryRefresh) {
      const responseData = err.responseData as Record<string, unknown>;
      if (responseData && typeof responseData.error === 'string' && responseData.error.includes('401')) {
        console.warn('Authentication error detected (responseData check)');
        shouldTryRefresh = true;
      }
    }
  }

  // Attempt refresh if we detected an auth error and not already refreshing
  if (shouldTryRefresh && !isRefreshing) {
    console.debug('🔄 Attempting token refresh before logout...');
    isRefreshing = true;
    
    try {
      const tokens = await getItem<{refresh_token?: string}>('openid_tokens');
      
      if (tokens?.refresh_token) {
        // Use dynamic import to avoid circular dependency
        const { useAuthStore } = await import('../stores/authStore');
        const authStore = useAuthStore.getState();
        
        await authStore.refreshTokens();
        
        // Check if we now have a valid token
        const newToken = await getStoredToken();
        if (newToken) {
          console.debug('✅ Token refreshed successfully, retry might succeed');
          isRefreshing = false;
          // Don't call onAuthError, let the caller retry the request
          throw new Error('TOKEN_REFRESHED'); // Special error to indicate retry needed
        }
      }
      
      console.warn('❌ Token refresh failed or no refresh token, triggering logout');
    } catch (refreshError) {
      if (refreshError instanceof Error && refreshError.message === 'TOKEN_REFRESHED') {
        throw refreshError; // Re-throw the special case
      }
      console.error('❌ Error during refresh attempt:', refreshError);
    } finally {
      isRefreshing = false;
    }
    
    // If we get here, refresh failed - trigger logout immediately
    console.warn('🚪 Authentication failed after refresh attempt, logging out');
    if (onAuthError) {
      onAuthError();
      return; // Don't throw again, auth error handler will handle logout
    }
  } else if (shouldTryRefresh && isRefreshing) {
    console.debug('🔄 Refresh already in progress, waiting and then triggering logout');
    // Wait a bit for the ongoing refresh to complete, then logout if still failing
    setTimeout(() => {
      if (onAuthError && isRefreshing) {
        console.warn('🚪 Refresh timeout, forcing logout');
        isRefreshing = false;
        onAuthError();
      }
    }, 3000); // 3 second timeout
    return;
  }

  throw error;
};

// Create API client configuration
const createConfig = (token?: string) => {
  const basePath = config.api.baseUrl;
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
            try {
              await handleApiError(error);
              // If handleApiError doesn't throw, rethrow original error
              throw error;
            } catch (handlerError) {
              // Check if this is our special token refresh indicator
              if (handlerError instanceof Error && handlerError.message === 'TOKEN_REFRESHED') {
                // Token was refreshed, we could retry the request here
                // For now, just throw the original error and let the caller handle retry
                throw error;
              }
              // Otherwise, throw the handler error (logout was triggered)
              throw handlerError;
            }
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

// Helper to get token from encrypted storage (always returns stored token)
export const getStoredToken = async (): Promise<string | null> => {
  try {
    const tokens = await getItem<{access_token: string}>('openid_tokens');
    return tokens?.access_token || null;
    // Note: We return the token even if expired - let the server decide validity
    // The API error handler will catch 401s and trigger refresh if needed
  } catch (error) {
    console.error('❌ Error retrieving stored token:', error);
    return null;
  }
};

// Create authenticated client APIs using stored token
export const createAuthenticatedClientApis = async () => {
  const token = await getStoredToken();
  return createClientApis(token || undefined);
  // Note: Even if token is expired, we pass it along
  // The API wrapper will catch 401s and handle refresh automatically
};
