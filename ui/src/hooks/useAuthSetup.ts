import { useEffect } from 'react';
import { setAuthErrorHandler } from '@/lib/apiClient';
import { useAuth } from '@/stores/authStore';

/**
 * Hook to set up global authentication error handling
 * Should be called once at the app level
 */
export const useAuthSetup = () => {
  const { logout } = useAuth();

  useEffect(() => {
    // Set up global auth error handler
    console.log('Setting up auth error handler');
    setAuthErrorHandler(() => {
      console.log('Authentication failed, logging out user');
      logout();
    });
  }, [logout]);
};
