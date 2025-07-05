import { Elysia, t } from 'elysia'
import fetch from 'cross-fetch'
import { config } from '../config'
import { validateToken } from '../lib/auth'
import { getFHIRServerInfo } from '../lib/fhir-utils'

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
 * Generate authorization details dynamically based on server configuration
 */
async function generateAuthorizationDetails(
  userAttributes: Record<string, string[]>,
  requestedAuthDetails?: string
): Promise<AuthorizationDetail[] | undefined> {
  try {
    // Parse requested authorization details if provided
    let requestedDetails: AuthorizationDetail[] = []
    if (requestedAuthDetails) {
      try {
        requestedDetails = JSON.parse(requestedAuthDetails)
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Generate authorization details based on available FHIR servers
    const authDetails: AuthorizationDetail[] = []
    
    // Create authorization details for each configured FHIR server
    for (let i = 0; i < config.fhir.serverBases.length; i++) {
      const serverBase = config.fhir.serverBases[i]
      try {
        const fhirServerInfo = await getFHIRServerInfo(serverBase)
        
        // Generate a server name from the URL consistently
        const serverName = getServerNameFromUrl(serverBase, i)
        
        const serverDetail: AuthorizationDetail = {
          type: 'smart_on_fhir',
          locations: [`${config.baseUrl}/${serverName}/${fhirServerInfo.fhirVersion}/fhir`],
          fhirVersions: [fhirServerInfo.fhirVersion]
        }

        // Add launch context if available from user attributes
        if (userAttributes.smart_patient?.[0]) {
          serverDetail.patient = userAttributes.smart_patient[0]
        }
        if (userAttributes.smart_encounter?.[0]) {
          serverDetail.encounter = userAttributes.smart_encounter[0]
        }
        if (userAttributes.smart_scope?.[0]) {
          serverDetail.scope = userAttributes.smart_scope[0]
        }

        authDetails.push(serverDetail)
      } catch (error) {
        console.warn(`Failed to get info for FHIR server ${serverBase}:`, error)
        // Continue with other servers
      }
    }

    // Filter based on what client requested
    if (requestedDetails.length > 0) {
      return authDetails.filter(detail => 
        requestedDetails.some(req => 
          req.type === detail.type && 
          req.locations?.some((loc: string) => detail.locations.includes(loc))
        )
      )
    }

    return authDetails.length > 0 ? authDetails : undefined
  } catch (error) {
    console.warn('Failed to generate authorization details:', error)
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
      
      // If token request was successful, add SMART launch context
      if (data.access_token && resp.status === 200) {
        try {
          const { validateToken } = await import('../lib/auth')
          const tokenPayload = await validateToken(data.access_token)
          
          // Get user's launch context from Keycloak user attributes
          if (tokenPayload.sub) {
            const KcAdminClient = (await import('@keycloak/keycloak-admin-client')).default
            const kcAdminClient = new KcAdminClient({
              baseUrl: config.keycloak.baseUrl,
              realmName: config.keycloak.realm,
            })
            
            // Use client credentials to authenticate admin client
            await kcAdminClient.auth({
              grantType: 'client_credentials',
              clientId: config.keycloak.clientId,
              clientSecret: config.keycloak.clientSecret,
            })
            
            const user = await kcAdminClient.users.findOne({ id: tokenPayload.sub })
            
            if (user?.attributes) {
              // Add SMART launch context parameters per SMART App Launch 2.2.0 spec
              if (user.attributes.smart_patient?.[0]) {
                data.patient = user.attributes.smart_patient[0]
              }
              
              if (user.attributes.smart_encounter?.[0]) {
                data.encounter = user.attributes.smart_encounter[0]
              }
              
              if (user.attributes.smart_fhir_user?.[0]) {
                data.fhirUser = user.attributes.smart_fhir_user[0]
              }
              
              if (user.attributes.smart_fhir_context?.[0]) {
                try {
                  data.fhirContext = JSON.parse(user.attributes.smart_fhir_context[0])
                } catch {
                  // If parse fails, don't include invalid fhirContext
                }
              }
              
              if (user.attributes.smart_intent?.[0]) {
                data.intent = user.attributes.smart_intent[0]
              }
              
              if (user.attributes.smart_style_url?.[0]) {
                data.smart_style_url = user.attributes.smart_style_url[0]
              }
              
              if (user.attributes.smart_tenant?.[0]) {
                data.tenant = user.attributes.smart_tenant[0]
              }
              
              if (user.attributes.smart_need_patient_banner?.[0]) {
                data.need_patient_banner = user.attributes.smart_need_patient_banner[0] === 'true'
              }
              
              // Add authorization_details for multiple FHIR servers support (RFC 9396)
              // Always generate authorization details based on configured FHIR servers
              const generatedDetails = await generateAuthorizationDetails(user.attributes)
              if (generatedDetails) {
                data.authorization_details = generatedDetails
              }
            }
          }
        } catch (contextError) {
          console.warn('Failed to add launch context to token response:', contextError)
          // Continue without launch context rather than failing the entire request
        }
      }
      
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

  /**
   * Generate a server name from a FHIR server URL
   */
  function getServerNameFromUrl(serverUrl: string, index: number): string {
    try {
      const url = new URL(serverUrl)
      // Extract hostname and make it URL-safe
      const hostname = url.hostname.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '')
      return hostname || `server-${index}`
    } catch {
      return `server-${index}`
    }
  }
