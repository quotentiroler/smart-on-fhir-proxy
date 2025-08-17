import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useAuthStore } from '../stores/authStore';
import { getItem, removeItem, getSessionItem, removeSessionItem, clearAuthorizationCodeData } from '../lib/storage';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface TokenData {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export const AuthDebugPanel: React.FC = () => {
  const { logout, isAuthenticated, error } = useAuthStore();
  const [storageInfo, setStorageInfo] = useState({
    hasTokens: false,
    hasAuthState: false,
    hasPKCE: false,
    hasOAuthState: false,
  });

  const updateStorageInfo = async () => {
    try {
      // Check encrypted storage (new system)
      const encryptedTokenStorage = await getItem<TokenData>('openid_tokens');
      const encryptedAuthStorage = await getItem('auth-store');
      
      // Check localStorage (current system)
      const localTokenStorage = localStorage.getItem('openid_tokens');
      const localAuthStorage = localStorage.getItem('auth-store');
      
      // Check session storage (still used for OAuth flow)
      const pkceVerifier = getSessionItem('pkce_code_verifier');
      const oauthState = getSessionItem('oauth_state');

      setStorageInfo({
        hasTokens: !!(encryptedTokenStorage || localTokenStorage),
        hasAuthState: !!(encryptedAuthStorage || localAuthStorage),
        hasPKCE: !!pkceVerifier,
        hasOAuthState: !!oauthState,
      });
    } catch (error) {
      console.error('Failed to check storage:', error);
      // Fallback to localStorage only
      const localTokenStorage = localStorage.getItem('openid_tokens');
      const localAuthStorage = localStorage.getItem('auth-store');
      const pkceVerifier = getSessionItem('pkce_code_verifier');
      const oauthState = getSessionItem('oauth_state');

      setStorageInfo({
        hasTokens: !!localTokenStorage,
        hasAuthState: !!localAuthStorage,
        hasPKCE: !!pkceVerifier,
        hasOAuthState: !!oauthState,
      });
    }
  };

  useEffect(() => {
    updateStorageInfo();
  }, []);

  const handleClearSessionOnly = async () => {
    try {
      // Clear only session storage data (PKCE and OAuth state)
      removeSessionItem('pkce_code_verifier');
      removeSessionItem('oauth_state');
      
      // Clear any authorization code data
      clearAuthorizationCodeData();
      
      // Update storage info
      await updateStorageInfo();
      
      console.log('✅ Session data and authorization codes cleared successfully');
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  };

  const handleClearCaches = async () => {
    try {
      // Clear encrypted storage (new system)
      await removeItem('openid_tokens');
      await removeItem('auth-store');
      
      // Clear localStorage (legacy/current system)
      localStorage.removeItem('openid_tokens');
      localStorage.removeItem('auth-store');
      
      // Clear session storage
      removeSessionItem('pkce_code_verifier');
      removeSessionItem('oauth_state');
      
      // Clear browser caches
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
      
      // Update storage info
      await updateStorageInfo();
      
      // Force page reload to ensure all caches are cleared
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to clear caches:', error);
      // Fallback to logout and reload
      await logout();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleForceLogout = async () => {
    await logout();
    // Clear all browser caches and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        Promise.all(names.map(name => caches.delete(name)));
      });
    }
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          Authentication Debug
        </CardTitle>
        <CardDescription className="text-xs">
          Use these tools if you're experiencing login timeout or "Code not valid" errors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Status</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isAuthenticated ? 'default' : 'secondary'}>
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </Badge>
            {error && (
              <Badge variant="destructive">Error</Badge>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>

        {/* Storage Information */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Cache Status</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Tokens:</span>
              <Badge variant={storageInfo.hasTokens ? 'default' : 'outline'} className="text-xs">
                {storageInfo.hasTokens ? 'Present' : 'None'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Auth State:</span>
              <Badge variant={storageInfo.hasAuthState ? 'default' : 'outline'} className="text-xs">
                {storageInfo.hasAuthState ? 'Present' : 'None'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>PKCE:</span>
              <Badge variant={storageInfo.hasPKCE ? 'default' : 'outline'} className="text-xs">
                {storageInfo.hasPKCE ? 'Present' : 'None'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>OAuth State:</span>
              <Badge variant={storageInfo.hasOAuthState ? 'default' : 'outline'} className="text-xs">
                {storageInfo.hasOAuthState ? 'Present' : 'None'}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={updateStorageInfo}
            className="w-full text-xs mt-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Status
          </Button>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Troubleshooting Actions</h4>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSessionOnly}
              className="w-full flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Session Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCaches}
              className="w-full flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Caches
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceLogout}
              className="w-full flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Force Logout & Reset
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Use "Clear Session Data" for PKCE/OAuth state issues. Use "Clear All Caches" for "Code not valid" errors. Use "Force Logout" for persistent login issues.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
