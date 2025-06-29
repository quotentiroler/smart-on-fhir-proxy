import KcAdminClient from '@keycloak/keycloak-admin-client'

/**
 * Factory function to create a Keycloak Admin Client instance
 * Uses environment variables for configuration
 */
export default async function keycloakAdmin() {
    const kcAdminClient = new KcAdminClient({
        baseUrl: process.env.KEYCLOAK_BASE_URL!,
        realmName: process.env.KEYCLOAK_REALM!,
    })

    // Authenticate with client credentials (await the authentication)
    await kcAdminClient.auth({
        grantType: 'client_credentials',
        clientId: process.env.KEYCLOAK_CLIENT_ID!,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
    })

    return kcAdminClient
}
