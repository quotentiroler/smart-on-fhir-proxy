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
    <div className="p-8 space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
              Identity Provider Management
            </h1>
            <p className="text-gray-600 text-lg flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              Configure and manage identity providers for healthcare system authentication
            </p>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)} 
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Identity Provider
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Server className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-semibold text-blue-800 tracking-wide">Total IdPs</div>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-2">{idps.length}</div>
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
                <div className="text-sm font-semibold text-green-800 tracking-wide">Active</div>
              </div>
              <div className="text-3xl font-bold text-green-900 mb-2">
                {idps.filter(idp => idp.status === 'active').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Globe className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-sm font-semibold text-purple-800 tracking-wide">Total Users</div>
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-2">
                {idps.reduce((acc, idp) => acc + idp.userCount, 0)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Key className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-sm font-semibold text-orange-800 tracking-wide">SAML Providers</div>
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-2">
                {idps.filter(idp => idp.type === 'SAML').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Add New IdP Form */}
      {showAddForm && (
        <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Add New Identity Provider</h3>
                <p className="text-gray-600 font-medium">Configure a new identity provider for healthcare system authentication</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleAddIdp} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Provider Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Hospital Azure AD"
                  value={newIdp.name}
                  onChange={(e) => setNewIdp({ ...newIdp, name: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="provider" className="text-sm font-semibold text-gray-700">Provider Type</Label>
                <Input
                  id="provider"
                  placeholder="e.g., Microsoft Azure, Google, Okta"
                  value={newIdp.provider}
                  onChange={(e) => setNewIdp({ ...newIdp, provider: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="type" className="text-sm font-semibold text-gray-700">Authentication Type</Label>
                <select
                  id="type"
                  className="flex h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                  value={newIdp.type}
                  onChange={(e) => setNewIdp({ ...newIdp, type: e.target.value })}
                >
                  <option value="SAML">SAML 2.0</option>
                  <option value="OAuth2">OAuth 2.0</option>
                  <option value="OIDC">OpenID Connect</option>
                  <option value="LDAP">LDAP</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="entityId" className="text-sm font-semibold text-gray-700">Entity ID / Client ID</Label>
                <Input
                  id="entityId"
                  placeholder="Entity identifier or client ID"
                  value={newIdp.entityId}
                  onChange={(e) => setNewIdp({ ...newIdp, entityId: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="ssoUrl" className="text-sm font-semibold text-gray-700">SSO URL / Authorization Endpoint</Label>
              <Input
                id="ssoUrl"
                type="url"
                placeholder="https://login.provider.com/sso"
                value={newIdp.ssoUrl}
                onChange={(e) => setNewIdp({ ...newIdp, ssoUrl: e.target.value })}
                className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                required
              />
            </div>
            <div className="flex gap-4 pt-4">
              <Button 
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Add Identity Provider
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

      {/* Identity Providers Table */}
      <div className="backdrop-blur-sm bg-white/90 rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-300 hover:shadow-2xl">
        {/* Header */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Identity Providers
          </h3>
          <p className="text-gray-600">
            View and manage all configured identity providers
          </p>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200/50 bg-white/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-b border-gray-200/50">
                <TableHead className="font-semibold text-gray-700">Provider</TableHead>
                <TableHead className="font-semibold text-gray-700">Type</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Users</TableHead>
                <TableHead className="font-semibold text-gray-700">Last Used</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {idps.map((idp) => (
                <TableRow key={idp.id} className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100/50">
                  <TableCell className="py-4">
                    <div>
                      <div className="font-medium text-gray-900">{idp.name}</div>
                      <div className="text-sm text-gray-600">{idp.provider}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge className={`${getTypeBadgeColor(idp.type)} shadow-sm`}>
                      {idp.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      variant={idp.status === 'active' ? 'default' : 'secondary'}
                      className={`${idp.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'} shadow-sm`}
                    >
                      {idp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm font-medium text-gray-900">{idp.userCount}</span>
                    <span className="text-xs text-gray-500 ml-1">users</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 py-4">
                    {new Date(idp.lastUsed).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-blue-100/50 transition-colors duration-200">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl">
                        <DropdownMenuItem onClick={() => toggleIdpStatus(idp.id)} className="hover:bg-blue-50/50">
                          {idp.status === 'active' ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-blue-50/50">Edit Configuration</DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-blue-50/50">Test Connection</DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-blue-50/50">View Certificates</DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteIdp(idp.id)}
                          className="text-red-600 hover:bg-red-50/50"
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
        </div>
      </div>
    </div>
  );
}
