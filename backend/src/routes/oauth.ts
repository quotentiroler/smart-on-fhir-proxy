import { Elysia, t } from 'elysia'
import fetch from 'cross-fetch'
import { config } from '../config'
import { validateToken } from '../lib/auth'

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
      code_challenge_method: t.Optional(t.String({ description: 'PKCE code challenge method' }))
    }),
    detail: {
      summary: 'OAuth Authorization Endpoint',
      description: 'Redirects to Keycloak authorization endpoint for OAuth flow',
      tags: ['authentication'],
      response: { 200: { description: 'Redirects to authorization server.' } }
    }
  })

  // proxy token request
  .post('/token', async ({ request }) => {
    const kcUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`
    console.log('Token endpoint request received')
    console.log('Content-Type:', request.headers.get('content-type'))
    console.log('Proxying to:', kcUrl)
    
    try {
      // Get the raw body as text and pass it through
      const rawBody = await request.text()
      console.log('Raw body:', rawBody)
      
      const resp = await fetch(kcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: rawBody
      })
      
      console.log('Keycloak response status:', resp.status)
      const data = await resp.json()
      console.log('Keycloak response data:', data)
      
      return data
    } catch (error) {
      console.error('Token endpoint error:', error)
      return { error: 'internal_server_error', error_description: 'Failed to process token request' }
    }
  }, {
    response: t.Object({
      access_token: t.Optional(t.String({ description: 'JWT access token' })),
      token_type: t.Optional(t.String({ description: 'Token type (Bearer)' })),
      expires_in: t.Optional(t.Number({ description: 'Token expiration time in seconds' })),
      refresh_token: t.Optional(t.String({ description: 'Refresh token' })),
      scope: t.Optional(t.String({ description: 'Granted scopes' })),
      error: t.Optional(t.String({ description: 'Error code if request failed' })),
      error_description: t.Optional(t.String({ description: 'Error description if request failed' }))
    }),
    detail: {
      summary: 'OAuth Token Exchange',
      description: 'Exchange authorization code for access token',
      tags: ['authentication'],
      response: { 200: { description: 'OAuth token response with access token.' } }
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
      const profile = {
        id: payload.sub || '',
        resourceType: 'Practitioner',
        name: [{ 
          text: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || payload.preferred_username || ''
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
        resourceType: t.String({ description: 'FHIR resource type' }),
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
