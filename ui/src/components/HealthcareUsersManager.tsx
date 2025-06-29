import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useState } from 'react';
import { MoreHorizontal, Plus, Users, UserCheck, UserX, Shield } from 'lucide-react';

// Mock data for healthcare users
const mockUsers = [
  {
    id: '1',
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@hospital.com',
    role: 'Physician',
    department: 'Cardiology',
    status: 'active',
    lastLogin: '2024-12-28T10:30:00Z',
    permissions: ['patient.read', 'patient.write', 'prescription.write'],
  },
  {
    id: '2',
    name: 'Nurse Sarah Chen',
    email: 'sarah.chen@hospital.com',
    role: 'Nurse',
    department: 'Emergency',
    status: 'active',
    lastLogin: '2024-12-28T08:15:00Z',
    permissions: ['patient.read', 'vitals.write'],
  },
  {
    id: '3',
    name: 'Dr. Michael Thompson',
    email: 'michael.thompson@hospital.com',
    role: 'Physician',
    department: 'Orthopedics',
    status: 'inactive',
    lastLogin: '2024-12-20T16:45:00Z',
    permissions: ['patient.read', 'patient.write', 'imaging.read'],
  },
  {
    id: '4',
    name: 'Admin Lisa Park',
    email: 'lisa.park@hospital.com',
    role: 'Administrator',
    department: 'IT',
    status: 'active',
    lastLogin: '2024-12-28T09:00:00Z',
    permissions: ['admin.full', 'user.manage', 'system.config'],
  },
];

export function HealthcareUsersManager() {
  const [users, setUsers] = useState(mockUsers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const user = {
      id: Date.now().toString(),
      ...newUser,
      status: 'active' as const,
      lastLogin: new Date().toISOString(),
      permissions: ['patient.read'], // Default permission
    };
    setUsers([...users, user]);
    setNewUser({ name: '', email: '', role: '', department: '' });
    setShowAddForm(false);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(users.map(user => 
      user.id === id 
        ? { ...user, status: user.status === 'active' ? 'inactive' as const : 'active' as const }
        : user
    ));
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(user => user.id !== id));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'physician':
        return 'bg-blue-100 text-blue-800';
      case 'nurse':
        return 'bg-green-100 text-green-800';
      case 'administrator':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Healthcare Users</h1>
          <p className="text-gray-600 mt-2">
            Manage healthcare professionals and administrative users
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-gray-600">Total Users</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-gray-600">Active</div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(user => user.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-gray-600" />
              <div className="text-sm font-medium text-gray-600">Inactive</div>
            </div>
            <div className="text-2xl font-bold text-gray-600">
              {users.filter(user => user.status === 'inactive').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-medium text-gray-600">Physicians</div>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(user => user.role === 'Physician').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New User Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Healthcare User</CardTitle>
            <CardDescription>
              Create a new user account for healthcare professionals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Dr. John Smith"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.smith@hospital.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    placeholder="e.g., Physician, Nurse, Administrator"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Cardiology, Emergency, IT"
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Add User</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Healthcare Users</CardTitle>
          <CardDescription>
            View and manage all healthcare professionals and administrative users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={undefined} alt={user.name} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {user.department}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.status === 'active' ? 'default' : 'secondary'}
                      className={user.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(user.lastLogin).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleUserStatus(user.id)}>
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit Profile</DropdownMenuItem>
                        <DropdownMenuItem>View Permissions</DropdownMenuItem>
                        <DropdownMenuItem>Reset Password</DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600"
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
        </CardContent>
      </Card>
    </div>
  );
}
