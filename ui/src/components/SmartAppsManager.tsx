import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  });

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    const app = {
      id: Date.now().toString(),
      ...newApp,
      status: 'active' as const,
      lastUsed: new Date().toISOString().split('T')[0],
    };
    setApps([...apps, app]);
    setNewApp({ name: '', clientId: '', redirectUri: '', description: '', scopes: [] });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SMART on FHIR Applications</h1>
          <p className="text-gray-600 mt-2">
            Manage registered healthcare applications and their permissions
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Register New App
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-gray-600">Total Apps</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{apps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-gray-600">Active</div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {apps.filter(app => app.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-600" />
              <div className="text-sm font-medium text-gray-600">Inactive</div>
            </div>
            <div className="text-2xl font-bold text-gray-600">
              {apps.filter(app => app.status === 'inactive').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-medium text-gray-600">Avg Scopes</div>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(apps.reduce((acc, app) => acc + app.scopes.length, 0) / apps.length)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New App Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Register New SMART on FHIR Application</CardTitle>
            <CardDescription>
              Add a new healthcare application to your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddApp} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Application Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Clinical Decision Support"
                    value={newApp.name}
                    onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    placeholder="e.g., app-client-123"
                    value={newApp.clientId}
                    onChange={(e) => setNewApp({ ...newApp, clientId: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirectUri">Redirect URI</Label>
                <Input
                  id="redirectUri"
                  type="url"
                  placeholder="https://your-app.com/callback"
                  value={newApp.redirectUri}
                  onChange={(e) => setNewApp({ ...newApp, redirectUri: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the application"
                  value={newApp.description}
                  onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Register Application</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Applications</CardTitle>
          <CardDescription>
            View and manage all SMART on FHIR applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application</TableHead>
                <TableHead>Client ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{app.name}</div>
                      <div className="text-sm text-gray-600">{app.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {app.clientId}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={app.status === 'active' ? 'default' : 'secondary'}
                      className={app.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {app.scopes.slice(0, 2).map((scope, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {scope.split('/')[1]}
                        </Badge>
                      ))}
                      {app.scopes.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{app.scopes.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {app.lastUsed}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleAppStatus(app.id)}>
                          {app.status === 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem>View Scopes</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteApp(app.id)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
