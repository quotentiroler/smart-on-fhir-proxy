import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { openidService } from '../service/openid-service';
import { getSessionItem, removeSessionItem } from '@/lib/storage';
import type { GetAuthIdentityProviders200ResponseInner } from '../lib/api-client/models';
import { KeycloakConfigForm } from './KeycloakConfigForm';
import { AuthDebugPanel } from './AuthDebugPanel';
import { 
  Heart, 
  Shield, 
  LogIn, 
  Loader2,
  Lock,
  Stethoscope,
  Globe,
  Building2,
  Users,
  ArrowRight,
  AlertTriangle,
  Settings,
  Bug,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableIdps, setAvailableIdps] = useState<GetAuthIdentityProviders200ResponseInner[]>([]);
  const [loadingIdps, setLoadingIdps] = useState(true);
  const [authAvailable, setAuthAvailable] = useState<boolean | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const isProcessingCodeExchange = useRef(false);
  const processedUrl = useRef<string | null>(null);
  const { initiateLogin, exchangeCodeForToken, clientApis } = useAuthStore();

  // Fetch available identity providers
  const fetchAvailableIdps = useCallback(async () => {
    try {
      setLoadingIdps(true);
      const idps = await clientApis.auth.getAuthIdentityProviders();
      
      // Filter to only show enabled identity providers
      const enabledIdps = idps.filter((idp: GetAuthIdentityProviders200ResponseInner) => idp.enabled !== false);
      setAvailableIdps(enabledIdps);
      
      if (enabledIdps.length > 0) {
        console.log(`Found ${enabledIdps.length} available identity providers:`, enabledIdps.map((idp: GetAuthIdentityProviders200ResponseInner) => idp.displayName || idp.alias));
      }
    } catch (error) {
      console.warn('Could not fetch identity providers (this is normal for public access):', error);
      // Don't show this as an error to users - it's expected when not authenticated
      setAvailableIdps([]);
    } finally {
      setLoadingIdps(false);
    }
  }, [clientApis.auth]);

  // Check if authentication is configured
  const checkAuthAvailability = useCallback(async () => {
    try {
      const available = await openidService.isAuthenticationAvailable();
      setAuthAvailable(available);
      if (!available) {
        setError('Keycloak is not configured. Please contact your administrator.');
        setLoadingIdps(false); // Stop loading IdPs if auth is not available
      } else {
        setError(null); // Clear any previous errors
        // Only fetch IdPs if authentication is available
        fetchAvailableIdps();
      }
    } catch (error) {
      console.error('Failed to check auth availability:', error);
      setAuthAvailable(false);
      setError('Unable to verify authentication configuration. Please try again later.');
      setLoadingIdps(false); // Stop loading IdPs on error
    }
  }, [fetchAvailableIdps]);

  // Handler for successful Keycloak configuration
  const handleConfigSuccess = useCallback(() => {
    setShowConfigForm(false);
    setAuthAvailable(null); // Reset to trigger re-check
    setError(null);
    // Re-check availability and reload IdPs
    checkAuthAvailability();
    fetchAvailableIdps();
  }, [checkAuthAvailability, fetchAvailableIdps]);

  // Handler for canceling Keycloak configuration
  const handleConfigCancel = useCallback(() => {
    setShowConfigForm(false);
  }, []);

  // Load IdPs and check auth availability on component mount
  useEffect(() => {
    checkAuthAvailability();
  }, [checkAuthAvailability]);

  const handleCodeExchange = useCallback(async (code: string, state: string) => {
    // Prevent multiple simultaneous token exchange attempts
    if (isProcessingCodeExchange.current) {
      console.log('🔒 Code exchange already in progress, skipping...');
      return;
    }

    isProcessingCodeExchange.current = true;
    setLoading(true);
    setError(null);

    try {
      // Get stored PKCE parameters
      const codeVerifier = getSessionItem('pkce_code_verifier');
      const storedState = getSessionItem('oauth_state');

      if (!codeVerifier) {
        // Clean up stale session data
        removeSessionItem('oauth_state');
        throw new Error('Missing PKCE code verifier - please try logging in again');
      }

      // Verify state for CSRF protection
      if (state !== storedState) {
        // Clean up stale session data
        removeSessionItem('pkce_code_verifier');
        removeSessionItem('oauth_state');
        throw new Error('Invalid state parameter - please try logging in again');
      }

      await exchangeCodeForToken(code, codeVerifier);
    } catch (err) {
      // Ensure session data is cleaned up on any error
      removeSessionItem('pkce_code_verifier');
      removeSessionItem('oauth_state');
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
      isProcessingCodeExchange.current = false;
    }
  }, [exchangeCodeForToken]);

  // Handle OAuth callback on component mount
  useEffect(() => {
    const currentUrl = window.location.href;
    
    // Prevent processing the same URL multiple times
    if (processedUrl.current === currentUrl) {
      console.log('🔒 URL already processed, skipping:', currentUrl);
      return;
    }

    console.log('LoginForm mounted, checking for OAuth callback...');
    console.log('Current URL:', currentUrl);
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    console.log('URL params:', { code: code ? `${code.substring(0, 10)}...` : null, state, error, errorDescription });
    
    // Clear URL parameters immediately after extraction to prevent reuse
    if (code || error) {
      console.log('🧹 Clearing URL parameters to prevent code reuse...');
      window.history.replaceState({}, document.title, window.location.pathname);
      processedUrl.current = currentUrl;
    }
    
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      setError(`Authentication failed: ${errorDescription || error}. Please try again or use the troubleshooting panel below.`);
      return;
    }

    if (code && state) {
      console.log('Authorization code received, exchanging for tokens...');
      
      // Exchange code for token
      handleCodeExchange(code, state);
    }
  }, [handleCodeExchange]);

  const handleLogin = async (idpAlias?: string) => {
    // Check if authentication is available before proceeding
    if (authAvailable === false) {
      setError('Authentication is not configured. Please contact your administrator.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const loginMessage = idpAlias 
        ? `Initiating login with Identity Provider: ${idpAlias}`
        : 'Initiating login with default provider';
      console.log(loginMessage);
      
      // Pass the IdP alias as a hint to the authentication service
      await initiateLogin(idpAlias);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate login');
      setLoading(false);
    }
  };

  // If the configuration form is shown, render it instead
  if (showConfigForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <KeycloakConfigForm 
          onSuccess={handleConfigSuccess}
          onCancel={handleConfigCancel}
        />
      </div>
    );
  }

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
            <p className="text-blue-100">Proxy Smart</p>
          </div>
          
          {/* Content */}
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome Back</h3>
              <p className="text-gray-600">Sign in to access the Proxy Smart dashboard</p>
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

              {/* Loading state for IdPs */}
              {(loadingIdps || authAvailable === null) && (
                <div className="text-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Loading authentication options...</p>
                </div>
              )}

              {/* Authentication not configured */}
              {authAvailable === false && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Not Configured</h3>
                  <p className="text-gray-600 mb-6">
                    Keycloak is not yet configured on this server.
                  </p>
                  
                  <button
                    onClick={() => setShowConfigForm(true)}
                    className="w-full mb-4 group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-3 px-6 font-semibold transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
                  >
                    <div className="relative flex items-center justify-center space-x-2">
                      <Settings className="w-5 h-5" />
                      <span>Configure Keycloak</span>
                    </div>
                  </button>
                  
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                    <p className="text-sm text-yellow-800">
                      <strong>For administrators:</strong> You can configure Keycloak authentication 
                      using the button above or by setting the required environment variables and restarting the service.
                    </p>
                  </div>
                </div>
              )}

              {/* Authentication available - show login options */}
              {authAvailable === true && (
                <>
                  {/* Available Identity Providers */}
                  {availableIdps.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700 mb-4">Choose your authentication method</p>
                      </div>
                      
                      {availableIdps.map((idp) => (
                        <button
                          key={idp.alias}
                          onClick={() => handleLogin(idp.alias)}
                          className="w-full group relative overflow-hidden bg-white border-2 border-gray-200 text-gray-700 rounded-xl py-4 px-6 font-medium transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          disabled={loading}
                        >
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                {idp.providerId === 'saml' && <Building2 className="w-4 h-4 text-white" />}
                                {idp.providerId === 'oidc' && <Globe className="w-4 h-4 text-white" />}
                                {idp.providerId === 'google' && <Users className="w-4 h-4 text-white" />}
                                {!['saml', 'oidc', 'google'].includes(idp.providerId) && <Shield className="w-4 h-4 text-white" />}
                              </div>
                              <div className="text-left">
                                <div className="text-sm font-medium">
                                  {idp.displayName || idp.alias}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                  {idp.providerId} Authentication
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </button>
                      ))}
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-3 bg-white text-gray-500">or</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Default OpenID Connect Login */}
                  <button 
                    onClick={() => handleLogin()}
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
                          <span>
                            {availableIdps.length > 0 ? 'Default Authentication' : 'Sign in with OpenID Connect'}
                          </span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Info message when no IdPs are available */}
                  {availableIdps.length === 0 && !loadingIdps && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-700">
                          <p className="font-medium mb-1">Single Sign-On Available</p>
                          <p>Use the default authentication method above. Additional identity providers can be configured by administrators.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
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

        {/* Debug Panel Toggle */}
        <div className="mt-6">
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center justify-center gap-2 py-2"
          >
            <Bug className="w-3 h-3" />
            <span>Troubleshooting</span>
            {showDebugPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {/* Debug Panel */}
          {showDebugPanel && (
            <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
              <AuthDebugPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
