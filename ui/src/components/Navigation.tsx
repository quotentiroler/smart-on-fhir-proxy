import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from '@/components/ui/navigation-menu';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '../stores/authStore';
import type { UserProfile } from '../lib/api';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: UserProfile;
}

export function Navigation({ activeTab, onTabChange, profile }: NavigationProps) {
  const logout = useAuthStore((state) => state.logout);

  const handleSignOut = () => {
    logout();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', description: 'Overview' },
    { id: 'smart-apps', label: 'SMART Apps', description: 'App Management' },
    { id: 'users', label: 'Users', description: 'User Management' },
    { id: 'idp', label: 'Identity Providers', description: 'IdP Management' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-blue-600">Healthcare Admin</h1>
            </div>
            
            <NavigationMenu>
              <NavigationMenuList>
                {tabs.map((tab) => (
                  <NavigationMenuItem key={tab.id}>
                    <Button
                      variant={activeTab === tab.id ? 'default' : 'ghost'}
                      onClick={() => onTabChange(tab.id)}
                      className="flex flex-col items-center h-auto py-2 px-4"
                    >
                      <span className="text-sm font-medium">{tab.label}</span>
                      <span className="text-xs text-gray-500">{tab.description}</span>
                    </Button>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Healthcare Admin System
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={undefined} alt={profile.name?.[0]?.text || profile.username || 'User'} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {getInitials(profile.name?.[0]?.text || profile.username)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">
                      {profile.name?.[0]?.text || profile.username || 'User'}
                    </p>
                    <p className="w-[200px] truncate text-xs text-gray-600">
                      {profile.email || `${profile.resourceType} Profile`}
                    </p>
                  </div>
                </div>
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
