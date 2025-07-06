import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { 
  Heart, 
  Shield, 
  LogIn, 
  Loader2,
  Lock,
  Stethoscope,
  Globe
} from 'lucide-react';

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { initiateLogin, exchangeCodeForToken } = useAuthStore();

  const handleCodeExchange = useCallback(async (code: string, state: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get stored PKCE parameters
      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      const storedState = sessionStorage.getItem('oauth_state');

      if (!codeVerifier) {
        throw new Error('Missing PKCE code verifier');
      }

      // Verify state for CSRF protection
      if (state !== storedState) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      await exchangeCodeForToken(code, codeVerifier);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [exchangeCodeForToken]);

  // Handle OAuth callback on component mount
  useEffect(() => {
    console.log('LoginForm mounted, checking for OAuth callback...');
    console.log('Current URL:', window.location.href);
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    console.log('URL params:', { code, state, error, errorDescription });
    
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      setError(errorDescription || error);
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state) {
      console.log('Authorization code received, exchanging for tokens...');
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Exchange code for token
      handleCodeExchange(code, state);
    }
  }, [handleCodeExchange]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await initiateLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate login');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Authenticating</h3>
              <p className="text-gray-600">Please wait while we verify your credentials...</p>
              <div className="mt-6 flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Healthcare Admin</h2>
            <p className="text-blue-100">SMART on FHIR Platform</p>
          </div>
          
          {/* Content */}
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome Back</h3>
              <p className="text-gray-600">Sign in to access the admin dashboard</p>
            </div>
            
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                    <div className="text-red-700 text-sm">{error}</div>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleLogin}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-4 px-6 font-semibold transition-all duration-200 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></div>
                <div className="relative flex items-center justify-center space-x-3">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Sign in with OpenID Connect</span>
                    </>
                  )}
                </div>
              </button>
            </div>
            
            {/* Security info */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start space-x-3">
                <Lock className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Secure Authentication</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    You will be redirected to our secure identity provider for authentication. 
                    Your credentials are never stored on this application.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600">FHIR Compliant</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 bg-green-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs text-gray-600">Global Standards</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}
