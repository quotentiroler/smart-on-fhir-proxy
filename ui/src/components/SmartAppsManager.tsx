import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useState } from 'react';
import { MoreHorizontal, Plus, Settings, Shield, Activity } from 'lucide-react';

// SMART on FHIR App Types
type SmartAppType = 'backend-service' | 'standalone-app' | 'ehr-launch-app' | 'agent';
type AuthenticationType = 'asymmetric' | 'symmetric' | 'none';

// Mock data for SMART on FHIR applications
const mockApps = [
  {
    id: '1',
    name: 'Clinical Decision Support',
    clientId: 'cds-app-123',
    redirectUri: 'https://cds.example.com/callback',
    scopes: ['patient/Patient.read', 'patient/Observation.read'],
    status: 'active',
    lastUsed: '2024-12-28',
    description: 'AI-powered clinical decision support tool',
    appType: 'ehr-launch-app' as SmartAppType,
    authenticationType: 'asymmetric' as AuthenticationType,
  },
  {
    id: '2',
    name: 'Patient Portal',
    clientId: 'portal-456',
    redirectUri: 'https://portal.example.com/auth',
    scopes: ['patient/Patient.read', 'patient/Condition.read', 'patient/MedicationRequest.read'],
    status: 'active',
    lastUsed: '2024-12-27',
    description: 'Patient self-service portal',
    appType: 'standalone-app' as SmartAppType,
    authenticationType: 'symmetric' as AuthenticationType,
  },
  {
    id: '3',
    name: 'Research Analytics',
    clientId: 'research-789',
    redirectUri: 'https://research.example.com/oauth',
    scopes: ['patient/Patient.read', 'patient/Observation.read', 'patient/DiagnosticReport.read'],
    status: 'inactive',
    lastUsed: '2024-12-20',
    description: 'Clinical research data analytics platform',
    appType: 'backend-service' as SmartAppType,
    authenticationType: 'asymmetric' as AuthenticationType,
  },
  {
    id: '4',
    name: 'Mobile Health App',
    clientId: 'mobile-health-101',
    redirectUri: 'https://mhealth.example.com/callback',
    scopes: ['patient/Patient.read', 'patient/Vital.read'],
    status: 'active',
    lastUsed: '2024-12-26',
    description: 'Mobile application for patient health monitoring',
    appType: 'standalone-app' as SmartAppType,
    authenticationType: 'asymmetric' as AuthenticationType,
  },
  {
    id: '5',
    name: 'Lab Results Viewer',
    clientId: 'lab-viewer-202',
    redirectUri: 'https://labs.example.com/auth',
    scopes: ['patient/DiagnosticReport.read', 'patient/Observation.read'],
    status: 'active',
    lastUsed: '2024-12-25',
    description: 'Laboratory results visualization tool',
    appType: 'ehr-launch-app' as SmartAppType,
    authenticationType: 'symmetric' as AuthenticationType,
  },
  {
    id: '6',
    name: 'Clinical AI Assistant',
    clientId: 'ai-agent-303',
    redirectUri: 'https://ai-assistant.example.com/callback',
    scopes: ['patient/Patient.read', 'patient/Observation.read', 'patient/Condition.read', 'patient/MedicationRequest.read'],
    status: 'active',
    lastUsed: '2024-12-28',
    description: 'AI-powered clinical decision support and documentation assistant',
    appType: 'agent' as SmartAppType,
    authenticationType: 'asymmetric' as AuthenticationType,
  },
];

export function SmartAppsManager() {
  const [apps, setApps] = useState(mockApps);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newApp, setNewApp] = useState({
    name: '',
    clientId: '',
    redirectUri: '',
    description: '',
    scopes: [] as string[],
    appType: 'standalone-app' as SmartAppType,
    authenticationType: 'asymmetric' as AuthenticationType,
  });

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
    const app = {
      id: Date.now().toString(),
      ...newApp,
      status: 'active' as const,
      lastUsed: new Date().toISOString().split('T')[0],
    };
    setApps([...apps, app]);
    setNewApp({ name: '', clientId: '', redirectUri: '', description: '', scopes: [], appType: 'standalone-app', authenticationType: 'asymmetric' });
    setShowAddForm(false);
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
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-3 shadow-sm">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-600 text-lg flex items-center">
              Manage registered healthcare applications and their permissions
            </p>
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
                      redirectUri: appType === 'backend-service' ? '' : newApp.redirectUri,
                      authenticationType: appType === 'backend-service' ? 'none' : newApp.authenticationType
                    });
                  }}
                  className="flex h-10 w-full rounded-xl border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                  required
                >
                  <option value="standalone-app">Standalone App</option>
                  <option value="ehr-launch-app">EHR Launch App</option>
                  <option value="backend-service">Backend Service</option>
                  <option value="agent">AI Agent</option>
                </select>
              </div>
              {newApp.appType !== 'backend-service' && (
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
                required={newApp.appType !== 'backend-service'}
                disabled={newApp.appType === 'backend-service'}
              />
              {newApp.appType === 'backend-service' && (
                <p className="text-xs text-gray-500">Backend services don't require redirect URIs</p>
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
                        <div className="flex flex-wrap gap-2">
                          {app.scopes.slice(0, 2).map((scope, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {scope.split('/')[1]}
                            </Badge>
                          ))}
                          {app.scopes.length > 2 && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              +{app.scopes.length - 2}
                            </Badge>
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
                              {app.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg">Edit Details</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg">View Scopes</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg">Authentication Settings</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteApp(app.id)}
                              className="text-red-600 rounded-lg hover:bg-red-50"
                            >
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
