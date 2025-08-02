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
    // Additional interfaces for enhanced functionality
    GetAdminClientRegistrationSettings200Response,
    PostAuthToken200ResponseAuthorizationDetailsInner,
    PostAuthToken200ResponseFhirContextInner,
    GetFhirServers200ResponseServersInnerEndpoints,
    GetMonitoringOauthEvents200ResponseEventsInnerFhirContext,
    GetHealth200ResponseFhirServers,
    GetHealth200ResponseFhirServersServersInner,
    GetHealth200ResponseMemory,
    PostAuthIntrospect200Response,
    PostAuthRegisterRequest,
    PostSmartProxyByServerNameByFhirVersionCacheRefresh200Response,
    PostSmartProxyByServerNameByFhirVersionCacheRefresh200ResponseServerInfo,
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
    GetFhirServers200ResponseServersInnerEndpoints as FhirServerEndpoints,
    
    // Identity Providers
    GetAdminIdps200ResponseInner as IdentityProvider,
    PostAdminIdpsRequest as CreateIdentityProviderRequest,
    PutAdminIdpsByAliasRequest as UpdateIdentityProviderRequest,
    
    // OAuth Events & Analytics
    GetMonitoringOauthEvents200ResponseEventsInner as OAuthEvent,
    GetMonitoringOauthAnalytics200Response as OAuthAnalytics,
    GetMonitoringOauthAnalytics200ResponseTopClientsInner as TopClient,
    GetMonitoringOauthAnalytics200ResponseHourlyStatsInner as HourlyStats,
    GetMonitoringOauthEvents200ResponseEventsInnerFhirContext as OAuthEventFhirContext,
    
    // System Health
    GetStatus200Response as SystemStatus,
    GetHealth200Response as SystemHealth,
    GetStatus200ResponseServer as ServerStatus,
    GetStatus200ResponseFhir as FhirStatus,
    GetStatus200ResponseKeycloak as KeycloakStatus,
    GetHealth200ResponseFhirServers as FhirServersHealth,
    GetHealth200ResponseFhirServersServersInner as FhirServerHealth,
    GetHealth200ResponseMemory as MemoryHealth,
    
    // Launch Contexts
    GetAdminLaunchContexts200ResponseInner as LaunchContext,
    PostAdminLaunchContextsByUserIdFhirContextRequest as CreateLaunchContextRequest,
    
    // Roles
    GetAdminRoles200ResponseInner as Role,
    PostAdminRolesRequest as CreateRoleRequest,
    PutAdminRolesByRoleNameRequest as UpdateRoleRequest,
    
    // Auth & Registration
    GetAuthUserinfo200Response as UserProfile,
    PostAuthToken200Response as TokenResponse,
    PostAuthToken200ResponseAuthorizationDetailsInner as TokenAuthorizationDetails,
    PostAuthToken200ResponseFhirContextInner as TokenFhirContext,
    PostAuthIntrospect200Response as TokenIntrospectionResponse,
    PostAuthRegisterRequest as UserRegistrationRequest,
    
    // Client Registration
    GetAdminClientRegistrationSettings200Response as ClientRegistrationSettings,
    
    // FHIR Proxy & Cache
    PostSmartProxyByServerNameByFhirVersionCacheRefresh200Response as CacheRefreshResponse,
    PostSmartProxyByServerNameByFhirVersionCacheRefresh200ResponseServerInfo as CacheServerInfo,
};

// UI Models - these extend the API models with UI-specific properties
export type AuthenticationType = 'symmetric' | 'asymmetric' | 'none';
export type SmartAppType = 'standalone-app' | 'backend-service' | 'ehr-launch' | 'agent';

// TODO: dont use custom interfaces for backend models, use or inherit the existing generated API models instead
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

// Form types that directly extend API models (minimal UI-specific overrides)
export interface FhirPersonAssociation {
    serverName: string;
    personId: string;
    display?: string;
    created?: string;
}

export interface SmartAppFormData extends PostAdminSmartAppsRequest {
    // UI-specific fields for better UX - these get merged/converted at submission
    scopeSetId?: string; // UI helper for scope management
    customScopes?: string[]; // UI helper for custom scopes
    appType?: 'backend-service' | 'standalone-app' | 'ehr-launch' | 'agent'; // UI classification
    authenticationType?: 'asymmetric' | 'symmetric' | 'none'; // UI helper
    serverAccessType?: 'all-servers' | 'selected-servers' | 'user-person-servers'; // UI helper
    allowedServerIds?: string[]; // UI helper
}

// Healthcare User Form that directly extends API model
export interface HealthcareUserFormData extends PostAdminHealthcareUsersRequest {
    // UI-specific helper fields
    primaryRole?: string; // UI helper for easier role selection
    fhirPersons?: FhirPersonAssociation[]; // UI helper for managing associations (gets converted to fhirUser string)
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
