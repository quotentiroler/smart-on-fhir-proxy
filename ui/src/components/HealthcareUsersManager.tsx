import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, Users, UserCheck, Shield, GraduationCap, Loader2 } from 'lucide-react';
import { createAuthenticatedApiClients } from '@/lib/apiClient';
import { useAuth } from '@/stores/authStore';
import type { GetAdminHealthcareUsers200ResponseInner } from '@/lib/api-client';

interface HealthcareUser {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  organization: string;
  fhirUser?: string;
  status: 'active' | 'inactive';
  enabled: boolean;
  lastLogin?: number | null;
  createdTimestamp?: number;
  realmRoles?: string[];
  clientRoles?: Record<string, string[]>;
  attributes?: Record<string, string[]>;
}

/**
 * Get primary role from Keycloak roles
 */
function getPrimaryRole(realmRoles: string[] = [], clientRoles: Record<string, string[]> = {}): string {
  // Check client roles first (more specific)
  const adminUiRoles = clientRoles['admin-ui'] || []
  if (adminUiRoles.length > 0) {
    return adminUiRoles[0] // Return first client role
  }
  
  // Check realm roles
  const relevantRoles = realmRoles.filter(role => 
    !['default-roles-smart-on-fhir', 'offline_access', 'uma_authorization'].includes(role)
  )
  
  if (relevantRoles.length > 0) {
    return relevantRoles[0] // Return first relevant realm role
  }
  
  return 'user'
}

/**
 * Get role badge color based on role name
 */
function getRoleBadgeColor(role: string): string {
  const roleLower = role.toLowerCase()
  
  if (roleLower.includes('admin')) {
    return 'bg-purple-100 text-purple-800'
  } else if (roleLower.includes('physician') || roleLower.includes('doctor')) {
    return 'bg-blue-100 text-blue-800'
  } else if (roleLower.includes('nurse')) {
    return 'bg-green-100 text-green-800'
  } else if (roleLower.includes('researcher') || roleLower.includes('research')) {
    return 'bg-orange-100 text-orange-800'
  } else if (roleLower.includes('practitioner')) {
    return 'bg-indigo-100 text-indigo-800'
  }
  
  return 'bg-gray-100 text-gray-800'
}

/**
 * Available realm roles for selection
 */
const AVAILABLE_REALM_ROLES = [
  'physician',
  'nurse',
  'researcher',
  'practitioner',
  'administrator',
  'user'
];

/**
 * Available client roles for admin-ui
 */
const AVAILABLE_CLIENT_ROLES = {
  'admin-ui': [
    'admin',
    'user-manager',
    'viewer'
  ]
};

/**
 * Transform API user data to our internal format
 */
function transformApiUser(apiUser: GetAdminHealthcareUsers200ResponseInner): HealthcareUser {
  const attributes = apiUser.attributes as Record<string, string[]> || {};
  const organization = apiUser.organization || '';
  const fhirUser = apiUser.fhirUser || '';
  const clientRoles = apiUser.clientRoles as Record<string, string[]> || {};
  
  console.log('Transforming API user:', {
    id: apiUser.id,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    email: apiUser.email,
    username: apiUser.username,
    organization,
    fhirUser,
    enabled: apiUser.enabled,
    lastLogin: apiUser.lastLogin,
    createdTimestamp: apiUser.createdTimestamp,
    realmRoles: apiUser.realmRoles,
    clientRoles: clientRoles,
    attributes: attributes,
    fullApiUser: apiUser // Log the complete API response
  });

  return {
    id: apiUser.id,
    name: `${apiUser.firstName} ${apiUser.lastName}`.trim(),
    email: apiUser.email,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    username: apiUser.username,
    organization,
    fhirUser,
    status: apiUser.enabled ? 'active' : 'inactive',
    enabled: apiUser.enabled,
    lastLogin: apiUser.lastLogin,
    createdTimestamp: apiUser.createdTimestamp,
    realmRoles: apiUser.realmRoles,
    clientRoles: clientRoles,
    attributes: attributes
  }
}

