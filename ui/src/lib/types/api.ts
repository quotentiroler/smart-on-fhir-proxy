// Re-export and extend generated API models for UI usage
import type {
    GetAdminSmartApps200ResponseInner,
    PostAdminSmartAppsRequest,
    PutAdminSmartAppsByClientIdRequest,
    GetAdminHealthcareUsers200ResponseInner,
    PostAdminHealthcareUsersRequest,
    PutAdminHealthcareUsersByUserIdRequest,
    GetFhirServers200ResponseServersInner,
    PostFhirServersRequest,
    PutFhirServersByServerIdRequest,
    GetAdminIdps200ResponseInner,
    PostAdminIdpsRequest,
    PutAdminIdpsByAliasRequest,
    GetMonitoringOauthEvents200ResponseEventsInner,
    GetMonitoringOauthAnalytics200Response,
    GetMonitoringOauthAnalytics200ResponseTopClientsInner,
    GetMonitoringOauthAnalytics200ResponseHourlyStatsInner,
    GetStatus200Response,
    GetHealth200Response,
    GetStatus200ResponseServer,
    GetStatus200ResponseFhir,
    GetStatus200ResponseKeycloak,
    GetAdminLaunchContexts200ResponseInner,
    PostAdminLaunchContextsByUserIdFhirContextRequest,
    GetAdminRoles200ResponseInner,
    PostAdminRolesRequest,
    PutAdminRolesByRoleNameRequest,
    GetAuthUserinfo200Response,
    PostAuthToken200Response,
} from '../api-client';

export type {
    // Smart Apps - API Models
    GetAdminSmartApps200ResponseInner,
    PostAdminSmartAppsRequest as CreateSmartAppRequest,
    PutAdminSmartAppsByClientIdRequest as UpdateSmartAppRequest,
    
    // Healthcare Users
    GetAdminHealthcareUsers200ResponseInner as HealthcareUser,
    PostAdminHealthcareUsersRequest as CreateHealthcareUserRequest,
    PutAdminHealthcareUsersByUserIdRequest as UpdateHealthcareUserRequest,
    
    // FHIR Servers
    GetFhirServers200ResponseServersInner as FhirServer,
    PostFhirServersRequest as CreateFhirServerRequest,
    PutFhirServersByServerIdRequest as UpdateFhirServerRequest,
    
    // Identity Providers
    GetAdminIdps200ResponseInner as IdentityProvider,
    PostAdminIdpsRequest as CreateIdentityProviderRequest,
    PutAdminIdpsByAliasRequest as UpdateIdentityProviderRequest,
    
    // OAuth Events & Analytics
    GetMonitoringOauthEvents200ResponseEventsInner as OAuthEvent,
    GetMonitoringOauthAnalytics200Response as OAuthAnalytics,
    GetMonitoringOauthAnalytics200ResponseTopClientsInner as TopClient,
    GetMonitoringOauthAnalytics200ResponseHourlyStatsInner as HourlyStats,
    
    // System Health
    GetStatus200Response as SystemStatus,
    GetHealth200Response as SystemHealth,
    GetStatus200ResponseServer as ServerStatus,
    GetStatus200ResponseFhir as FhirStatus,
    GetStatus200ResponseKeycloak as KeycloakStatus,
    
    // Launch Contexts
    GetAdminLaunchContexts200ResponseInner as LaunchContext,
    PostAdminLaunchContextsByUserIdFhirContextRequest as CreateLaunchContextRequest,
    
    // Roles
    GetAdminRoles200ResponseInner as Role,
    PostAdminRolesRequest as CreateRoleRequest,
    PutAdminRolesByRoleNameRequest as UpdateRoleRequest,
    
    // Auth
    GetAuthUserinfo200Response as UserProfile,
    PostAuthToken200Response as TokenResponse,
};

// UI Models - these extend the API models with UI-specific properties
export type AuthenticationType = 'symmetric' | 'asymmetric' | 'none';
export type SmartAppType = 'standalone-app' | 'backend-service' | 'ehr-launch' | 'agent';

// SMART Application UI Model (extends API model with UI-specific fields)
export interface SmartApp {
    id: string;
    name: string;
    clientId: string;
    redirectUri: string; // UI uses single string, API uses redirectUris array
    scopes: string[];
    scopeSetId?: string;
    customScopes: string[];
    status: 'active' | 'inactive';
    lastUsed: string;
    description?: string;
    appType: 'standalone-app' | 'backend-service' | 'ehr-launch' | 'agent';
    authenticationType: 'symmetric' | 'asymmetric' | 'none';
    serverAccessType: 'all-servers' | 'selected-servers' | 'user-person-servers';
    allowedServerIds?: string[];
}

// Extended types for UI state management
export interface SmartAppWithState extends GetAdminSmartApps200ResponseInner {
    loading?: boolean;
    error?: string | null;
}

export interface HealthcareUserWithState extends GetAdminHealthcareUsers200ResponseInner {
    loading?: boolean;
    error?: string | null;
}

export interface FhirServerWithState extends Omit<GetFhirServers200ResponseServersInner, 'error'> {
    loading?: boolean;
    error?: string | null;
    connectionStatus?: 'connected' | 'disconnected' | 'testing';
}

export interface OAuthAnalyticsWithState extends GetMonitoringOauthAnalytics200Response {
    loading?: boolean;
    error?: string | null;
}

// Dashboard state types
export interface DashboardData {
    smartAppsCount: number;
    usersCount: number;
    serversCount: number;
    identityProvidersCount: number;
    loading: boolean;
    error: string | null;
}

// Form types for create/update operations (UI-specific with conversion logic)
export interface SmartAppFormData {
    name: string;
    clientId: string;
    redirectUri: string; // UI uses single URI, converts to array for API
    description?: string;
    scopes: string[];
    scopeSetId?: string; // UI-specific field
    customScopes: string[]; // UI-specific field
    appType: 'backend-service' | 'standalone-app' | 'ehr-launch' | 'agent'; // UI-specific
    authenticationType: 'asymmetric' | 'symmetric' | 'none'; // UI-specific
    serverAccessType: 'all-servers' | 'selected-servers' | 'user-person-servers'; // UI-specific
    allowedServerIds?: string[]; // UI-specific
    publicClient?: boolean;
    webOrigins?: string[];
    smartVersion?: string;
    fhirVersion?: string;
    publicKey?: string;
    jwksUri?: string;
    systemScopes?: string[];
}

// Utility function to convert UI form data to API request format
export function convertSmartAppFormToApiRequest(formData: SmartAppFormData): PostAdminSmartAppsRequest {
    return {
        clientId: formData.clientId,
        name: formData.name,
        description: formData.description,
        publicClient: formData.publicClient,
        redirectUris: formData.redirectUri ? [formData.redirectUri] : [], // Convert single URI to array
        webOrigins: formData.webOrigins,
        scopes: [...(formData.scopes || []), ...(formData.customScopes || [])], // Merge scopes
        smartVersion: formData.smartVersion,
        fhirVersion: formData.fhirVersion,
        publicKey: formData.publicKey,
        jwksUri: formData.jwksUri,
        systemScopes: formData.systemScopes,
    };
}

// Scope management types
export interface ScopeSet {
    id: string;
    name: string;
    description: string;
    scopes: string[];
    createdAt: string;
    updatedAt: string;
    isTemplate: boolean;
}
