import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Shield, 
  X,
  Database,
  CheckCircle,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { SmartAppAddForm } from './SmartAppAddForm';
import { SmartAppsTable } from './SmartAppsTable';
import { SmartAppsStatistics } from './SmartAppsStatistics';
import { DynamicClientRegistrationSettings } from '../DynamicClientRegistrationSettings';
import { useAuth } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { getItem } from '@/lib/storage';
import type { SmartApp, ScopeSet, SmartAppFormData } from '@/lib/types/api';

// Mock data for SMART on FHIR applications
const mockApps: SmartApp[] = [
  {
    id: '1',
    name: 'Clinical Decision Support',
    clientId: 'cds-app-123',
    redirectUris: ['https://cds.example.com/callback'],
    defaultClientScopes: ['patient/Patient.read', 'patient/Observation.read'],
    scopeSetId: 'physician-readonly',
    optionalClientScopes: [],
    status: 'active',
    lastUsed: '2024-12-28',
    description: 'AI-powered clinical decision support tool',
    appType: 'ehr-launch',
    authenticationType: 'asymmetric',
    serverAccessType: 'user-person-servers',
  },
  {
    id: '2',
    name: 'Patient Portal',
    clientId: 'portal-456',
    redirectUris: ['https://portal.example.com/auth'],
    defaultClientScopes: ['patient/Patient.read', 'patient/Condition.read', 'patient/MedicationRequest.read'],
    optionalClientScopes: ['patient/Appointment.read'],
    status: 'active',
    lastUsed: '2024-12-27',
    description: 'Patient self-service portal',
    appType: 'standalone-app',
    authenticationType: 'symmetric',
    serverAccessType: 'all-servers',
  },
  {
    id: '3',
    name: 'Research Analytics',
    clientId: 'research-789',
    redirectUris: ['https://research.example.com/oauth'],
    defaultClientScopes: ['user/Patient.read', 'user/Observation.read', 'user/DiagnosticReport.read'],
    scopeSetId: 'researcher-population',
    optionalClientScopes: [],
    status: 'inactive',
    lastUsed: '2024-12-20',
    description: 'Clinical research data analytics platform',
    appType: 'backend-service',
    authenticationType: 'asymmetric',
    serverAccessType: 'selected-servers',
    allowedServerIds: ['hapi-fhir-org', 'test-server-1'],
  },
  {
    id: '4',
    name: 'Mobile Health App',
    clientId: 'mobile-health-101',
    redirectUris: ['https://mhealth.example.com/callback'],
    defaultClientScopes: ['patient/Patient.read', 'patient/Observation.read'],
    optionalClientScopes: ['patient/ActivityDefinition.read'],
    status: 'active',
    lastUsed: '2024-12-26',
    description: 'Mobile application for patient health monitoring',
    appType: 'standalone-app',
    authenticationType: 'asymmetric',
    serverAccessType: 'user-person-servers',
  },
  {
    id: '5',
    name: 'Lab Results Viewer',
    clientId: 'lab-viewer-202',
    redirectUris: ['https://labs.example.com/auth'],
    defaultClientScopes: ['patient/DiagnosticReport.read', 'patient/Observation.read'],
    optionalClientScopes: [],
    status: 'active',
    lastUsed: '2024-12-25',
    description: 'Laboratory results visualization tool',
    appType: 'ehr-launch',
    authenticationType: 'symmetric',
    serverAccessType: 'selected-servers',
    allowedServerIds: ['lab-server-main'],
  },
  {
    id: '6',
    name: 'Autonomous Clinical AI Agent',
    clientId: 'ai-agent-303',
    redirectUris: ['https://ai-assistant.example.com/callback'],
    defaultClientScopes: ['agent/Patient.read', 'agent/Observation.read', 'agent/Condition.read', 'agent/MedicationRequest.read', 'agent/CarePlan.create'],
    optionalClientScopes: ['agent/RiskAssessment.create', 'agent/ClinicalImpression.create'],
    status: 'active',
    lastUsed: '2024-12-28',
    description: 'Autonomous AI agent that independently analyzes patient data and creates clinical assessments.',
    appType: 'agent',
    authenticationType: 'asymmetric',
    serverAccessType: 'all-servers',
  },
  {
    id: '7',
    name: 'Life Saving Lawnmower',
    clientId: 'emergency-mower-911',
    redirectUris: ['https://smart-lawnmower.emergency.com/callback'],
    defaultClientScopes: ['agent/Patient.read', 'agent/Encounter.create', 'agent/Observation.create'],
    optionalClientScopes: ['agent/EmergencyContact.read', 'agent/AllergyIntolerance.read', 'agent/MedicationStatement.read'],
    status: 'active',
    lastUsed: '2024-12-29',
    description: 'Autonomous robotic lawnmower with emergency medical response capabilities.',
    appType: 'agent',
    authenticationType: 'asymmetric',
    serverAccessType: 'all-servers',
  },
];

