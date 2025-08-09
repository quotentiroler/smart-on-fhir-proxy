import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { openidService } from '../service/openid-service';
import { createClientApis, setAuthErrorHandler } from '../lib/apiClient';
import { getItem, storeItem, removeItem } from '../lib/storage';
import type { UserProfile } from '@/lib/types/api';

interface TokenData {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

const TOKEN_STORAGE_KEY = 'openid_tokens';

const getStoredTokens = async (): Promise<TokenData | null> => {
  try {
    return await getItem<TokenData>(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeTokens = async (tokens: TokenData): Promise<void> => {
  await storeItem(TOKEN_STORAGE_KEY, tokens);
};

const clearTokens = async (): Promise<void> => {
  await removeItem(TOKEN_STORAGE_KEY);
};

const isTokenValid = (tokens: TokenData): boolean => {
  if (!tokens.access_token) return false;
  if (!tokens.expires_at) return true; // If no expiry, assume valid
  return Date.now() < tokens.expires_at * 1000;
};

const transformUserProfile = (userInfo: Record<string, unknown>): UserProfile => {
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
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  clientApis: ReturnType<typeof createClientApis>;
  
  initiateLogin: (idpHint?: string) => Promise<void>;
  exchangeCodeForToken: (code: string, codeVerifier: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateClientApis: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      clientApis: createClientApis(), // Initialize with no token

      // Helper function to update client APIs with current token
      updateClientApis: async () => {
        const tokens = await getStoredTokens();
        const token = tokens?.access_token || undefined;
        set({ clientApis: createClientApis(token) });
        
        // Set up auth error handler each time we update clients
        setAuthErrorHandler(async () => {
          console.log('Auth error handler triggered, logging out...');
          await get().logout();
        });
      },      // Actions
      initiateLogin: async (idpHint?: string) => {
        set({ loading: true, error: null });
        
        try {
          const { url, codeVerifier, state } = await openidService.getAuthorizationUrl(idpHint);
          
          // Store PKCE parameters for callback
          sessionStorage.setItem('pkce_code_verifier', codeVerifier);
          sessionStorage.setItem('oauth_state', state);
          
          if (idpHint) {
            console.log(`Initiating login with Identity Provider: ${idpHint}`);
          }
          
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
          
          const tokenData: TokenData = {
            access_token: tokens.access_token,
            id_token: tokens.id_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined,
          };
          
          await storeTokens(tokenData);
          set({ isAuthenticated: true });
          
          // Update client APIs with new token
          await get().updateClientApis();
          
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
          await clearTokens();
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchProfile: async () => {
        const tokens = await getStoredTokens();
        if (!tokens || !isTokenValid(tokens)) {
          set({ profile: null, isAuthenticated: false });
          await clearTokens();
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
          await clearTokens();
        }
      },

      refreshTokens: async () => {
        const tokens = await getStoredTokens();
        if (!tokens?.refresh_token) {
          await get().logout();
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
          
          await storeTokens(tokenData);
          set({ isAuthenticated: true, loading: false });
          
          // Update client APIs with refreshed token
          await get().updateClientApis();
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
          set({ 
            profile: null, 
            isAuthenticated: false, 
            loading: false, 
            error: errorMessage 
          });
          await clearTokens();
        }
      },

      logout: async () => {
        const tokens = await getStoredTokens();
        
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
        
        // Update client APIs to have no token
        await get().updateClientApis();
        
        await clearTokens();
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
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist profile and isAuthenticated, not loading/error states or clientApis
      partialize: (state) => ({ 
        profile: state.profile, 
        isAuthenticated: state.isAuthenticated 
      }),
      // On rehydration, check if tokens still exist and are valid
      onRehydrateStorage: () => async (state) => {
        if (state) {
          try {
            const tokens = await getStoredTokens();
            
            if (!tokens) {
              state.profile = null;
              state.isAuthenticated = false;
              state.clientApis = createClientApis(); // No token
            } else if (!isTokenValid(tokens)) {
              console.log('❌ Invalid tokens found');
              
              if (tokens.refresh_token) {
                console.log('🔄 Attempting to refresh expired tokens');
                // Don't clear state yet, let refreshTokens handle it
                state.clientApis = createClientApis(tokens.access_token);
                // Trigger refresh in background
                setTimeout(async () => {
                  await useAuthStore.getState().refreshTokens();
                }, 100);
              } else {
                console.log('❌ No refresh token, clearing auth state');
                state.profile = null;
                state.isAuthenticated = false;
                state.clientApis = createClientApis(); // No token
                await clearTokens();
              }
            } else {
              console.log('✅ Valid tokens found, setting up auth state');
              // Update client APIs with current token
              state.clientApis = createClientApis(tokens.access_token);
              
              // Auto-fetch profile if authenticated but no profile exists
              if (state.isAuthenticated && !state.profile) {
                console.log('👤 Fetching user profile');
                setTimeout(async () => {
                  await useAuthStore.getState().fetchProfile();
                }, 100);
              }
            }
            
            // Set up auth error handler for all cases
            setAuthErrorHandler(async () => {
              console.log('Auth error handler triggered during rehydration, logging out...');
              await useAuthStore.getState().logout();
            });
          } catch (error) {
            console.error('Error during rehydration:', error);
            // On error, clear auth state to be safe
            state.profile = null;
            state.isAuthenticated = false;
            state.clientApis = createClientApis();
            await clearTokens();
          }
        } else {
          console.log('⚠️ No state found during rehydration');
        }
      },
    }
  )
);

// Custom hook that provides auth state without side effects
export const useAuth = () => {
  return useAuthStore();
};
