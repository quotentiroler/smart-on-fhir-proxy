import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from '@/components/ui/navigation-menu';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import type { GetAuthUserinfo200Response } from '../lib/api-client';
import { 
  LayoutDashboard, 
  Zap, 
  Users, 
  Shield, 
  LogOut, 
  User, 
  Settings,
  Heart,
  Sparkles,
  Server,
  Languages,
  Check,
  Target,
  Play,
  BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: GetAuthUserinfo200Response;
}

export function Navigation({ activeTab, onTabChange, profile }: NavigationProps) {
  const logout = useAuthStore((state) => state.logout);
  const { language: currentLanguage, setLanguage } = useAppStore();
  const { t } = useTranslation();

  const handleSignOut = () => {
    logout();
  };

  const handleLanguageChange = async (languageCode: string) => {
    console.debug('🔄 Navigation: Language change requested to:', languageCode);
    console.debug('🔄 Navigation: Current language:', currentLanguage);
    try {
      await setLanguage(languageCode);
      console.debug('✅ Navigation: Language change completed');
    } catch (error) {
      console.error('❌ Navigation: Language change failed:', error);
    }
  };

  const availableLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
  ];

  const getDisplayName = (profile: GetAuthUserinfo200Response) => {
    // Try firstName + lastName first (most reliable)
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    if (profile.firstName) {
      return profile.firstName;
    }
    
    // Try username
    if (profile.username) {
      return profile.username;
    }
    
    // Try email without domain
    if (profile.email) {
      return profile.email.split('@')[0];
    }
    
    // Final fallback
    return t('User');
  };

  const getInitials = (profile: GetAuthUserinfo200Response) => {
    const name = getDisplayName(profile);
    return name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const tabs = [
    { 
      id: 'dashboard', 
      label: t('Dashboard'), 
      description: t('Overview'),
      icon: LayoutDashboard
    },
    { 
      id: 'smart-apps', 
      label: t('SMART Apps'), 
      description: t('App Management'),
      icon: Zap
    },
    { 
      id: 'users', 
      label: t('Users'), 
      description: t('User Management'),
      icon: Users
    },
    { 
      id: 'fhir-servers', 
      label: t('FHIR Servers'), 
      description: t('Server Management'),
      icon: Server
    },
    { 
      id: 'idp', 
      label: t('Identity Providers'), 
      description: t('IdP Management'),
      icon: Shield
    },
    { 
      id: 'scopes', 
      label: t('Scope Management'), 
      description: t('SMART Scopes'),
      icon: Target
    },
    { 
      id: 'launch-context', 
      label: t('Launch Context'), 
      description: t('Context Configuration'),
      icon: Play
    },
    { 
      id: 'oauth-monitoring', 
      label: t('OAuth Monitoring'), 
      description: t('Flow Analytics'),
      icon: BarChart3
    },
  ];

  return (
    <nav className="bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <div className="flex items-center space-x-3 lg:space-x-6 min-w-0 flex-1">
            <div className="flex-shrink-0 flex items-center space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('Healthcare Admin')}
                </h1>
                <p className="text-xs text-gray-500">{t('SMART on FHIR Platform')}</p>
              </div>
            </div>
            
            <NavigationMenu className="hidden md:block min-w-0 flex-1">
              <NavigationMenuList className="space-x-1 lg:space-x-2">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <NavigationMenuItem key={tab.id}>
                      <Button
                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center space-x-2 h-10 lg:h-12 px-2 lg:px-4 rounded-xl transition-all duration-300 ${
                          activeTab === tab.id 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700' 
                            : 'hover:bg-gray-100 text-gray-700 hover:shadow-md'
                        }`}
                      >
                        <IconComponent className="w-4 h-4 flex-shrink-0" />
                        <div className="hidden 2xl:flex flex-col items-start">
                          <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
                          <span className={`text-xs whitespace-nowrap ${
                            activeTab === tab.id ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {tab.description}
                          </span>
                        </div>
                        <span className="2xl:hidden text-sm font-medium whitespace-nowrap">{tab.label}</span>
                      </Button>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="hidden 2xl:flex items-center">
              <Badge 
                variant="secondary" 
                className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-3 py-1.5 rounded-full border border-green-200 flex items-center space-x-2 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <Sparkles className="w-3 h-3" />
                <span className="text-xs font-medium whitespace-nowrap">{t('Healthcare System')}</span>
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-12 rounded-full ring-2 ring-gray-200 hover:ring-blue-400 transition-all duration-300 hover:shadow-lg flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={undefined} alt={getDisplayName(profile)} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold">
                      {getInitials(profile)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-xl shadow-xl border border-gray-200 bg-white/95 backdrop-blur-sm" align="end">
                <div className="flex items-center justify-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-xl">
                  <Avatar className="h-12 w-12 ring-2 ring-blue-200">
                    <AvatarImage src={undefined} alt={getDisplayName(profile)} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      {getInitials(profile)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="font-semibold text-gray-900">
                      {getDisplayName(profile)}
                    </p>
                    <p className="text-sm text-gray-600 truncate max-w-[180px]">
                      {profile.email || t('Profile')}
                    </p>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">{t('Online')}</span>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center space-x-3 p-3 hover:bg-blue-50 cursor-pointer rounded-lg mx-1 transition-colors duration-200">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{t('Profile Settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center space-x-3 p-3 hover:bg-blue-50 cursor-pointer rounded-lg mx-1 transition-colors duration-200">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span>{t('Preferences')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1">
                    {t('Language')}
                  </p>
                  {availableLanguages.map((language) => (
                    <DropdownMenuItem
                      key={language.code}
                      onClick={() => handleLanguageChange(language.code)}
                      className="flex items-center justify-between space-x-3 p-3 hover:bg-blue-50 cursor-pointer rounded-lg mx-1 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <Languages className="w-4 h-4 text-gray-500" />
                        <span className="flex items-center space-x-2">
                          <span className="text-lg">{language.flag}</span>
                          <span>{language.name}</span>
                        </span>
                      </div>
                      {currentLanguage === language.code && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 p-3 hover:bg-red-50 text-red-600 cursor-pointer rounded-lg mx-1 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('Sign out')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
