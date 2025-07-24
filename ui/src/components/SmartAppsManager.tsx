import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useState, useEffect } from 'react';
import { 
  MoreHorizontal, 
  Plus, 
  Settings, 
  Shield, 
  Activity, 
  Edit, 
  Eye, 
  Trash2, 
  X,
  Code,
  Database,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// SMART on FHIR App Types
type SmartAppType = 'backend-service' | 'standalone-app' | 'ehr-launch-app' | 'agent';
type AuthenticationType = 'asymmetric' | 'symmetric' | 'none';

// Interface for Scope Sets (matching ScopeManager)
interface ScopeSet {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  isTemplate: boolean;
}

// Enhanced Smart App interface with scope management
interface SmartApp {
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
}

// Mock data for SMART on FHIR applications
const mockApps: SmartApp[] = [
  {
    id: '1',
    name: 'Clinical Decision Support',
    clientId: 'cds-app-123',
    redirectUri: 'https://cds.example.com/callback',
    scopes: ['patient/Patient.read', 'patient/Observation.read'],
    scopeSetId: 'physician-readonly',
    customScopes: [],
    status: 'active',
    lastUsed: '2024-12-28',
    description: 'AI-powered clinical decision support tool',
    appType: 'ehr-launch-app',
    authenticationType: 'asymmetric',
  },
  {
    id: '2',
    name: 'Patient Portal',
    clientId: 'portal-456',
    redirectUri: 'https://portal.example.com/auth',
    scopes: ['patient/Patient.read', 'patient/Condition.read', 'patient/MedicationRequest.read'],
    customScopes: ['patient/Appointment.read'],
    status: 'active',
    lastUsed: '2024-12-27',
    description: 'Patient self-service portal',
    appType: 'standalone-app',
    authenticationType: 'symmetric',
  },
  {
    id: '3',
    name: 'Research Analytics',
    clientId: 'research-789',
    redirectUri: 'https://research.example.com/oauth',
    scopes: ['user/Patient.read', 'user/Observation.read', 'user/DiagnosticReport.read'],
    scopeSetId: 'researcher-population',
    customScopes: [],
    status: 'inactive',
    lastUsed: '2024-12-20',
    description: 'Clinical research data analytics platform',
    appType: 'backend-service',
    authenticationType: 'asymmetric',
  },
  {
    id: '4',
    name: 'Mobile Health App',
    clientId: 'mobile-health-101',
    redirectUri: 'https://mhealth.example.com/callback',
    scopes: ['patient/Patient.read', 'patient/Observation.read'],
    customScopes: ['patient/ActivityDefinition.read'],
    status: 'active',
    lastUsed: '2024-12-26',
    description: 'Mobile application for patient health monitoring',
    appType: 'standalone-app',
    authenticationType: 'asymmetric',
  },
  {
    id: '5',
    name: 'Lab Results Viewer',
    clientId: 'lab-viewer-202',
    redirectUri: 'https://labs.example.com/auth',
    scopes: ['patient/DiagnosticReport.read', 'patient/Observation.read'],
    customScopes: [],
    status: 'active',
    lastUsed: '2024-12-25',
    description: 'Laboratory results visualization tool',
    appType: 'ehr-launch-app',
    authenticationType: 'symmetric',
  },
  {
    id: '6',
    name: 'Autonomous Clinical AI Agent',
    clientId: 'ai-agent-303',
    redirectUri: 'https://ai-assistant.example.com/callback',
    scopes: ['agent/Patient.read', 'agent/Observation.read', 'agent/Condition.read', 'agent/MedicationRequest.read', 'agent/CarePlan.create'],
    customScopes: ['agent/RiskAssessment.create', 'agent/ClinicalImpression.create'],
    status: 'active',
    lastUsed: '2024-12-28',
    description: 'Autonomous AI agent that independently analyzes patient data and creates clinical assessments.',
    appType: 'agent',
    authenticationType: 'asymmetric',
  },
  {
    id: '7',
    name: 'Life Saving Lawnmower',
    clientId: 'emergency-mower-911',
    redirectUri: 'https://smart-lawnmower.emergency.com/callback',
    scopes: ['agent/Patient.read', 'agent/Encounter.create', 'agent/Observation.create'],
    customScopes: ['agent/EmergencyContact.read', 'agent/AllergyIntolerance.read', 'agent/MedicationStatement.read'],
    status: 'active',
    lastUsed: '2024-12-29',
    description: 'Autonomous robotic lawnmower with emergency medical response capabilities.',
    appType: 'agent',
    authenticationType: 'asymmetric',
  },
];

export function SmartAppsManager() {
  const [apps, setApps] = useState<SmartApp[]>(mockApps);
  const [scopeSets, setScopeSets] = useState<ScopeSet[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<SmartApp | null>(null);
  const [newApp, setNewApp] = useState({
    name: '',
    clientId: '',
    redirectUri: '',
    description: '',
    scopes: [] as string[],
    scopeSetId: '',
    customScopes: [] as string[],
    appType: 'standalone-app' as SmartAppType,
    authenticationType: 'asymmetric' as AuthenticationType,
  });

  // Helper functions for app type characteristics
  const isInteractive = (appType: SmartAppType): boolean => {
    return appType === 'standalone-app' || appType === 'ehr-launch-app';
  };

  const requiresRedirectUri = (appType: SmartAppType): boolean => {
    return isInteractive(appType);
  };

  const hasFixedAuthType = (appType: SmartAppType): boolean => {
    return appType === 'backend-service' || appType === 'agent';
  };

  const getFixedAuthType = (appType: SmartAppType): AuthenticationType => {
    if (appType === 'backend-service' || appType === 'agent') {
      return 'asymmetric';
    }
    return 'asymmetric'; // default fallback
  };

  const getAuthTypeDescription = (appType: SmartAppType): string => {
    if (appType === 'agent') {
      return 'Agents require private key JWT for secure autonomous authentication';
    }
    if (appType === 'backend-service') {
      return 'Backend services require private key JWT for secure server-to-server communication';
    }
    return '';
  };

  const getRedirectUriHelperText = (appType: SmartAppType): string => {
    if (appType === 'backend-service') {
      return 'Backend services use client credentials flow - no redirect URI needed';
    }
    if (appType === 'agent') {
      return 'Agents use client credentials flow - no interactive login or redirect URI needed';
    }
    return '';
  };

  const isAgent = (appType: SmartAppType): boolean => {
    return appType === 'agent';
  };

  // Load scope sets from ScopeManager
  useEffect(() => {
    const loadScopeSets = () => {
      try {
        const saved = localStorage.getItem('smart-scope-sets');
        if (saved) {
          setScopeSets(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load scope sets:', error);
      }
    };
    loadScopeSets();
  }, []);

  const getAppTypeBadge = (appType: SmartAppType, authenticationType: AuthenticationType) => {
    switch (appType) {
      case 'backend-service':
        return {
          label: 'Backend Service',
          className: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300',
        };
      case 'standalone-app':
        return {
          label: `Standalone (${authenticationType === 'asymmetric' ? 'Asymmetric' : 'Symmetric'})`,
          className: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300',
        };
      case 'ehr-launch-app':
        return {
          label: `EHR Launch (${authenticationType === 'asymmetric' ? 'Asymmetric' : 'Symmetric'})`,
          className: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300',
        };
      case 'agent':
        return {
          label: `AI Agent (${authenticationType === 'asymmetric' ? 'Asymmetric' : 'Symmetric'})`,
          className: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300',
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300',
        };
    }
  };

  const getAppTypeIcon = (appType: SmartAppType) => {
    switch (appType) {
      case 'backend-service':
        return '🔧';
      case 'standalone-app':
        return '📱';
      case 'ehr-launch-app':
        return '🏥';
      case 'agent':
        return '🤖';
      default:
        return '❓';
    }
  };

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get scopes from selected scope set
    let finalScopes = [...newApp.scopes];
    if (newApp.scopeSetId) {
      const selectedScopeSet = scopeSets.find(set => set.id === newApp.scopeSetId);
      if (selectedScopeSet) {
        finalScopes = [...selectedScopeSet.scopes, ...newApp.customScopes];
      }
    } else {
      finalScopes = [...newApp.scopes, ...newApp.customScopes];
    }
    
    const app: SmartApp = {
      id: Date.now().toString(),
      name: newApp.name,
      clientId: newApp.clientId,
      redirectUri: newApp.redirectUri,
      description: newApp.description,
      scopes: finalScopes,
      scopeSetId: newApp.scopeSetId,
      customScopes: newApp.customScopes,
      appType: newApp.appType,
      authenticationType: newApp.authenticationType,
      status: 'active',
      lastUsed: new Date().toISOString().split('T')[0],
    };
    setApps([...apps, app]);
    setNewApp({ 
      name: '', 
      clientId: '', 
      redirectUri: '', 
      description: '', 
      scopes: [], 
      scopeSetId: '',
      customScopes: [],
      appType: 'standalone-app', 
      authenticationType: 'asymmetric' 
    });
    setShowAddForm(false);
  };

  const updateAppScopes = (appId: string, scopeSetId: string, customScopes: string[]) => {
    setApps(prevApps => prevApps.map(app => {
      if (app.id === appId) {
        let finalScopes = [...customScopes];
        if (scopeSetId) {
          const selectedScopeSet = scopeSets.find(set => set.id === scopeSetId);
          if (selectedScopeSet) {
            finalScopes = [...selectedScopeSet.scopes, ...customScopes];
          }
        }
        return {
          ...app,
          scopeSetId,
          customScopes,
          scopes: finalScopes
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
    <div className="p-8 space-y-8">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
              SMART on FHIR Applications
            </h1>
            <div className="text-gray-600 text-lg flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              Manage registered healthcare applications and their SMART on FHIR permissions
            </div>
            {scopeSets.length > 0 && (
              <div className="mt-4 flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-medium">
                  {scopeSets.length} scope templates available for quick configuration
                </span>
              </div>
            )}
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
          >
            <Plus className="h-5 h-5 mr-2" />
            Register New App
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-semibold text-blue-800 tracking-wide">Total Apps</div>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-2">{apps.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-sm font-semibold text-green-800 tracking-wide">EHR Launch</div>
              </div>
              <div className="text-3xl font-bold text-green-900 mb-2">
                {apps.filter(app => app.appType === 'ehr-launch-app').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-semibold text-blue-800 tracking-wide">Standalone</div>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-2">
                {apps.filter(app => app.appType === 'standalone-app').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Settings className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-sm font-semibold text-orange-800 tracking-wide">Backend Service</div>
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-2">
                {apps.filter(app => app.appType === 'backend-service').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-xl">🤖</span>
                </div>
                <div className="text-sm font-semibold text-purple-800 tracking-wide">AI Agents</div>
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-2">
                {apps.filter(app => app.appType === 'agent').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Add New App Form */}
      {showAddForm && (
        <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Register New SMART on FHIR Application</h3>
                <p className="text-gray-600 font-medium">Add a new healthcare application to your system</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleAddApp} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Application Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Clinical Decision Support"
                  value={newApp.name}
                  onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="clientId" className="text-sm font-semibold text-gray-700">Client ID</Label>
                <Input
                  id="clientId"
                  placeholder="e.g., app-client-123"
                  value={newApp.clientId}
                  onChange={(e) => setNewApp({ ...newApp, clientId: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="appType" className="text-sm font-semibold text-gray-700">Application Type</Label>
                <select
                  id="appType"
                  value={newApp.appType}
                  onChange={(e) => {
                    const appType = e.target.value as SmartAppType;
                    setNewApp({
                      ...newApp,
                      appType,
                      redirectUri: requiresRedirectUri(appType) ? newApp.redirectUri : '',
                      authenticationType: hasFixedAuthType(appType) ? getFixedAuthType(appType) : newApp.authenticationType
                    });
                  }}
                  className="flex h-10 w-full rounded-xl border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                  required
                >
                  <option value="standalone-app">Standalone App (Interactive)</option>
                  <option value="ehr-launch-app">EHR Launch App (Interactive)</option>
                  <option value="backend-service">Backend Service (Non-interactive, Deterministic)</option>
                  <option value="agent">AI Agent (Non-interactive, Autonomous)</option>
                </select>
              </div>
              {isInteractive(newApp.appType) && (
                <div className="space-y-3">
                  <Label htmlFor="authenticationType" className="text-sm font-semibold text-gray-700">Authentication Type</Label>
                  <select
                    id="authenticationType"
                    value={newApp.authenticationType}
                    onChange={(e) => setNewApp({ ...newApp, authenticationType: e.target.value as AuthenticationType })}
                    className="flex h-10 w-full rounded-xl border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                    required
                  >
                    <option value="asymmetric">Asymmetric Client Authentication</option>
                    <option value="symmetric">Symmetric Client Authentication</option>
                  </select>
                </div>
              )}
              {hasFixedAuthType(newApp.appType) && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Authentication Type</Label>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <span className="text-sm font-medium text-gray-700">Asymmetric (Required)</span>
                    <p className="text-xs text-gray-600 mt-1">
                      {getAuthTypeDescription(newApp.appType)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="redirectUri" className="text-sm font-semibold text-gray-700">Redirect URI</Label>
              <Input
                id="redirectUri"
                type="url"
                placeholder="https://your-app.com/callback"
                value={newApp.redirectUri}
                onChange={(e) => setNewApp({ ...newApp, redirectUri: e.target.value })}
                className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                required={requiresRedirectUri(newApp.appType)}
                disabled={!requiresRedirectUri(newApp.appType)}
              />
              {!requiresRedirectUri(newApp.appType) && (
                <p className="text-xs text-gray-500">{getRedirectUriHelperText(newApp.appType)}</p>
              )}
              {isAgent(newApp.appType) && (
                <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-purple-800 mb-1">Agent Flow Characteristics</p>
                      <p className="text-purple-700 mb-2">
                        Autonomous agents operate like backend services (no user login) but with non-deterministic, self-initiated behavior:
                      </p>
                      <ul className="text-purple-700 text-xs space-y-1 ml-4 list-disc">
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
              <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the application"
                value={newApp.description}
                onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
                className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
              />
            </div>

            {/* Scope Management Section */}
            <div className="space-y-6 p-6 bg-blue-50/50 rounded-xl border border-blue-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center shadow-sm">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 tracking-tight">Scope Configuration</h4>
                  <p className="text-gray-600 text-sm font-medium">Define what data this application can access</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="scopeSet" className="text-sm font-semibold text-gray-700">Predefined Scope Set</Label>
                  <select
                    id="scopeSet"
                    value={newApp.scopeSetId}
                    onChange={(e) => {
                      const scopeSetId = e.target.value;
                      const selectedSet = scopeSets.find(set => set.id === scopeSetId);
                      setNewApp({ 
                        ...newApp, 
                        scopeSetId,
                        scopes: selectedSet ? selectedSet.scopes : []
                      });
                    }}
                    className="flex h-10 w-full rounded-xl border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                  >
                    <option value="">Custom Scopes Only</option>
                    {scopeSets.map((scopeSet) => (
                      <option key={scopeSet.id} value={scopeSet.id}>
                        {scopeSet.name} ({scopeSet.scopes.length} scopes)
                      </option>
                    ))}
                  </select>
                  {newApp.scopeSetId && (
                    <div className="text-xs text-gray-600 bg-white p-3 rounded-lg border">
                      <div className="font-medium mb-2">Included scopes:</div>
                      <div className="flex flex-wrap gap-1">
                        {scopeSets.find(set => set.id === newApp.scopeSetId)?.scopes.slice(0, 5).map((scope, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                            {scope}
                          </span>
                        ))}
                        {(scopeSets.find(set => set.id === newApp.scopeSetId)?.scopes.length || 0) > 5 && (
                          <span className="text-xs text-gray-500">
                            +{(scopeSets.find(set => set.id === newApp.scopeSetId)?.scopes.length || 0) - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="customScopes" className="text-sm font-semibold text-gray-700">Additional Custom Scopes</Label>
                  <Textarea
                    id="customScopes"
                    placeholder="patient/Patient.read&#10;patient/Observation.read&#10;openid profile"
                    value={newApp.customScopes.join('\n')}
                    onChange={(e) => setNewApp({ 
                      ...newApp, 
                      customScopes: e.target.value.split('\n').filter(scope => scope.trim())
                    })}
                    rows={6}
                    className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">Enter one scope per line. These will be added to the selected scope set.</p>
                </div>
              </div>

              {/* Scope Preview */}
              {(newApp.scopes.length > 0 || newApp.customScopes.length > 0) && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Final Scope List Preview</Label>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {[...newApp.scopes, ...newApp.customScopes].map((scope, index) => (
                        <Badge key={index} variant="outline" className="text-xs font-mono bg-green-50 text-green-800 border-green-200">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Register Application
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="px-8 py-3 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Scope Management Dialog */}
      <Dialog open={showScopeDialog} onOpenChange={setShowScopeDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">
                  Manage Scopes: {editingApp?.name}
                </DialogTitle>
                <DialogDescription className="text-gray-600 font-medium mt-1">
                  Configure SMART on FHIR scopes for this application
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingApp && (
            <div className="space-y-6">
              {/* Current Configuration */}
              <Card className="bg-blue-50/50 border-blue-200/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                    <Database className="w-5 h-5 mr-2 text-blue-600" />
                    Current Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Current Scope Set</Label>
                      <div className="p-3 bg-white rounded-lg border">
                        <span className="font-medium text-gray-900">
                          {getScopeSetName(editingApp.scopeSetId)}
                        </span>
                        {editingApp.scopeSetId && (
                          <p className="text-xs text-gray-600 mt-1">
                            {scopeSets.find(set => set.id === editingApp.scopeSetId)?.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Total Scopes</Label>
                      <div className="p-3 bg-white rounded-lg border">
                        <span className="font-bold text-2xl text-blue-600">{editingApp.scopes.length}</span>
                        <span className="text-sm text-gray-600 ml-2">active scopes</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Active Scopes</Label>
                    <div className="bg-white p-4 rounded-lg border max-h-32 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {editingApp.scopes.map((scope, index) => (
                          <Badge key={index} variant="outline" className="text-xs font-mono bg-green-50 text-green-800 border-green-200">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scope Set Selection */}
              <Card className="bg-white/70 border-gray-200/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                    <Code className="w-5 h-5 mr-2 text-purple-600" />
                    Update Scope Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Select Scope Set</Label>
                      <select
                        value={editingApp.scopeSetId || ''}
                        onChange={(e) => {
                          const scopeSetId = e.target.value;
                          updateAppScopes(editingApp.id, scopeSetId, editingApp.customScopes);
                          setEditingApp({
                            ...editingApp,
                            scopeSetId,
                            scopes: scopeSetId 
                              ? [...(scopeSets.find(set => set.id === scopeSetId)?.scopes || []), ...editingApp.customScopes]
                              : editingApp.customScopes
                          });
                        }}
                        className="flex h-10 w-full rounded-xl border border-gray-300 bg-background px-3 py-2 text-sm shadow-sm"
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
                      <Label className="text-sm font-semibold text-gray-700">Additional Custom Scopes</Label>
                      <Textarea
                        value={editingApp.customScopes.join('\n')}
                        onChange={(e) => {
                          const customScopes = e.target.value.split('\n').filter(scope => scope.trim());
                          updateAppScopes(editingApp.id, editingApp.scopeSetId || '', customScopes);
                          setEditingApp({
                            ...editingApp,
                            customScopes,
                            scopes: editingApp.scopeSetId 
                              ? [...(scopeSets.find(set => set.id === editingApp.scopeSetId)?.scopes || []), ...customScopes]
                              : customScopes
                          });
                        }}
                        rows={5}
                        className="rounded-xl border-gray-300 shadow-sm font-mono text-sm"
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

      {/* Enhanced Applications Table */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Registered Applications</h3>
              <p className="text-gray-600 font-medium">View and manage all SMART on FHIR applications</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200/50">
                  <TableHead className="font-semibold text-gray-700">Application</TableHead>
                  <TableHead className="font-semibold text-gray-700">Type & Auth</TableHead>
                  <TableHead className="font-semibold text-gray-700">Client ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Scopes</TableHead>
                  <TableHead className="font-semibold text-gray-700">Last Used</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => {
                  const appTypeBadge = getAppTypeBadge(app.appType, app.authenticationType);
                  return (
                    <TableRow key={app.id} className="border-gray-200/50 hover:bg-gray-50/50 transition-colors duration-200">
                      <TableCell>
                        <div className="py-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{getAppTypeIcon(app.appType)}</span>
                            <div>
                              <div className="font-semibold text-gray-900">{app.name}</div>
                              <div className="text-sm text-gray-600 mt-1">{app.description}</div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${appTypeBadge.className} shadow-sm`}>
                          {appTypeBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gradient-to-r from-gray-100 to-gray-200 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 shadow-sm">
                          {app.clientId}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={app.status === 'active' ? 'default' : 'secondary'}
                          className={app.status === 'active'
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-sm'
                            : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-sm'
                          }
                        >
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {getScopeSetName(app.scopeSetId)}
                            </span>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {app.scopes.length} scopes
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {app.scopes.slice(0, 2).map((scope, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-mono">
                                {scope.split('/')[1]?.split('.')[0] || scope}
                              </Badge>
                            ))}
                            {app.scopes.length > 2 && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                +{app.scopes.length - 2}
                              </Badge>
                            )}
                          </div>
                          {app.customScopes.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                +{app.customScopes.length} custom
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 font-medium">
                        {app.lastUsed}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-gray-200/50 shadow-lg">
                            <DropdownMenuItem onClick={() => toggleAppStatus(app.id)} className="rounded-lg">
                              <div className="flex items-center">
                                {app.status === 'active' ? (
                                  <X className="w-4 h-4 mr-2 text-red-600" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                )}
                                {app.status === 'active' ? 'Deactivate' : 'Activate'}
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openScopeEditor(app)} className="rounded-lg">
                              <Shield className="w-4 h-4 mr-2 text-blue-600" />
                              Manage Scopes
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg">
                              <Edit className="w-4 h-4 mr-2 text-gray-600" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg">
                              <Eye className="w-4 h-4 mr-2 text-gray-600" />
                              View Configuration
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg">
                              <Settings className="w-4 h-4 mr-2 text-gray-600" />
                              Authentication Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteApp(app.id)}
                              className="text-red-600 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
