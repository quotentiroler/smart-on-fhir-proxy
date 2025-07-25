import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { openidService } from '../service/openid-service';
import { createApiClients } from '../lib/apiClient';
import { ResponseError } from '../lib/api-client';
import type { GetAuthUserinfo200Response } from '../lib/api-client';

interface TokenData {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

const TOKEN_STORAGE_KEY = 'openid_tokens';

const getStoredTokens = (): TokenData | null => {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const storeTokens = (tokens: TokenData) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

const isTokenValid = (tokens: TokenData): boolean => {
  if (!tokens.access_token) return false;
  if (!tokens.expires_at) return true; // If no expiry, assume valid
  return Date.now() < tokens.expires_at * 1000;
};

const transformUserProfile = (userInfo: Record<string, unknown>): GetAuthUserinfo200Response => {
  return {
    id: String(userInfo.sub || ''),
    name: [{ text: String(userInfo.name || userInfo.preferred_username || userInfo.email || 'User') }],
    username: String(userInfo.preferred_username || userInfo.email || ''),
    email: String(userInfo.email || ''),
    firstName: String(userInfo.given_name || ''),
    lastName: String(userInfo.family_name || ''),
    roles: Array.isArray(userInfo.roles) ? userInfo.roles.map(String) : [],
  };
};

interface AuthState {
  profile: GetAuthUserinfo200Response | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  apiClients: ReturnType<typeof createApiClients>;
  
  initiateLogin: () => Promise<void>;
  exchangeCodeForToken: (code: string, codeVerifier: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateApiClients: () => void;
  // Wrapper for API calls that automatically handles auth errors
  withAuthErrorHandling: <T>(apiCall: () => Promise<T>) => Promise<T>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      apiClients: createApiClients(), // Initialize with no token

      // Helper function to update API clients with current token
      updateApiClients: () => {
        const tokens = getStoredTokens();
        const token = tokens?.access_token || undefined;
        set({ apiClients: createApiClients(token) });
      },

      // Actions
      initiateLogin: async () => {
        set({ loading: true, error: null });
        
        try {
          const { url, codeVerifier, state } = await openidService.getAuthorizationUrl();
          
          // Store PKCE parameters for callback
          sessionStorage.setItem('pkce_code_verifier', codeVerifier);
          sessionStorage.setItem('oauth_state', state);
          
          // Redirect to authorization server
          window.location.href = url;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initiate login';
          set({ loading: false, error: errorMessage });
        }
      },

      exchangeCodeForToken: async (code: string, codeVerifier: string) => {
        console.log('Starting token exchange with code:', code.substring(0, 10) + '...');
        set({ loading: true, error: null });

        try {
          const tokens = await openidService.exchangeCodeForTokens(code, codeVerifier);
          console.log('Token exchange successful:', {
            hasAccessToken: !!tokens.access_token,
            hasIdToken: !!tokens.id_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiresIn: tokens.expires_in
          });
          
          const tokenData: TokenData = {
            access_token: tokens.access_token,
            id_token: tokens.id_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined,
          };
          
          storeTokens(tokenData);
          set({ isAuthenticated: true });
          
          // Update API clients with new token
          get().updateApiClients();
          
          // Fetch user profile
          await get().fetchProfile();
          
          // Clear session storage
          sessionStorage.removeItem('pkce_code_verifier');
          sessionStorage.removeItem('oauth_state');
          
        } catch (error) {
          console.error('Token exchange failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Token exchange failed';
          set({ 
            profile: null, 
            isAuthenticated: false, 
            loading: false, 
            error: errorMessage 
          });
          clearTokens();
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchProfile: async () => {
        const tokens = getStoredTokens();
        if (!tokens || !isTokenValid(tokens)) {
          set({ profile: null, isAuthenticated: false });
          clearTokens();
          return;
        }

        set({ loading: true, error: null });

        try {
          const userInfo = await openidService.fetchUserInfo(tokens.access_token);
          const profile = transformUserProfile(userInfo);
          
          set({ 
            profile, 
            isAuthenticated: true, 
            loading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user profile';
          set({ 
            profile: null, 
            isAuthenticated: false, 
            loading: false, 
            error: errorMessage 
          });
          clearTokens();
        }
      },

      refreshTokens: async () => {
        const tokens = getStoredTokens();
        if (!tokens?.refresh_token) {
          get().logout();
          return;
        }

        set({ loading: true, error: null });

        try {
          const newTokens = await openidService.refreshToken(tokens.refresh_token);
          
          const tokenData: TokenData = {
            access_token: newTokens.access_token,
            id_token: newTokens.id_token || tokens.id_token,
            refresh_token: newTokens.refresh_token || tokens.refresh_token,
            expires_at: newTokens.expires_in ? Math.floor(Date.now() / 1000) + newTokens.expires_in : undefined,
          };
          
          storeTokens(tokenData);
          set({ isAuthenticated: true, loading: false });
          
          // Update API clients with refreshed token
          get().updateApiClients();
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
          set({ 
            profile: null, 
            isAuthenticated: false, 
            loading: false, 
            error: errorMessage 
          });
          clearTokens();
        }
      },

      logout: () => {
        const tokens = getStoredTokens();
        
        console.log('Initiating logout with tokens:', {
          hasAccessToken: !!tokens?.access_token,
          hasIdToken: !!tokens?.id_token,
          hasRefreshToken: !!tokens?.refresh_token
        });
        
        set({ 
          profile: null, 
          isAuthenticated: false, 
          error: null, 
          loading: false 
        });
        
        // Update API clients to have no token
        get().updateApiClients();
        
        clearTokens();
        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('oauth_state');
        
        // Redirect to logout URL
        const logoutUrl = openidService.getLogoutUrl(tokens?.id_token);
        console.log('Logout URL:', logoutUrl);
        window.location.href = logoutUrl;
      },

      clearError: () => {
        set({ error: null });
      },

      // Wrapper for API calls that automatically handles auth errors
      withAuthErrorHandling: async <T>(apiCall: () => Promise<T>): Promise<T> => {
        try {
          return await apiCall();
        } catch (error) {
          // Check for ResponseError first
          if (error instanceof ResponseError) {
            if (error.response.status === 401 || error.response.status === 403) {
              console.warn('Authentication error detected, triggering logout');
              get().logout();
              throw new Error('Authentication expired. Please log in again.');
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
              get().logout();
              throw new Error('Authentication expired. Please log in again.');
            }
            
            // Check for HTTP 401 in error message
            if (typeof err.message === 'string' && err.message.includes('401')) {
              console.warn('Authentication error detected (message check), triggering logout');
              get().logout();
              throw new Error('Authentication expired. Please log in again.');
            }
            
            // Check for nested error data
            const responseData = err.responseData as Record<string, unknown>;
            if (responseData && typeof responseData.error === 'string' && responseData.error.includes('401')) {
              console.warn('Authentication error detected (responseData check), triggering logout');
              get().logout();
              throw new Error('Authentication expired. Please log in again.');
            }
          }
          
          // If not an auth error, re-throw the original error
          throw error;
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist profile and isAuthenticated, not loading/error states or apiClients
      partialize: (state) => ({ 
        profile: state.profile, 
        isAuthenticated: state.isAuthenticated 
      }),
      // On rehydration, check if tokens still exist and are valid
      onRehydrateStorage: () => (state) => {
        if (state) {
          const tokens = getStoredTokens();
          if (!tokens || !isTokenValid(tokens)) {
            state.profile = null;
            state.isAuthenticated = false;
            state.apiClients = createApiClients(); // No token
            clearTokens();
          } else {
            // Update API clients with current token
            state.apiClients = createApiClients(tokens.access_token);
          }
        }
      },
    }
  )
);

// Custom hook that automatically handles token refresh and profile fetching
export const useAuth = () => {
  const store = useAuthStore();
  const { isAuthenticated, profile, loading } = store;
  
  React.useEffect(() => {
    const tokens = getStoredTokens();
    
    if (tokens && isTokenValid(tokens)) {
      // Auto-fetch profile if authenticated but no profile exists
      if (isAuthenticated && !profile && !loading) {
        store.fetchProfile();
      }
    } else if (tokens && !isTokenValid(tokens) && tokens.refresh_token) {
      // Try to refresh tokens if they're expired but we have a refresh token
      store.refreshTokens();
    } else if (tokens && !isTokenValid(tokens)) {
      // Clear invalid tokens
      store.logout();
    }
  }, [isAuthenticated, profile, loading, store]);

  return store;
};
