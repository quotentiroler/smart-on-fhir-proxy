import { AuthenticationApi, Configuration } from '../lib/api-client';
import type { PostAuthTokenRequest } from '../lib/api-client';

interface OpenIDConfig {
  baseUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope: string;
}

class OpenIDService {
  private readonly config: OpenIDConfig;
  private readonly authApi: AuthenticationApi;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8445',
      clientId: 'admin-ui',
      clientSecret: 'admin-ui-secret',
      redirectUri: window.location.origin + '/',
      scope: 'openid profile email',
    };

    console.debug('OpenID Service Config:', this.config);

    // Create API client
    const apiConfig = new Configuration({
      basePath: this.config.baseUrl,
    });
    this.authApi = new AuthenticationApi(apiConfig);
  }

  async getAuthorizationUrl(idpHint?: string): Promise<{ url: string; codeVerifier: string; state: string }> {
    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    // Use the generated API client to get the authorization URL
    const authUrl = new URL('/auth/authorize', this.config.baseUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.config.clientId);
    authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
    authUrl.searchParams.set('scope', this.config.scope);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    // Add IdP hint if provided (Keycloak-specific parameter)
    if (idpHint) {
      authUrl.searchParams.set('kc_idp_hint', idpHint);
      console.debug('Using Identity Provider hint:', idpHint);
    }

    console.debug('Generated Authorization URL:', authUrl.href);
    console.debug('Redirect URI:', this.config.redirectUri);

    return {
      url: authUrl.href,
      codeVerifier,
      state,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<{
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    console.debug('OpenID Service: Starting token exchange...');
    
    const tokenRequest: PostAuthTokenRequest = {
      grantType: 'authorization_code',
      code,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri,
      codeVerifier,
    };

    console.debug('Token request:', {
      grantType: tokenRequest.grantType,
      clientId: tokenRequest.clientId,
      redirectUri: tokenRequest.redirectUri,
      hasCode: !!tokenRequest.code,
      hasCodeVerifier: !!tokenRequest.codeVerifier,
      hasClientSecret: !!tokenRequest.clientSecret
    });

    try {
      const response = await this.authApi.postAuthToken({
        postAuthTokenRequest: tokenRequest,
      });

      console.debug('Token response received:', {
        hasAccessToken: !!response.accessToken,
        hasIdToken: !!response.idToken,
        hasRefreshToken: !!response.refreshToken,
        expiresIn: response.expiresIn
      });

      return {
        access_token: response.accessToken || '',
        id_token: response.idToken || undefined,
        refresh_token: response.refreshToken,
        expires_in: response.expiresIn,
      };
    } catch (error) {
      console.error('Token exchange API call failed:', error);
      throw error;
    }
  }

  async fetchUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const response = await this.authApi.getAuthUserinfo({
      authorization: `Bearer ${accessToken}`,
    });

    // Convert the typed response to a generic object
    return response as unknown as Record<string, unknown>;
  }

  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    // The generated API doesn't support refresh tokens via the same endpoint
    // Fall back to direct API call
    const tokenUrl = new URL('/auth/token', this.config.baseUrl);
    
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    });

    const response = await fetch(tokenUrl.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const tokens = await response.json();
    return {
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    };
  }

  getLogoutUrl(idToken?: string): string {
    const logoutUrl = new URL('/auth/logout', this.config.baseUrl);
    logoutUrl.searchParams.set('post_logout_redirect_uri', this.config.redirectUri);
    logoutUrl.searchParams.set('client_id', this.config.clientId);
    
    if (idToken) {
      logoutUrl.searchParams.set('id_token_hint', idToken);
    }
    
    return logoutUrl.href;
  }

  // Helper methods for PKCE
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(digest));
  }

  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  private base64URLEncode(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

export const openidService = new OpenIDService();