export function SmartAppsManager() {
  const { smartAppsManagerTab, setSmartAppsManagerTab } = useAppStore();
  const { clientApis } = useAuth();
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendApps, setBackendApps] = useState<SmartApp[]>([]);
  const [scopeSets, setScopeSets] = useState<ScopeSet[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<SmartApp | null>(null);

  // Load scope sets from ScopeManager
  useEffect(() => {
    const loadScopeSets = async () => {
      try {
        const saved = await getItem<ScopeSet[]>('smart-scope-sets');
        if (saved) {
          setScopeSets(saved);
        }
      } catch (error) {
        console.error('Failed to load scope sets:', error);
      }
    };
    loadScopeSets();
  }, []);

  // Fetch SMART apps from backend
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        const fetchedApps = await clientApis.smartApps.getAdminSmartApps();
        
        setBackendApps(fetchedApps);
        
        // Convert backend apps to our SmartApp format or use mock apps if no real apps
        if (fetchedApps.length === 0) {
          // No apps from backend, show mock apps
          setApps(mockApps);
        } else {
          // Convert backend apps to our format
          const convertedApps: SmartApp[] = fetchedApps.map((backendApp: SmartApp) => ({
            ...backendApp, // Inherit all API model fields
            // UI-specific computed/helper fields
            scopeSetId: undefined,
            status: backendApp.enabled ? 'active' : 'inactive',
            lastUsed: new Date().toISOString().split('T')[0], // Default to today
            appType: backendApp.serviceAccountsEnabled ? 'backend-service' : 'standalone-app',
            authenticationType: backendApp.clientAuthenticatorType === 'client-jwt' ? 'asymmetric' : 'symmetric',
            serverAccessType: 'all-servers', // Default for now
            allowedServerIds: undefined,
          }));
          setApps(convertedApps);
        }
      } catch (error) {
        console.error('Failed to fetch SMART apps:', error);
        // Fallback to mock apps on error
        setApps(mockApps);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [clientApis.smartApps]);

  const handleAddApp = (appData: SmartAppFormData) => {
    // Convert form data to SmartApp format for UI display
    const app: SmartApp = {
      id: Date.now().toString(),
      name: appData.name,
      clientId: appData.clientId,
      redirectUris: appData.redirectUris , // Take first redirect URI for UI display
      defaultClientScopes: appData.defaultScopes,
      optionalClientScopes: appData.optionalScopes,
      scopeSetId: appData.scopeSetId,
      status: 'active',
      lastUsed: new Date().toISOString().split('T')[0],
      description: appData.description || '',
      appType: appData.appType || 'standalone-app',
      authenticationType: appData.authenticationType || 'symmetric',
      serverAccessType: appData.serverAccessType || 'all-servers',
      allowedServerIds: appData.allowedServerIds,
    };
    // Note: When showing mock apps (no real apps from backend), this only updates the UI
    // To persist new apps, they need to be created via the backend API
    setApps([...apps, app]);
    setShowAddForm(false);
  };

  // Helper to determine if we're showing mock data
  const isShowingMockData = backendApps.length === 0;

  const updateAppScopes = (appId: string | undefined, scopeSetId: string | null, additionalScopes: string[]) => {
    if (!appId) return;
    
    setApps(prevApps => prevApps.map(app => {
      if (app.id === appId) {
        let finalDefaultScopes = [...additionalScopes];
        if (scopeSetId) {
          const selectedScopeSet = scopeSets.find(set => set.id === scopeSetId);
          if (selectedScopeSet) {
            finalDefaultScopes = [...selectedScopeSet.scopes, ...additionalScopes];
          }
        }
        return {
          ...app,
          scopeSetId: scopeSetId || undefined,
          defaultClientScopes: finalDefaultScopes,
          optionalClientScopes: app.optionalClientScopes || []
        };
      }
      return app;
    }));
  };

  const openScopeEditor = (app: SmartApp) => {
    setEditingApp(app);
    setShowScopeDialog(true);
  };

  const getScopeSetName = (scopeSetId?: string) => {
    if (!scopeSetId) return 'Custom';
    const scopeSet = scopeSets.find(set => set.id === scopeSetId);
    return scopeSet ? scopeSet.name : 'Unknown';
  };

  const toggleAppStatus = (id: string) => {
    setApps(apps.map(app =>
      app.id === id
        ? { ...app, status: app.status === 'active' ? 'inactive' as const : 'active' as const }
        : app
    ));
  };

  const deleteApp = (id: string) => {
    setApps(apps.filter(app => app.id !== id));
  };

  return (
    <div className="p-8 space-y-8 bg-background">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-muted-foreground">Loading SMART applications...</span>
        </div>
      ) : (
        <>
          {/* Enhanced Header Section */}
          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-3xl border border-border/50 shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
              <div className="flex-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
                  SMART on FHIR Applications
                </h1>
                <div className="text-muted-foreground text-lg flex items-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  Manage registered healthcare applications and their SMART on FHIR permissions
                </div>
                {isShowingMockData && (
                  <div className="mt-4 flex items-center space-x-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-orange-700 dark:text-orange-300 font-medium">
                      Showing sample applications - no real apps found in backend
                    </span>
                  </div>
                )}
                {scopeSets.length > 0 && (
                  <div className="mt-4 flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      {scopeSets.length} scope templates available for quick configuration
                    </span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-blue-500/20"
              >
                <Plus className="h-5 h-5 mr-2" />
                Register New App
              </Button>
            </div>
          </div>

          {/* Tabs for different sections */}
          <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
            <Tabs value={smartAppsManagerTab} onValueChange={setSmartAppsManagerTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-t-2xl">
                <TabsTrigger value="apps" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Registered Apps</span>
                </TabsTrigger>
                <TabsTrigger value="registration" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                  <UserPlus className="w-4 h-4" />
                  <span>Dynamic Registration</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="apps" className="p-6 space-y-6">

      {/* Add App Form - Inline when shown */}
      {showAddForm && (
        <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">Register New Application</h3>
                <p className="text-muted-foreground font-medium">Configure a new SMART on FHIR application</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
          <SmartAppAddForm
            open={true}
            onClose={() => setShowAddForm(false)}
            onAddApp={handleAddApp}
            scopeSets={scopeSets}
          />
        </div>
      )}

      {/* Enhanced Statistics Cards */}
      <SmartAppsStatistics apps={apps} />

      {/* Enhanced Applications Table */}
      <SmartAppsTable
        apps={apps}
        scopeSets={scopeSets}
        onToggleAppStatus={toggleAppStatus}
        onOpenScopeEditor={openScopeEditor}
        onDeleteApp={deleteApp}
      />

      {/* Scope Management Dialog */}
      <Dialog open={showScopeDialog} onOpenChange={setShowScopeDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                  Manage Scopes: {editingApp?.name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium mt-1">
                  Configure SMART on FHIR scopes for this application
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingApp && (
            <div className="space-y-6">
              {/* Current Configuration */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center">
                    <Database className="w-5 h-5 mr-2 text-primary" />
                    Current Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground mb-2">Current Scope Set</div>
                      <div className="p-3 bg-background rounded-lg border border-border">
                        <span className="font-medium text-foreground">
                          {getScopeSetName(editingApp.scopeSetId)}
                        </span>
                        {editingApp.scopeSetId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {scopeSets.find(set => set.id === editingApp.scopeSetId)?.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground mb-2">Total Scopes</div>
                      <div className="p-3 bg-background rounded-lg border border-border">
                        <span className="font-bold text-2xl text-primary">{((editingApp.defaultClientScopes || []).length + (editingApp.optionalClientScopes || []).length)}</span>
                        <span className="text-sm text-muted-foreground ml-2">active scopes</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-muted-foreground mb-2">Active Scopes</div>
                    <div className="bg-background p-4 rounded-lg border border-border max-h-32 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {/* Default Scopes */}
                        {(editingApp.defaultClientScopes || []).map((scope: string, index: number) => (
                          <Badge key={`default-${index}`} variant="outline" className="text-xs font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                            {scope}
                          </Badge>
                        ))}
                        {/* Optional Scopes */}
                        {(editingApp.optionalClientScopes || []).map((scope: string, index: number) => (
                          <Badge key={`optional-${index}`} variant="outline" className="text-xs font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                            {scope} (optional)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scope Set Selection */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-violet-600 dark:text-violet-400" />
                    Update Scope Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-muted-foreground">Select Scope Set</div>
                      <select
                        value={editingApp.scopeSetId || ''}
                        onChange={(e) => {
                          const scopeSetId = e.target.value || null;
                          const additionalScopes = editingApp.optionalClientScopes || [];
                          updateAppScopes(editingApp.id, scopeSetId, additionalScopes);
                          setEditingApp({
                            ...editingApp,
                            scopeSetId: scopeSetId || undefined,
                            defaultClientScopes: scopeSetId 
                              ? [...(scopeSets.find(set => set.id === scopeSetId)?.scopes || []), ...additionalScopes]
                              : additionalScopes
                          });
                        }}
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm text-foreground"
                      >
                        <option value="">Custom Scopes Only</option>
                        {scopeSets.map((scopeSet) => (
                          <option key={scopeSet.id} value={scopeSet.id}>
                            {scopeSet.name} ({scopeSet.scopes.length} scopes)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-muted-foreground">Additional Optional Scopes</div>
                      <textarea
                        value={(editingApp.optionalClientScopes || []).join('\n')}
                        onChange={(e) => {
                          const optionalScopes = e.target.value.split('\n').filter(scope => scope.trim());
                          updateAppScopes(editingApp.id, editingApp.scopeSetId || null, []);
                          setEditingApp({
                            ...editingApp,
                            optionalClientScopes: optionalScopes,
                            defaultClientScopes: editingApp.scopeSetId 
                              ? [...(scopeSets.find(set => set.id === editingApp.scopeSetId)?.scopes || [])]
                              : (editingApp.defaultClientScopes || [])
                          });
                        }}
                        rows={5}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring"
                        placeholder="patient/Patient.read&#10;patient/Observation.read&#10;openid profile"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-4 pt-4">
                <Button variant="outline" onClick={() => setShowScopeDialog(false)} className="px-8 py-3 rounded-xl">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
              </TabsContent>

              <TabsContent value="registration" className="p-6 space-y-6">
                <DynamicClientRegistrationSettings />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}
