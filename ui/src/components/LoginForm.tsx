import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Panel } from '@medplum/react';

// Generate a random state for CSRF protection
const generateState = () => Math.random().toString(36).substring(2, 15);

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exchangeCodeForToken = useAuthStore((state) => state.exchangeCodeForToken);

  const handleCodeExchange = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);

    try {
      await exchangeCodeForToken(code);
      // Clear stored state
      localStorage.removeItem('oauth_state');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [exchangeCodeForToken]);

  // Handle OAuth callback on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('oauth_state');
    
    if (code) {
      // Verify state for CSRF protection
      if (state !== storedState) {
        setError('Invalid state parameter - possible CSRF attack');
        return;
      }
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Exchange code for token
      handleCodeExchange(code);
    }
  }, [handleCodeExchange]);

  const handleKeycloakLogin = () => {
    const state = generateState();
    localStorage.setItem('oauth_state', state);
    
    const authUrl = new URL('/auth/authorize', window.location.origin);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', 'admin-ui');
    authUrl.searchParams.set('redirect_uri', window.location.origin + '/');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    
    window.location.href = authUrl.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md">
          <Panel>
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Authenticating...</p>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Panel>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Healthcare Admin</h2>
            <p className="text-gray-600 mt-2">Sign in to access the admin dashboard</p>
          </div>
          
          <div className="space-y-4">
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
            
            <button 
              onClick={handleKeycloakLogin}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              disabled={loading}
            >
              Login with Keycloak
            </button>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>You will be redirected to Keycloak to sign in securely</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