export function HealthcareUsersManager() {
  const { isAuthenticated } = useAuth();
  const [users, setUsers] = useState<HealthcareUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<HealthcareUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    fhirUser: '',
    password: '',
    temporaryPassword: false,
    realmRoles: [] as string[],
    clientRoles: {} as Record<string, string[]>,
  });

  const [editUser, setEditUser] = useState({
    id: '',
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    fhirUser: '',
    enabled: true,
    realmRoles: [] as string[],
    clientRoles: {} as Record<string, string[]>,
  });

  // Load users from API
  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiClients = createAuthenticatedApiClients();
      const apiUsers = await apiClients.healthcareUsers.getAdminHealthcareUsers();
      
      const transformedUsers = apiUsers.map(transformApiUser);
      setUsers(transformedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load healthcare users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.username || !newUser.email || !newUser.firstName || !newUser.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const apiClients = createAuthenticatedApiClients();
      const createRequest = {
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        organization: newUser.organization || undefined,
        fhirUser: newUser.fhirUser || undefined,
        password: newUser.password || undefined,
        temporaryPassword: newUser.temporaryPassword,
        realmRoles: newUser.realmRoles.length > 0 ? newUser.realmRoles : undefined,
        clientRoles: Object.keys(newUser.clientRoles).length > 0 ? newUser.clientRoles : undefined,
      };

      const createdUser = await apiClients.healthcareUsers.postAdminHealthcareUsers({
        postAdminHealthcareUsersRequest: createRequest
      });

      // Add the new user to the list
      const transformedUser = transformApiUser(createdUser);
      setUsers([...users, transformedUser]);
      
      // Reset form
      setNewUser({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        organization: '',
        fhirUser: '',
        password: '',
        temporaryPassword: false,
        realmRoles: [],
        clientRoles: {},
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create user:', err);
      setError('Failed to create healthcare user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user: HealthcareUser) => {
    setEditingUser(user);
    setEditUser({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      organization: user.organization,
      fhirUser: user.fhirUser || '',
      enabled: user.enabled,
      realmRoles: user.realmRoles || [],
      clientRoles: user.clientRoles || {},
    });
    setShowEditForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editUser.firstName || !editUser.lastName || !editUser.email) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const apiClients = createAuthenticatedApiClients();
      const updateRequest = {
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        email: editUser.email,
        enabled: editUser.enabled,
        organization: editUser.organization || undefined,
        fhirUser: editUser.fhirUser || undefined,
        realmRoles: editUser.realmRoles.length > 0 ? editUser.realmRoles : undefined,
        clientRoles: Object.keys(editUser.clientRoles).length > 0 ? editUser.clientRoles : undefined,
      };

      const updatedUser = await apiClients.healthcareUsers.putAdminHealthcareUsersByUserId({
        userId: editUser.id,
        putAdminHealthcareUsersByUserIdRequest: updateRequest
      });

      // Update the user in the local state
      const transformedUser = transformApiUser(updatedUser);
      setUsers(users.map(user => 
        user.id === editUser.id ? transformedUser : user
      ));
      
      // Reset form and close modal
      setShowEditForm(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update user:', err);
      setError('Failed to update healthcare user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
    setEditingUser(null);
    setEditUser({
      id: '',
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      organization: '',
      fhirUser: '',
      enabled: true,
      realmRoles: [],
      clientRoles: {},
    });
  };

  const toggleUserStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
    try {
      const apiClients = createAuthenticatedApiClients();
      const newEnabled = currentStatus === 'inactive';
      
      await apiClients.healthcareUsers.putAdminHealthcareUsersByUserId({
        userId: id,
        putAdminHealthcareUsersByUserIdRequest: {
          enabled: newEnabled
        }
      });

      // Update local state
      setUsers(users.map(user => 
        user.id === id 
          ? { ...user, status: newEnabled ? 'active' : 'inactive', enabled: newEnabled }
          : user
      ));
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      setError('Failed to update user status. Please try again.');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const apiClients = createAuthenticatedApiClients();
      await apiClients.healthcareUsers.deleteAdminHealthcareUsersByUserId({ userId: id });
      
      // Remove user from local state
      setUsers(users.filter(user => user.id !== id));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete healthcare user. Please try again.');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="p-8 space-y-8">
      {/* Show loading state */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading healthcare users...</span>
        </div>
      )}

      {/* Show error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="text-red-800 font-medium">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
              Healthcare Users
            </h1>
            <div className="text-gray-600 text-lg flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              Manage healthcare professionals and administrative users
            </div>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)} 
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-semibold text-blue-800 tracking-wide">Total Users</div>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-2">{users.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-sm font-semibold text-green-800 tracking-wide">Active</div>
              </div>
              <div className="text-3xl font-bold text-green-900 mb-2">
                {users.filter(user => user.status === 'active').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-sm font-semibold text-orange-800 tracking-wide">Researchers</div>
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-2">
                {users.filter(user => {
                  const primaryRole = getPrimaryRole(user.realmRoles, user.clientRoles);
                  return primaryRole.toLowerCase().includes('researcher') || primaryRole.toLowerCase().includes('research');
                }).length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-sm font-semibold text-purple-800 tracking-wide">Physicians</div>
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-2">
                {users.filter(user => {
                  const primaryRole = getPrimaryRole(user.realmRoles, user.clientRoles);
                  return primaryRole.toLowerCase().includes('physician') || primaryRole.toLowerCase().includes('doctor');
                }).length}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Enhanced Add New User Form */}
      {showAddForm && (
        <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Add New Healthcare User</h3>
                <p className="text-gray-600 font-medium">Create a new user account for healthcare professionals</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleAddUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700">Username</Label>
                <Input
                  id="username"
                  placeholder="e.g., john.smith"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.smith@hospital.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="e.g., John"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="lastName" className="text-sm font-semibold text-gray-700">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="e.g., Smith"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="organization" className="text-sm font-semibold text-gray-700">Organization</Label>
                <Input
                  id="organization"
                  placeholder="e.g., Cardiology Department"
                  value={newUser.organization}
                  onChange={(e) => setNewUser({ ...newUser, organization: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="fhirUser" className="text-sm font-semibold text-gray-700">FHIR User (Optional)</Label>
                <Input
                  id="fhirUser"
                  placeholder="e.g., Practitioner/12345"
                  value={newUser.fhirUser}
                  onChange={(e) => setNewUser({ ...newUser, fhirUser: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave blank for no password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 pt-7">
                  <input
                    id="temporaryPassword"
                    type="checkbox"
                    checked={newUser.temporaryPassword}
                    onChange={(e) => setNewUser({ ...newUser, temporaryPassword: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="temporaryPassword" className="text-sm text-gray-700">Temporary password</Label>
                </div>
              </div>
            </div>
            
            {/* Role Management Section */}
            <div className="space-y-6 bg-blue-50/50 p-6 rounded-xl border border-blue-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Role Management</h4>
                  <p className="text-sm text-gray-600">Assign roles to control user permissions</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Realm Roles</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {AVAILABLE_REALM_ROLES.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <input
                          id={`realm-${role}`}
                          type="checkbox"
                          checked={newUser.realmRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewUser({
                                ...newUser,
                                realmRoles: [...newUser.realmRoles, role]
                              });
                            } else {
                              setNewUser({
                                ...newUser,
                                realmRoles: newUser.realmRoles.filter(r => r !== role)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor={`realm-${role}`} className="text-sm text-gray-700 capitalize">
                          {role}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Admin UI Roles</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {AVAILABLE_CLIENT_ROLES['admin-ui'].map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <input
                          id={`client-${role}`}
                          type="checkbox"
                          checked={newUser.clientRoles['admin-ui']?.includes(role) || false}
                          onChange={(e) => {
                            const currentAdminUiRoles = newUser.clientRoles['admin-ui'] || [];
                            if (e.target.checked) {
                              setNewUser({
                                ...newUser,
                                clientRoles: {
                                  ...newUser.clientRoles,
                                  'admin-ui': [...currentAdminUiRoles, role]
                                }
                              });
                            } else {
                              setNewUser({
                                ...newUser,
                                clientRoles: {
                                  ...newUser.clientRoles,
                                  'admin-ui': currentAdminUiRoles.filter(r => r !== role)
                                }
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor={`client-${role}`} className="text-sm text-gray-700 capitalize">
                          {role.replace('-', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button 
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Add User'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
                disabled={submitting}
                className="px-8 py-3 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Enhanced Edit User Form */}
      {showEditForm && editingUser && (
        <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Edit Healthcare User</h3>
                <p className="text-gray-600 font-medium">Update user information and permissions</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleUpdateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="editUsername" className="text-sm font-semibold text-gray-700">Username</Label>
                <Input
                  id="editUsername"
                  value={editUser.username}
                  className="rounded-xl border-gray-300 bg-gray-50 shadow-sm"
                  disabled
                />
                <p className="text-xs text-gray-500">Username cannot be changed</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="editEmail" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="john.smith@hospital.com"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 shadow-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="editFirstName" className="text-sm font-semibold text-gray-700">First Name</Label>
                <Input
                  id="editFirstName"
                  placeholder="e.g., John"
                  value={editUser.firstName}
                  onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 shadow-sm"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="editLastName" className="text-sm font-semibold text-gray-700">Last Name</Label>
                <Input
                  id="editLastName"
                  placeholder="e.g., Smith"
                  value={editUser.lastName}
                  onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 shadow-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="editOrganization" className="text-sm font-semibold text-gray-700">Organization</Label>
                <Input
                  id="editOrganization"
                  placeholder="e.g., Cardiology Department"
                  value={editUser.organization}
                  onChange={(e) => setEditUser({ ...editUser, organization: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="editFhirUser" className="text-sm font-semibold text-gray-700">FHIR User (Optional)</Label>
                <Input
                  id="editFhirUser"
                  placeholder="e.g., Practitioner/12345"
                  value={editUser.fhirUser}
                  onChange={(e) => setEditUser({ ...editUser, fhirUser: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500 shadow-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="editEnabled" className="text-sm font-semibold text-gray-700">Account Status</Label>
                <div className="flex items-center space-x-3 pt-2">
                  <input
                    id="editEnabled"
                    type="checkbox"
                    checked={editUser.enabled}
                    onChange={(e) => setEditUser({ ...editUser, enabled: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Label htmlFor="editEnabled" className="text-sm text-gray-700">Account enabled</Label>
                </div>
              </div>
              <div className="space-y-3">
                {/* Empty div for spacing */}
              </div>
            </div>
            
            {/* Role Management Section */}
            <div className="space-y-6 bg-purple-50/50 p-6 rounded-xl border border-purple-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Role Management</h4>
                  <p className="text-sm text-gray-600">Modify user roles and permissions</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Realm Roles</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {AVAILABLE_REALM_ROLES.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <input
                          id={`edit-realm-${role}`}
                          type="checkbox"
                          checked={editUser.realmRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditUser({
                                ...editUser,
                                realmRoles: [...editUser.realmRoles, role]
                              });
                            } else {
                              setEditUser({
                                ...editUser,
                                realmRoles: editUser.realmRoles.filter(r => r !== role)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <Label htmlFor={`edit-realm-${role}`} className="text-sm text-gray-700 capitalize">
                          {role}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Admin UI Roles</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {AVAILABLE_CLIENT_ROLES['admin-ui'].map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <input
                          id={`edit-client-${role}`}
                          type="checkbox"
                          checked={editUser.clientRoles['admin-ui']?.includes(role) || false}
                          onChange={(e) => {
                            const currentAdminUiRoles = editUser.clientRoles['admin-ui'] || [];
                            if (e.target.checked) {
                              setEditUser({
                                ...editUser,
                                clientRoles: {
                                  ...editUser.clientRoles,
                                  'admin-ui': [...currentAdminUiRoles, role]
                                }
                              });
                            } else {
                              setEditUser({
                                ...editUser,
                                clientRoles: {
                                  ...editUser.clientRoles,
                                  'admin-ui': currentAdminUiRoles.filter(r => r !== role)
                                }
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <Label htmlFor={`edit-client-${role}`} className="text-sm text-gray-700 capitalize">
                          {role.replace('-', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button 
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancelEdit}
                disabled={submitting}
                className="px-8 py-3 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Enhanced Users Table */}
      {!loading && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Healthcare Users</h3>
              <p className="text-gray-600 font-medium">View and manage all healthcare professionals and administrative users</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200/50">
                  <TableHead className="font-semibold text-gray-700">User</TableHead>
                  <TableHead className="font-semibold text-gray-700">Primary Role</TableHead>
                  <TableHead className="font-semibold text-gray-700">All Roles</TableHead>
                  <TableHead className="font-semibold text-gray-700">Organization</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Created</TableHead>
                  <TableHead className="font-semibold text-gray-700">Last Login</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-gray-200/50 hover:bg-gray-50/50 transition-colors duration-200">
                    <TableCell>
                      <div className="flex items-center gap-4 py-2">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                          <AvatarImage src={undefined} alt={user.name} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-semibold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getRoleBadgeColor(getPrimaryRole(user.realmRoles, user.clientRoles))} border-0 shadow-sm font-medium`}>
                        {getPrimaryRole(user.realmRoles, user.clientRoles)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.realmRoles?.map((role) => (
                          <Badge key={`realm-${role}`} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {role}
                          </Badge>
                        ))}
                        {user.clientRoles?.['admin-ui']?.map((role) => (
                          <Badge key={`client-${role}`} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            UI: {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-medium">
                      {user.organization}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.status === 'active' ? 'default' : 'secondary'}
                        className={user.status === 'active' 
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-sm' 
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-sm'
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-medium">
                      {user.createdTimestamp && user.createdTimestamp > 0 
                        ? new Date(user.createdTimestamp).toLocaleDateString() 
                        : 'Not available'
                      }
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-medium">
                      {user.lastLogin && user.lastLogin > 0 
                        ? new Date(user.lastLogin).toLocaleDateString() 
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-gray-200/50 shadow-lg">
                          <DropdownMenuItem onClick={() => toggleUserStatus(user.id, user.status)} className="rounded-lg">
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditUser(user)} className="rounded-lg">Edit Profile</DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg">View Permissions</DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg">Reset Password</DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 rounded-lg hover:bg-red-50"
                          >
                            Delete User
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
      )}
    </div>
  );
}
