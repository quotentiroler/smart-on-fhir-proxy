import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  // State
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  // Actions
  fetchProfile: () => Promise<void>;
  clearProfile: () => void;
  setError: (error: string | null) => void;
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
      fetchProfile: async () => {
        // If not authenticated, clear profile and return
        if (!isAuthenticated()) {
          set({ profile: null, isAuthenticated: false, loading: false, error: null });
          return;
        }

        // If we already have a profile and are authenticated, don't refetch
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

      logout: () => {
        // Clear the store state
        set({ 
          profile: null, 
          isAuthenticated: false, 
          error: null, 
          loading: false 
        });
        
        // Clear persisted data
        localStorage.removeItem('auth-store');
        localStorage.removeItem('access_token');
        
        // Redirect to login
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
