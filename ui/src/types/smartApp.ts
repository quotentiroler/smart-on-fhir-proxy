// SMART on FHIR App Types
export type SmartAppType = 'backend-service' | 'standalone-app' | 'ehr-launch-app' | 'agent';
export type AuthenticationType = 'asymmetric' | 'symmetric' | 'none';
export type ServerAccessType = 'all-servers' | 'specific-servers' | 'user-person-servers';

// Interface for Scope Sets (matching ScopeManager)
export interface ScopeSet {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  isTemplate: boolean;
}

// Enhanced Smart App interface with scope management and server access control
export interface SmartApp {
  id: string;
  name: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  scopeSetId?: string; // Reference to selected scope set
  customScopes: string[]; // Additional custom scopes
  status: 'active' | 'inactive';
  lastUsed: string;
  description: string;
  appType: SmartAppType;
  authenticationType: AuthenticationType;
  // Server Access Configuration
  serverAccessType: ServerAccessType;
  allowedServerIds?: string[]; // For 'specific-servers' type
}
