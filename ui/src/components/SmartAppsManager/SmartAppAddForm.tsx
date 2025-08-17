import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Shield, 
  AlertCircle,
  Server,
  Users,
  Globe,
  CheckCircle
} from 'lucide-react';
import { useFhirServers } from '@/stores/smartStore';
import type { ScopeSet, SmartAppFormData } from '@/lib/types/api';

// Types - now using generated models - updated to match centralized types
type SmartAppType = 'backend-service' | 'standalone-app' | 'ehr-launch' | 'agent';
type AuthenticationType = 'asymmetric' | 'symmetric' | 'none';
type ServerAccessType = 'all-servers' | 'selected-servers' | 'user-person-servers';

interface SmartAppAddFormProps {
  open: boolean;
  onClose: () => void;
  onAddApp: (app: SmartAppFormData) => void; // Using our form data type instead
  scopeSets: ScopeSet[];
}

export function SmartAppAddForm({ open, onClose, onAddApp, scopeSets }: SmartAppAddFormProps) {
  const { servers, loading: serversLoading } = useFhirServers();
  const [newApp, setNewApp] = useState<SmartAppFormData>({
    name: '',
    clientId: '',
    redirectUris: [], // Changed to array for API compatibility
    description: '',
    defaultScopes: [],
    scopeSetId: '',
    optionalScopes: [],
    appType: 'standalone-app',
    authenticationType: 'asymmetric',
    serverAccessType: 'all-servers',
    allowedServerIds: [],
    publicClient: false,
    webOrigins: [],
    smartVersion: '2.0.0',
    fhirVersion: 'R4',
    systemScopes: []
  });

  // Helper functions
  const isInteractive = (appType: SmartAppType | undefined): boolean => {
    if (!appType) return false;
    return appType === 'standalone-app' || appType === 'ehr-launch';
  };

  const requiresRedirectUri = (appType: SmartAppType | undefined): boolean => {
    return isInteractive(appType);
  };

  const hasFixedAuthType = (appType: SmartAppType | undefined): boolean => {
    if (!appType) return false;
    return appType === 'backend-service' || appType === 'agent';
  };

  const getFixedAuthType = (appType: SmartAppType | undefined): AuthenticationType => {
    if (appType === 'backend-service' || appType === 'agent') {
      return 'asymmetric';
    }
    return 'asymmetric';
  };

  const getAuthTypeDescription = (appType: SmartAppType | undefined): string => {
    if (appType === 'agent') {
      return 'Agents require private key JWT for secure autonomous authentication';
    }
    if (appType === 'backend-service') {
      return 'Backend services require private key JWT for secure server-to-server communication';
    }
    return '';
  };

  const getRedirectUriHelperText = (appType: SmartAppType | undefined): string => {
    if (appType === 'backend-service') {
      return 'Backend services use client credentials flow - no redirect URI needed';
    }
    if (appType === 'agent') {
      return 'Agents use client credentials flow - no interactive login or redirect URI needed';
    }
    return '';
  };

  const isAgent = (appType: SmartAppType | undefined): boolean => {
    return appType === 'agent';
  };

  const getServerAccessTypeDescription = (serverAccessType: ServerAccessType): string => {
    switch (serverAccessType) {
      case 'all-servers':
        return 'App can access all FHIR servers behind the Proxy';
      case 'selected-servers':
        return 'App is restricted to specific FHIR servers only';
      case 'user-person-servers':
        return 'App can only access servers where the user has associated Person records (not available for backend services)';
      default:
        return '';
    }
  };

  const getScopeSetName = (scopeSetId?: string) => {
    if (!scopeSetId) return 'Custom';
    const scopeSet = scopeSets.find(set => set.id === scopeSetId);
    return scopeSet ? scopeSet.name : 'Unknown';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get scopes from selected scope set - guard against undefined arrays
    let finalDefaultScopes = [...(newApp.defaultScopes || [])];
    if (newApp.scopeSetId) {
      const selectedScopeSet = scopeSets.find(set => set.id === newApp.scopeSetId);
      if (selectedScopeSet) {
        finalDefaultScopes = [...selectedScopeSet.scopes, ...(newApp.optionalScopes || [])];
      }
    } else {
      finalDefaultScopes = [...(newApp.defaultScopes || []), ...(newApp.optionalScopes || [])];
    }
    
    onAddApp({
      name: newApp.name,
      clientId: newApp.clientId,
      redirectUris: newApp.redirectUris || [],
      description: newApp.description,
      defaultScopes: finalDefaultScopes,
      scopeSetId: newApp.scopeSetId,
      optionalScopes: newApp.optionalScopes || [],
      appType: newApp.appType!,
      authenticationType: newApp.authenticationType,
      serverAccessType: newApp.serverAccessType!,
      allowedServerIds: newApp.allowedServerIds || [],
    });

    // Reset form
    setNewApp({ 
      name: '', 
      clientId: '', 
      redirectUris: [], 
      description: '', 
      defaultScopes: [], 
      scopeSetId: '',
      optionalScopes: [],
      appType: 'standalone-app', 
      authenticationType: 'asymmetric',
      serverAccessType: 'all-servers',
      allowedServerIds: [],
    });
    onClose();
  };

  const handleCancel = () => {
    setNewApp({ 
      name: '', 
      clientId: '', 
      redirectUris: [], 
      description: '', 
      defaultScopes: [], 
      scopeSetId: '',
      optionalScopes: [],
      appType: 'standalone-app', 
      authenticationType: 'asymmetric',
      serverAccessType: 'all-servers',
      allowedServerIds: [],
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">Register New SMART on FHIR Application</h3>
            <p className="text-muted-foreground font-medium">Add a new healthcare application to your system</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-semibold text-foreground">Application Name</Label>
            <Input
              id="name"
              placeholder="e.g., Clinical Decision Support"
              value={newApp.name}
              onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
              className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="clientId" className="text-sm font-semibold text-foreground">Client ID</Label>
            <Input
              id="clientId"
              placeholder="e.g., app-client-123"
              value={newApp.clientId}
              onChange={(e) => setNewApp({ ...newApp, clientId: e.target.value })}
              className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="appType" className="text-sm font-semibold text-foreground">Application Type</Label>
            <select
              id="appType"
              value={newApp.appType}
              onChange={(e) => {
                const appType = e.target.value as SmartAppType;
                setNewApp({
                  ...newApp,
                  appType,
                  redirectUris: requiresRedirectUri(appType) ? newApp.redirectUris : [],
                  authenticationType: hasFixedAuthType(appType) ? getFixedAuthType(appType) : newApp.authenticationType
                });
              }}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
              required
            >
              <option value="standalone-app">Standalone App (Interactive)</option>
              <option value="ehr-launch">EHR Launch App (Interactive)</option>
              <option value="backend-service">Backend Service (Non-interactive, Deterministic)</option>
              <option value="agent">AI Agent (Non-interactive, Autonomous)</option>
            </select>
          </div>
          {isInteractive(newApp.appType) && (
            <div className="space-y-3">
              <Label htmlFor="authenticationType" className="text-sm font-semibold text-foreground">Authentication Type</Label>
              <select
                id="authenticationType"
                value={newApp.authenticationType}
                onChange={(e) => setNewApp({ ...newApp, authenticationType: e.target.value as AuthenticationType })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                required
              >
                <option value="asymmetric">Asymmetric Client Authentication</option>
                <option value="symmetric">Symmetric Client Authentication</option>
              </select>
            </div>
          )}
          {hasFixedAuthType(newApp.appType) && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Authentication Type</Label>
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <span className="text-sm font-medium text-foreground">Asymmetric (Required)</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {getAuthTypeDescription(newApp.appType!)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="redirectUri" className="text-sm font-semibold text-foreground">Redirect URI</Label>
          <Input
            id="redirectUri"
            type="url"
            placeholder="https://your-app.com/callback"
            value={(newApp.redirectUris || [])[0] || ''}
            onChange={(e) => setNewApp({ 
              ...newApp, 
              redirectUris: e.target.value ? [e.target.value] : []
            })}
            className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
            required={requiresRedirectUri(newApp.appType!)}
            disabled={!requiresRedirectUri(newApp.appType!)}
          />
          {!requiresRedirectUri(newApp.appType!) && (
            <p className="text-xs text-muted-foreground">{getRedirectUriHelperText(newApp.appType!)}</p>
          )}
          {isAgent(newApp.appType!) && (
            <div className="mt-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-purple-800 dark:text-purple-300 mb-1">Agent Flow Characteristics</p>
                  <p className="text-purple-700 dark:text-purple-400 mb-2">
                    Autonomous agents operate like backend services (no user login) but with non-deterministic, self-initiated behavior:
                  </p>
                  <ul className="text-purple-700 dark:text-purple-400 text-xs space-y-1 ml-4 list-disc">
                    <li><strong>No interactive login</strong> - Uses client credentials like backend services</li>
                    <li><strong>Non-deterministic</strong> - Makes autonomous decisions based on environmental triggers</li>
                    <li><strong>Dynamic identity</strong> - fhirUser resolved to specific Device resource at runtime</li>
                    <li><strong>Self-initiated</strong> - Actions triggered by AI/ML algorithms, not scheduled tasks</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
          <Input
            id="description"
            placeholder="Brief description of the application"
            value={newApp.description}
            onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
            className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
          />
        </div>

        {/* Server Access Configuration Section */}
        <div className="space-y-6 p-6 bg-orange-500/10 rounded-xl border border-orange-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center shadow-sm">
              <Server className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground tracking-tight">Server Access Configuration</h4>
              <p className="text-muted-foreground text-sm font-medium">Control which FHIR servers this application can access</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="serverAccessType" className="text-sm font-semibold text-foreground">Server Access Type</Label>
              <select
                id="serverAccessType"
                value={newApp.serverAccessType}
                onChange={(e) => {
                  const serverAccessType = e.target.value as ServerAccessType;
                  setNewApp({
                    ...newApp,
                    serverAccessType,
                    allowedServerIds: serverAccessType === 'selected-servers' ? newApp.allowedServerIds : []
                  });
                }}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                required
              >
                <option value="all-servers">All Available Servers</option>
                <option value="selected-servers">Specific Servers Only</option>
                {newApp.appType !== 'backend-service' && (
                  <option value="user-person-servers">Servers with User Person Records</option>
                )}
              </select>
              <p className="text-xs text-muted-foreground">
                {getServerAccessTypeDescription(newApp.serverAccessType!)}
              </p>
            </div>

            {newApp.serverAccessType === 'selected-servers' && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Select Allowed Servers</Label>
                {serversLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-border border-t-primary rounded-full mr-2"></div>
                    Loading available servers...
                  </div>
                ) : servers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground bg-muted/50 rounded-lg border border-border">
                    <Server className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">No FHIR servers available</p>
                    <p className="text-xs text-muted-foreground">Configure FHIR servers first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-card rounded-lg border border-border">
                    {servers.map((server) => (
                      <label key={server.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(newApp.allowedServerIds || []).includes(server.id)}
                          onChange={(e) => {
                            const serverIds = e.target.checked
                              ? [...(newApp.allowedServerIds || []), server.id]
                              : (newApp.allowedServerIds || []).filter(id => id !== server.id);
                            setNewApp({ ...newApp, allowedServerIds: serverIds });
                          }}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-ring"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-foreground truncate">{server.name}</span>
                            {server.supported ? (
                              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span className="truncate">{server.url}</span>
                            <Badge variant="outline" className="text-xs">
                              {server.fhirVersion}
                            </Badge>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {(newApp.allowedServerIds || []).length > 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400 bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                    ✓ {(newApp.allowedServerIds || []).length} server(s) selected
                  </div>
                )}
              </div>
            )}

            {newApp.serverAccessType === 'user-person-servers' && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-purple-800 dark:text-purple-300 mb-1">User Person Server Access</p>
                    <p className="text-purple-700 dark:text-purple-400 mb-2">
                      This app will only be able to access FHIR servers where the authenticated user has an associated Person resource.
                    </p>
                    <ul className="text-purple-700 dark:text-purple-400 text-xs space-y-1 ml-4 list-disc">
                      <li>Server access is determined dynamically at runtime</li>
                      <li>Based on the user's Person resource links</li>
                      <li>Provides automatic data governance and access control</li>
                      <li>Only available for interactive applications (not backend services)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {newApp.serverAccessType === 'all-servers' && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Globe className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-green-800 dark:text-green-300 mb-1">All Server Access</p>
                    <p className="text-green-700 dark:text-green-400 text-xs">
                      This app will have access to all FHIR servers configured behind the Proxy. 
                      Use this option for apps that need broad access across all healthcare data sources.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scope Management Section */}
        <div className="space-y-6 p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground tracking-tight">Scope Configuration</h4>
              <p className="text-muted-foreground text-sm font-medium">Define what data this application can access</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="scopeSet" className="text-sm font-semibold text-foreground">Scope Template</Label>
              <select
                id="scopeSet"
                value={newApp.scopeSetId}
                onChange={(e) => setNewApp({ ...newApp, scopeSetId: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
              >
                <option value="">Custom Scopes</option>
                {scopeSets.map(set => (
                  <option key={set.id} value={set.id}>{set.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="customScopes" className="text-sm font-semibold text-foreground">Additional Scopes</Label>
              <Input
                id="customScopes"
                placeholder="patient/Patient.read, user/Observation.read"
                value={(newApp.optionalScopes || []).join(', ')}
                onChange={(e) => setNewApp({ 
                  ...newApp, 
                  optionalScopes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
          </div>

          {(newApp.scopeSetId || (newApp.optionalScopes || []).length > 0) && (
            <div className="bg-card/50 p-4 rounded-lg border border-border">
              <Label className="text-sm font-semibold text-foreground mb-2 block">Current Scope Preview</Label>
              <div className="text-xs text-muted-foreground mb-2">
                Template: <span className="font-medium">{getScopeSetName(newApp.scopeSetId)}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {/* Show template scopes */}
                {newApp.scopeSetId && scopeSets.find(set => set.id === newApp.scopeSetId)?.scopes.map((scope, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-mono">
                    {scope}
                  </Badge>
                ))}
                {/* Show additional scopes */}
                {(newApp.optionalScopes || []).map((scope: string, index: number) => (
                  <Badge key={`optional-${index}`} variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 font-mono">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="flex-1 rounded-xl py-3 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl py-3 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Application
          </Button>
        </div>
      </form>
    </div>
  );
}
