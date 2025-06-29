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
import { MoreHorizontal, Plus, Shield, Key, Globe, Server } from 'lucide-react';

// Mock data for Identity Providers
const mockIdPs = [
  {
    id: '1',
    name: 'Hospital Azure AD',
    type: 'SAML',
    provider: 'Microsoft Azure',
    status: 'active',
    entityId: 'https://hospital.onmicrosoft.com/saml',
    ssoUrl: 'https://login.microsoftonline.com/hospital/saml2',
    lastUsed: '2024-12-28T10:30:00Z',
    userCount: 156,
  },
  {
    id: '2',
    name: 'Google Workspace',
    type: 'OAuth2',
    provider: 'Google',
    status: 'active',
    entityId: 'google-workspace-hospital',
    ssoUrl: 'https://accounts.google.com/oauth/authorize',
    lastUsed: '2024-12-28T09:15:00Z',
    userCount: 89,
  },
  {
    id: '3',
    name: 'Epic MyChart SSO',
    type: 'OIDC',
    provider: 'Epic',
    status: 'active',
    entityId: 'epic-mychart-sso',
    ssoUrl: 'https://mychart.hospital.com/oauth2/authorize',
    lastUsed: '2024-12-27T16:45:00Z',
    userCount: 342,
  },
  {
    id: '4',
    name: 'Legacy LDAP',
    type: 'LDAP',
    provider: 'OpenLDAP',
    status: 'inactive',
    entityId: 'ldap://hospital.local',
    ssoUrl: 'ldap://hospital.local:389',
    lastUsed: '2024-12-15T08:30:00Z',
    userCount: 23,
  },
  {
    id: '5',
    name: 'Okta Healthcare',
    type: 'SAML',
    provider: 'Okta',
    status: 'active',
    entityId: 'https://hospital.okta.com/saml2/service-provider',
    ssoUrl: 'https://hospital.okta.com/app/saml/sso',
    lastUsed: '2024-12-28T11:00:00Z',
    userCount: 78,
  },
];

export function IdPManager() {
  const [idps, setIdps] = useState(mockIdPs);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIdp, setNewIdp] = useState({
    name: '',
    type: 'SAML',
    provider: '',
    entityId: '',
    ssoUrl: '',
  });

  const handleAddIdp = (e: React.FormEvent) => {
    e.preventDefault();
    const idp = {
      id: Date.now().toString(),
      ...newIdp,
      status: 'active' as const,
      lastUsed: new Date().toISOString(),
      userCount: 0,
    };
    setIdps([...idps, idp]);
    setNewIdp({ name: '', type: 'SAML', provider: '', entityId: '', ssoUrl: '' });
    setShowAddForm(false);
  };

  const toggleIdpStatus = (id: string) => {
    setIdps(idps.map(idp => 
      idp.id === id 
        ? { ...idp, status: idp.status === 'active' ? 'inactive' as const : 'active' as const }
        : idp
    ));
  };

  const deleteIdp = (id: string) => {
    setIdps(idps.filter(idp => idp.id !== id));
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'SAML':
        return 'bg-blue-100 text-blue-800';
      case 'OAuth2':
        return 'bg-green-100 text-green-800';
      case 'OIDC':
        return 'bg-purple-100 text-purple-800';
      case 'LDAP':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Identity Provider Management</h1>
          <p className="text-gray-600 mt-2">
            Configure and manage identity providers for healthcare system authentication
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Identity Provider
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-gray-600">Total IdPs</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{idps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-gray-600">Active</div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {idps.filter(idp => idp.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-medium text-gray-600">Total Users</div>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {idps.reduce((acc, idp) => acc + idp.userCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-orange-600" />
              <div className="text-sm font-medium text-gray-600">SAML Providers</div>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {idps.filter(idp => idp.type === 'SAML').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New IdP Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Identity Provider</CardTitle>
            <CardDescription>
              Configure a new identity provider for healthcare system authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddIdp} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Provider Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Hospital Azure AD"
                    value={newIdp.name}
                    onChange={(e) => setNewIdp({ ...newIdp, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider Type</Label>
                  <Input
                    id="provider"
                    placeholder="e.g., Microsoft Azure, Google, Okta"
                    value={newIdp.provider}
                    onChange={(e) => setNewIdp({ ...newIdp, provider: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Authentication Type</Label>
                  <select
                    id="type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newIdp.type}
                    onChange={(e) => setNewIdp({ ...newIdp, type: e.target.value })}
                  >
                    <option value="SAML">SAML 2.0</option>
                    <option value="OAuth2">OAuth 2.0</option>
                    <option value="OIDC">OpenID Connect</option>
                    <option value="LDAP">LDAP</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entityId">Entity ID / Client ID</Label>
                  <Input
                    id="entityId"
                    placeholder="Entity identifier or client ID"
                    value={newIdp.entityId}
                    onChange={(e) => setNewIdp({ ...newIdp, entityId: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssoUrl">SSO URL / Authorization Endpoint</Label>
                <Input
                  id="ssoUrl"
                  type="url"
                  placeholder="https://login.provider.com/sso"
                  value={newIdp.ssoUrl}
                  onChange={(e) => setNewIdp({ ...newIdp, ssoUrl: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Add Identity Provider</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Identity Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Identity Providers</CardTitle>
          <CardDescription>
            View and manage all configured identity providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {idps.map((idp) => (
                <TableRow key={idp.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{idp.name}</div>
                      <div className="text-sm text-gray-600">{idp.provider}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeBadgeColor(idp.type)}>
                      {idp.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={idp.status === 'active' ? 'default' : 'secondary'}
                      className={idp.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {idp.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{idp.userCount}</span>
                    <span className="text-xs text-gray-500 ml-1">users</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(idp.lastUsed).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleIdpStatus(idp.id)}>
                          {idp.status === 'active' ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit Configuration</DropdownMenuItem>
                        <DropdownMenuItem>Test Connection</DropdownMenuItem>
                        <DropdownMenuItem>View Certificates</DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteIdp(idp.id)}
                          className="text-red-600"
                        >
                          Remove Provider
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
