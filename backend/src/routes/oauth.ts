import { Elysia, t } from 'elysia'
import fetch from 'cross-fetch'
import { config } from '../config'
import { validateToken } from '../lib/auth'
import { getAllServers, ensureServersInitialized } from '../lib/fhir-server-store'
import { logger } from '../lib/logger'

interface TokenPayload {
  sub?: string
  smart_patient?: string
  smart_encounter?: string
  smart_fhir_user?: string
  smart_fhir_context?: string | object
  smart_intent?: string
  smart_style_url?: string
  smart_tenant?: string
  smart_need_patient_banner?: string | boolean
  smart_scope?: string
  [key: string]: unknown
}

interface AuthorizationDetail {
  type: string
  locations: string[]
  fhirVersions: string[]
  scope?: string
  patient?: string
  encounter?: string
  fhirContext?: Array<{
    reference?: string
    canonical?: string
    identifier?: object
    type?: string
    role?: string
  }>
}

/**
 * Generate authorization details from token claims (pure proxy approach)
 */
async function generateAuthorizationDetailsFromToken(
  tokenPayload: TokenPayload
): Promise<AuthorizationDetail[] | undefined> {
  try {
    // Ensure servers are initialized
    await ensureServersInitialized()
    
    // Get all servers from the store
    const serverInfos = await getAllServers()
    
    // Generate authorization details based on available FHIR servers
    const authDetails: AuthorizationDetail[] = []
    
    // Create authorization details for each configured FHIR server
    for (const serverInfo of serverInfos) {
      const serverDetail: AuthorizationDetail = {
        type: 'smart_on_fhir',
        locations: [`${config.baseUrl}/${config.appName}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`],
        fhirVersions: [serverInfo.metadata.fhirVersion]
      }

      // Add launch context from token claims
      if (tokenPayload.smart_patient) {
        serverDetail.patient = tokenPayload.smart_patient
      }
      if (tokenPayload.smart_encounter) {
        serverDetail.encounter = tokenPayload.smart_encounter
      }
      if (tokenPayload.smart_scope) {
        serverDetail.scope = tokenPayload.smart_scope
      }

      authDetails.push(serverDetail)
    }

    return authDetails.length > 0 ? authDetails : undefined
  } catch (error) {
    logger.auth.warn('Failed to generate authorization details from token', { error })
    return undefined
  }
}

/**
 * OAuth2/OIDC proxy routes - handles token exchange and introspection
 */
