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

// User type definition
type UserRoleType = 'physician' | 'researcher' | 'nurse' | 'admin' | 'other';

interface HealthcareUser {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  department: string;
  npi?: string;
  status: 'active' | 'inactive';
  enabled: boolean;
  lastLogin?: string;
  createdTimestamp?: number;
  roleType: UserRoleType;
  attributes?: Record<string, string[]>;
}

/**
 * Classify user role based on role and department attributes
 */
function classifyUserRole(role: string, department: string): UserRoleType {
  const roleLower = role.toLowerCase()
  const deptLower = department.toLowerCase()
  
  // Check for researchers
  if (roleLower.includes('research') || deptLower.includes('research') || 
      roleLower.includes('scientist') || deptLower.includes('clinical trial')) {
    return 'researcher'
  }
  
  // Check for physicians
  if (roleLower.includes('physician') || roleLower.includes('doctor') || 
      roleLower.includes('md') || roleLower.includes('attending')) {
    return 'physician'
  }
  
  // Check for nurses
  if (roleLower.includes('nurse') || roleLower.includes('rn') || 
      roleLower.includes('nursing')) {
    return 'nurse'
  }
  
  // Check for admin roles
  if (roleLower.includes('admin') || roleLower.includes('manager') || 
      roleLower.includes('coordinator')) {
    return 'admin'
  }
  
  return 'other'
}

/**
 * Transform API user data to our internal format
 */
function transformApiUser(apiUser: GetAdminHealthcareUsers200ResponseInner): HealthcareUser {
  const attributes = apiUser.attributes as Record<string, string[]> || {};
  const role = attributes['role']?.[0] || 'healthcare_user';
  const department = attributes['department']?.[0] || '';
  const npi = attributes['npi']?.[0];
  
  return {
    id: apiUser.id,
    name: `${apiUser.firstName} ${apiUser.lastName}`.trim(),
    email: apiUser.email,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    username: apiUser.username,
    role,
    department,
    npi,
    status: apiUser.enabled ? 'active' : 'inactive',
    enabled: apiUser.enabled,
    lastLogin: apiUser.createdTimestamp ? new Date(apiUser.createdTimestamp).toISOString() : undefined,
    createdTimestamp: apiUser.createdTimestamp,
    roleType: classifyUserRole(role, department),
    attributes: attributes
  }
}

export function HealthcareUsersManager() {
  const { isAuthenticated } = useAuth();
  const [users, setUsers] = useState<HealthcareUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: '',
    npi: '',
    password: '',
    temporaryPassword: false,
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
        role: newUser.role || undefined,
        department: newUser.department || undefined,
        npi: newUser.npi || undefined,
        password: newUser.password || undefined,
        temporaryPassword: newUser.temporaryPassword,
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
        role: '',
        department: '',
        npi: '',
        password: '',
        temporaryPassword: false,
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create user:', err);
      setError('Failed to create healthcare user. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

  const getRoleBadgeColor = (roleType: UserRoleType) => {
    switch (roleType) {
      case 'physician':
        return 'bg-blue-100 text-blue-800';
      case 'nurse':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'researcher':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
                {users.filter(user => user.roleType === 'researcher').length}
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
                {users.filter(user => user.roleType === 'physician').length}
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
                <Label htmlFor="role" className="text-sm font-semibold text-gray-700">Role</Label>
                <Input
                  id="role"
                  placeholder="e.g., Physician, Nurse, Administrator"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="department" className="text-sm font-semibold text-gray-700">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., Cardiology, Emergency, IT"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="npi" className="text-sm font-semibold text-gray-700">NPI (Optional)</Label>
                <Input
                  id="npi"
                  placeholder="e.g., 1234567890"
                  value={newUser.npi}
                  onChange={(e) => setNewUser({ ...newUser, npi: e.target.value })}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
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
                  <TableHead className="font-semibold text-gray-700">Role</TableHead>
                  <TableHead className="font-semibold text-gray-700">Department</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
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
                      <Badge className={`${getRoleBadgeColor(user.roleType)} border-0 shadow-sm font-medium`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-medium">
                      {user.department}
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
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
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
                          <DropdownMenuItem className="rounded-lg">Edit Profile</DropdownMenuItem>
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
