import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  AuthenticationApi, 
  Configuration
} from '../lib/api-client';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}

const createApiClient = (token?: string) => {
  const config = new Configuration({
    basePath: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8445',
    accessToken: token,
  });
  return new AuthenticationApi(config);
};

const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

const getCurrentUserProfile = async (): Promise<UserProfile> => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No access token found');
  }

  const apiClient = createApiClient(token);
  
  try {
    const response = await apiClient.getAuthUserinfo({
      authorization: `Bearer ${token}`
    });

    // Transform the API response to our UserProfile format
    return {
      id: response.id,
      username: response.username || '',
      email: response.email || '',
      firstName: response.name?.[0]?.text?.split(' ')[0] || '',
      lastName: response.name?.[0]?.text?.split(' ').slice(1).join(' ') || '',
      roles: response.roles || []
    };
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    throw new Error('Failed to fetch user profile');
  }
};

interface AuthState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  login: (username: string, password: string) => Promise<void>;
  exchangeCodeForToken: (code: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearProfile: () => void;
  setError: (error: string | null) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      loading: false,
      error: null,
      isAuthenticated: false,

      // Actions
      login: async (username: string, password: string) => {
        set({ loading: true, error: null });

        try {
          const apiClient = createApiClient();
          
          const response = await apiClient.postAuthToken({
            postAuthTokenRequest: {
              grantType: 'password',
              username,
              password,
              clientId: 'admin-ui',
            }
          });

          if (response.accessToken) {
            localStorage.setItem('access_token', response.accessToken);
            set({ isAuthenticated: true });
            
            // Fetch the user profile after successful login
            await get().fetchProfile();
          } else {
            throw new Error('No access token received');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Login failed';
          set({ 
            profile: null, 
            isAuthenticated: false, 
            loading: false, 
            error: errorMessage 
          });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      exchangeCodeForToken: async (code: string) => {
        set({ loading: true, error: null });

        try {
          const apiClient = createApiClient();
          
          const response = await apiClient.postAuthToken({
            postAuthTokenRequest: {
              grantType: 'authorization_code',
              code,
              clientId: 'admin-ui',
              redirectUri: window.location.origin + '/',
            }
          });

          if (response.accessToken) {
            localStorage.setItem('access_token', response.accessToken);
            set({ isAuthenticated: true });
            
            // Fetch the user profile after successful token exchange
            await get().fetchProfile();
          } else {
            throw new Error('No access token received');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Token exchange failed';
          set({ 
            profile: null, 
            isAuthenticated: false, 
            loading: false, 
            error: errorMessage 
          });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      fetchProfile: async () => {
        if (!isAuthenticated()) {
          set({ profile: null, isAuthenticated: false, loading: false, error: null });
          return;
        }

        const { profile, isAuthenticated: storeAuth } = get();
        if (profile && storeAuth) {
          return;
        }

        set({ loading: true, error: null });

        try {
          const userProfile = await getCurrentUserProfile();
          set({ 
            profile: userProfile, 
            isAuthenticated: true, 
            loading: false, 
            error: null 
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user profile';
          set({ 
            profile: null, 
            isAuthenticated: false, 
            loading: false, 
            error: errorMessage 
          });
        }
      },

      clearProfile: () => {
        set({ 
          profile: null, 
          isAuthenticated: false, 
          error: null, 
          loading: false 
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setAccessToken: (token: string) => {
        localStorage.setItem('access_token', token);
        set({ isAuthenticated: true });
      },

      logout: () => {
        set({ 
          profile: null, 
          isAuthenticated: false, 
          error: null, 
          loading: false 
        });  
        localStorage.removeItem('auth-store');
        localStorage.removeItem('access_token');
        
        window.location.href = '/';
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist profile and isAuthenticated, not loading/error states
      partialize: (state) => ({ 
        profile: state.profile, 
        isAuthenticated: state.isAuthenticated 
      }),
      // On rehydration, check if token still exists
      onRehydrateStorage: () => (state) => {
        if (state && !isAuthenticated()) {
          // If no token exists, clear the persisted profile
          state.clearProfile();
        }
      },
    }
  )
);

// Custom hook that automatically fetches profile on mount
export const useAuth = () => {
  const store = useAuthStore();
  
  // Auto-fetch profile if authenticated but no profile exists
  React.useEffect(() => {
    if (isAuthenticated() && !store.profile && !store.loading) {
      store.fetchProfile();
    }
  }, [store]);

  return store;
};