export const oauthRoutes = new Elysia({ prefix: '/auth', tags: ['authentication'] })
  // redirect into Keycloak's /auth endpoint
  .get('/authorize', ({ query, redirect }) => {
    const url = new URL(
      `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/auth`
    )
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v as string))
    return redirect(url.href)
  }, {
    query: t.Object({
      response_type: t.Optional(t.String({ description: 'OAuth response type' })),
      client_id: t.Optional(t.String({ description: 'OAuth client ID' })),
      redirect_uri: t.Optional(t.String({ description: 'OAuth redirect URI' })),
      scope: t.Optional(t.String({ description: 'OAuth scope' })),
      state: t.Optional(t.String({ description: 'OAuth state parameter' })),
      code_challenge: t.Optional(t.String({ description: 'PKCE code challenge' })),
      code_challenge_method: t.Optional(t.String({ description: 'PKCE code challenge method' })),
      authorization_details: t.Optional(t.String({ description: 'Authorization details JSON string for multiple FHIR servers' }))
    }),
    detail: {
      summary: 'OAuth Authorization Endpoint',
      description: 'Redirects to Keycloak authorization endpoint for OAuth flow with support for authorization details',
      tags: ['authentication'],
      response: { 200: { description: 'Redirects to authorization server.' } }
    }
  })

  // Login page redirect - provides a simple login endpoint for UIs
  .get('/login', ({ query, redirect }) => {
    const state = query.state || Math.random().toString(36).substring(2, 15)
    const clientId = query.client_id || 'admin-ui'
    const redirectUri = query.redirect_uri || `${config.baseUrl}/`
    const scope = query.scope || 'openid profile email'
    
    const url = new URL(
      `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/auth`
    )
    
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', scope)
    url.searchParams.set('state', state)
    
    // Add any additional parameters passed through
    Object.entries(query).forEach(([k, v]) => {
      if (!['state', 'client_id', 'redirect_uri', 'scope'].includes(k)) {
        url.searchParams.set(k, v as string)
      }
    })
    
    return redirect(url.href)
  }, {
    query: t.Object({
      client_id: t.Optional(t.String({ description: 'OAuth client ID (defaults to admin-ui)' })),
      redirect_uri: t.Optional(t.String({ description: 'OAuth redirect URI (defaults to base URL)' })),
      scope: t.Optional(t.String({ description: 'OAuth scope (defaults to openid profile email)' })),
      state: t.Optional(t.String({ description: 'OAuth state parameter (auto-generated if not provided)' })),
      code_challenge: t.Optional(t.String({ description: 'PKCE code challenge' })),
      code_challenge_method: t.Optional(t.String({ description: 'PKCE code challenge method' })),
      authorization_details: t.Optional(t.String({ description: 'Authorization details JSON string for multiple FHIR servers' }))
    }),
    detail: {
      summary: 'Login Page Redirect',
      description: 'Simplified login endpoint that redirects to Keycloak with sensible defaults for UI applications',
      tags: ['authentication'],
      response: { 200: { description: 'Redirects to Keycloak login page.' } }
    }
  })

  // Logout endpoint - proxy to Keycloak logout
  .get('/logout', ({ query, redirect }) => {
    logger.auth.debug('Logout endpoint called', { query })
    
    const postLogoutRedirectUri = query.post_logout_redirect_uri || `${config.baseUrl}/`
    
    const url = new URL(
      `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/logout`
    )
    
    if (postLogoutRedirectUri) {
      url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri)
    }
    
    // Only pass valid id_token_hint if present and looks like a JWT
    if (query.id_token_hint) {
      // Basic validation: JWTs have 3 parts separated by dots
      const isValidJwtFormat = typeof query.id_token_hint === 'string' && 
                              query.id_token_hint.split('.').length === 3 &&
                              query.id_token_hint.length > 50 // Reasonable minimum length
      
      if (isValidJwtFormat) {
        url.searchParams.set('id_token_hint', query.id_token_hint)
        logger.auth.debug('Added valid id_token_hint to logout URL')
      } else {
        logger.auth.warn('Invalid id_token_hint format, skipping', { 
          hintLength: query.id_token_hint?.length,
          hintParts: query.id_token_hint?.split?.('.')?.length 
        })
      }
    }
    
    // Add other safe parameters (excluding id_token_hint which we handled above)
    Object.entries(query).forEach(([k, v]) => {
      if (k !== 'post_logout_redirect_uri' && k !== 'id_token_hint' && k === 'client_id') {
        url.searchParams.set(k, v as string)
      }
    })
    
    logger.auth.debug('Redirecting to Keycloak logout URL', { url: url.href })
    return redirect(url.href)
  }, {
    query: t.Object({
      post_logout_redirect_uri: t.Optional(t.String({ description: 'Post-logout redirect URI (defaults to base URL)' })),
      id_token_hint: t.Optional(t.String({ description: 'ID token hint for logout' })),
      client_id: t.Optional(t.String({ description: 'OAuth client ID' }))
    }),
    detail: {
      summary: 'Logout Endpoint',
      description: 'Proxies logout requests to Keycloak with sensible defaults',
      tags: ['authentication'],
      response: { 200: { description: 'Redirects to Keycloak logout page.' } }
    }
  })

  // proxy token request
  .post('/token', async ({ body, set }) => {
    const kcUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`
    logger.auth.debug('Token endpoint request received', { 
      keycloakUrl: kcUrl,
      bodyKeys: Object.keys(body as Record<string, unknown>)
    })
    
    try {
      // Convert the parsed body back to form data with proper OAuth2 field names
      const formData = new URLSearchParams()
      const bodyObj = body as Record<string, string | undefined>
      
      // Handle both camelCase and snake_case field names for OAuth2 standard field names
      if (bodyObj.grant_type || bodyObj.grantType) formData.append('grant_type', bodyObj.grant_type || bodyObj.grantType!)
      if (bodyObj.code) formData.append('code', bodyObj.code)
      if (bodyObj.redirect_uri || bodyObj.redirectUri) formData.append('redirect_uri', bodyObj.redirect_uri || bodyObj.redirectUri!)
      if (bodyObj.client_id || bodyObj.clientId) formData.append('client_id', bodyObj.client_id || bodyObj.clientId!)
      if (bodyObj.client_secret || bodyObj.clientSecret) formData.append('client_secret', bodyObj.client_secret || bodyObj.clientSecret!)
      if (bodyObj.code_verifier || bodyObj.codeVerifier) formData.append('code_verifier', bodyObj.code_verifier || bodyObj.codeVerifier!)
      if (bodyObj.refresh_token || bodyObj.refreshToken) formData.append('refresh_token', bodyObj.refresh_token || bodyObj.refreshToken!)
      if (bodyObj.scope) formData.append('scope', bodyObj.scope)
      if (bodyObj.audience) formData.append('audience', bodyObj.audience)
      
      // Handle password grant fields
      if (bodyObj.username) formData.append('username', bodyObj.username)
      if (bodyObj.password) formData.append('password', bodyObj.password)
      
      // Handle Backend Services (client_credentials with JWT authentication)
      if (bodyObj.client_assertion_type) formData.append('client_assertion_type', bodyObj.client_assertion_type)
      if (bodyObj.client_assertion) formData.append('client_assertion', bodyObj.client_assertion)
      
      const rawBody = formData.toString()
      logger.auth.debug('Sending form data to Keycloak', { 
        formFields: Array.from(formData.keys())
      })
      
      const resp = await fetch(kcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: rawBody
      })
      
      const data = await resp.json()
      logger.auth.debug('Keycloak response received', { 
        status: resp.status,
        hasAccessToken: !!data.access_token,
        error: data.error
      })
      
      // Set the proper HTTP status code from Keycloak response
      set.status = resp.status
      
      // If there's an error, return it with the proper status code
      if (data.error) {
        logger.auth.warn('OAuth2 error from Keycloak', { 
          error: data.error, 
          description: data.error_description,
          status: resp.status 
        })
        return data
      }
      
      // If token request was successful, add SMART launch context from token claims
      if (data.access_token && resp.status === 200) {
        try {
          const tokenPayload = await validateToken(data.access_token)
          
          // Add SMART launch context parameters from token claims (if available)
          // This requires proper Keycloak configuration with protocol mappers
          if (tokenPayload.smart_patient) {
            data.patient = tokenPayload.smart_patient
          }
          
          if (tokenPayload.smart_encounter) {
            data.encounter = tokenPayload.smart_encounter
          }
          
          if (tokenPayload.smart_fhir_user) {
            data.fhirUser = tokenPayload.smart_fhir_user
          }
          
          if (tokenPayload.smart_fhir_context) {
            try {
              data.fhirContext = typeof tokenPayload.smart_fhir_context === 'string' 
                ? JSON.parse(tokenPayload.smart_fhir_context)
                : tokenPayload.smart_fhir_context
            } catch {
              // If parse fails, don't include invalid fhirContext
            }
          }
          
          if (tokenPayload.smart_intent) {
            data.intent = tokenPayload.smart_intent
          }
          
          if (tokenPayload.smart_style_url) {
            data.smart_style_url = tokenPayload.smart_style_url
          }
          
          if (tokenPayload.smart_tenant) {
            data.tenant = tokenPayload.smart_tenant
          }
          
          if (tokenPayload.smart_need_patient_banner) {
            data.need_patient_banner = tokenPayload.smart_need_patient_banner === 'true' || tokenPayload.smart_need_patient_banner === true
          }
          
          // Add authorization_details for multiple FHIR servers support (RFC 9396)
          // Generate based on configured FHIR servers and token claims
          const generatedDetails = await generateAuthorizationDetailsFromToken(tokenPayload)
          if (generatedDetails) {
            data.authorization_details = generatedDetails
          }
        } catch (contextError) {
          logger.auth.warn('Failed to add launch context to token response', { contextError })
          // Continue without launch context rather than failing the entire request
        }
      }
      
      return data
    } catch (error) {
      logger.auth.error('Token endpoint error', { error })
      set.status = 500
      return { error: 'internal_server_error', error_description: 'Failed to process token request' }
    }
  },
  {
    body: t.Object({
      grant_type: t.String({ description: 'OAuth grant type (e.g., authorization_code, client_credentials, password)' }),
      code: t.Optional(t.String({ description: 'Authorization code for exchange' })),
      redirect_uri: t.Optional(t.String({ description: 'Redirect URI for authorization code flow' })),
      client_id: t.Optional(t.String({ description: 'OAuth client ID' })),
      client_secret: t.Optional(t.String({ description: 'OAuth client secret' })),
      code_verifier: t.Optional(t.String({ description: 'PKCE code verifier for security' })),
      refresh_token: t.Optional(t.String({ description: 'Refresh token for refresh_token grant' })),
      scope: t.Optional(t.String({ description: 'Requested scopes' })),
      audience: t.Optional(t.String({ description: 'Audience for the token request' })),
      // Password grant fields
      username: t.Optional(t.String({ description: 'Username for password grant' })),
      password: t.Optional(t.String({ description: 'Password for password grant' })),
      // Backend Services (SMART on FHIR) fields
      client_assertion_type: t.Optional(t.String({ description: 'Client assertion type for JWT authentication' })),
      client_assertion: t.Optional(t.String({ description: 'Client assertion JWT for Backend Services authentication' }))
    }),
    response: t.Object({
      access_token: t.Optional(t.String({ description: 'JWT access token' })),
      token_type: t.Optional(t.String({ description: 'Token type (Bearer)' })),
      expires_in: t.Optional(t.Number({ description: 'Token expiration time in seconds' })),
      refresh_token: t.Optional(t.String({ description: 'Refresh token' })),
      refresh_expires_in: t.Optional(t.Number({ description: 'Refresh token expiration time in seconds' })),
      id_token: t.Optional(t.String({ description: 'OpenID Connect ID token' })),
      scope: t.Optional(t.String({ description: 'Granted scopes' })),
      session_state: t.Optional(t.String({ description: 'Keycloak session state' })),
      'not-before-policy': t.Optional(t.Number({ description: 'Not before policy timestamp' })),
      // SMART on FHIR launch context parameters (per SMART App Launch 2.2.0)
      patient: t.Optional(t.String({ description: 'Patient in context (e.g., Patient/123)' })),
      encounter: t.Optional(t.String({ description: 'Encounter in context (e.g., Encounter/456)' })),
      fhirUser: t.Optional(t.String({ description: 'FHIR user resource (e.g., Practitioner/789)' })),
      fhirContext: t.Optional(t.Array(t.Object({
        reference: t.Optional(t.String({ description: 'FHIR resource reference' })),
        canonical: t.Optional(t.String({ description: 'Canonical URL' })),
        identifier: t.Optional(t.Object({}, { description: 'FHIR Identifier' })),
        type: t.Optional(t.String({ description: 'FHIR resource type' })),
        role: t.Optional(t.String({ description: 'Role URI' }))
      }), { description: 'Additional FHIR resources in context' })),
      intent: t.Optional(t.String({ description: 'Launch intent (e.g., reconcile-medications)' })),
      smart_style_url: t.Optional(t.String({ description: 'URL to CSS stylesheet for styling' })),
      tenant: t.Optional(t.String({ description: 'Tenant identifier' })),
      need_patient_banner: t.Optional(t.Boolean({ description: 'Whether patient banner is required' })),
      // Authorization details for multiple FHIR servers (RFC 9396)
      authorization_details: t.Optional(t.Array(t.Object({
        type: t.String({ description: 'Authorization details type (smart_on_fhir)' }),
        locations: t.Array(t.String({ description: 'Array of FHIR base URLs where token can be used' })),
        fhirVersions: t.Array(t.String({ description: 'Array of FHIR version codes (e.g., 4.0.1, 1.0.2)' })),
        scope: t.Optional(t.String({ description: 'Space-separated SMART scopes for these locations' })),
        patient: t.Optional(t.String({ description: 'Patient context for these locations' })),
        encounter: t.Optional(t.String({ description: 'Encounter context for these locations' })),
        fhirContext: t.Optional(t.Array(t.Object({
          reference: t.Optional(t.String({ description: 'FHIR resource reference' })),
          canonical: t.Optional(t.String({ description: 'Canonical URL' })),
          identifier: t.Optional(t.Object({}, { description: 'FHIR Identifier' })),
          type: t.Optional(t.String({ description: 'FHIR resource type' })),
          role: t.Optional(t.String({ description: 'Role URI' }))
        }), { description: 'FHIR context for these locations' }))
      }), { description: 'Authorization details for multiple FHIR servers' })),
      error: t.Optional(t.String({ description: 'Error code if request failed' })),
      error_description: t.Optional(t.String({ description: 'Error description if request failed' }))
    }),
    detail: {
      summary: 'OAuth Token Exchange',
      description: 'Exchange authorization code for access token with SMART launch context and authorization details for multiple FHIR servers',
      tags: ['authentication'],
      response: { 200: { description: 'OAuth token response with access token, SMART launch context parameters, and authorization details for multiple FHIR servers.' } }
    }
  })

  // proxy introspection
  .post('/introspect', async ({ body }) => {
    const kcUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token/introspect`
    const resp = await fetch(kcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body as Record<string, string>).toString()
    })
    return resp.json()
  }, {
    body: t.Object({
      token: t.String({ description: 'The token to introspect' }),
      token_type_hint: t.Optional(t.String({ description: 'Hint about the token type (access_token, refresh_token)' })),
      client_id: t.Optional(t.String({ description: 'OAuth client ID' })),
      client_secret: t.Optional(t.String({ description: 'OAuth client secret' }))
    }),
    response: t.Object({
      active: t.Boolean({ description: 'Whether token is active' }),
      sub: t.Optional(t.String({ description: 'Subject (user ID)' })),
      aud: t.Optional(t.String({ description: 'Audience' })),
      exp: t.Optional(t.Number({ description: 'Expiration timestamp' })),
      scope: t.Optional(t.String({ description: 'Token scopes' }))
    }),
    detail: {
      summary: 'Token Introspection',
      description: 'Validate and get information about an access token',
      tags: ['authentication'],
      response: { 200: { description: 'Token introspection response.' } }
    }
  })

  // Get current user info from token
  .get('/userinfo', async ({ headers, set }) => {
    if (!headers.authorization) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const token = headers.authorization.replace('Bearer ', '')
    
    try {
      // Validate the token and extract user info
      const payload = await validateToken(token)
      
      // Create a user profile from token claims
      const displayName = payload.name || 
        (payload.given_name && payload.family_name ? `${payload.given_name} ${payload.family_name}` : '') ||
        payload.given_name || 
        payload.preferred_username || 
        payload.email || 
        'User'
      
      const profile = {
        id: payload.sub || '',
        fhirUser: payload.smart_fhir_user || '',
        name: [{ 
          text: displayName
        }],
        username: payload.preferred_username || '',
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        roles: payload.realm_access?.roles || []
      }
      
      return profile
    } catch {
      set.status = 401
      return { error: 'Invalid token' }
    }
  }, {
    headers: t.Object({
      authorization: t.String({ description: 'Bearer token' })
    }),
    response: {
      200: t.Object({
        id: t.String({ description: 'User ID' }),
        fhirUser: t.Optional(t.String({ description: 'FHIR user resource reference (e.g., Practitioner/123)' })),
        name: t.Array(t.Object({
          text: t.String({ description: 'Display name' })
        })),
        username: t.String({ description: 'Username' }),
        email: t.Optional(t.String({ description: 'Email address' })),
        firstName: t.Optional(t.String({ description: 'First name' })),
        lastName: t.Optional(t.String({ description: 'Last name' })),
        roles: t.Array(t.String({ description: 'User roles' }))
      }),
      401: t.Object({
        error: t.String({ description: 'Error message' })
      })
    },
    detail: {
      summary: 'Get Current User Profile',
      description: 'Get authenticated user profile information from JWT token',
      tags: ['authentication'],
      security: [{ BearerAuth: [] }],
      response: { 200: { description: 'User profile information.' } }
    }
  })
