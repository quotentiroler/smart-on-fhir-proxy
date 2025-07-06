import React from 'react';
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
    <nav className="bg-white/80 backdrop-blur-2xl border-b border-gray-200/40 shadow-2xl sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
          {/* Logo and Dashboard Button */}
          <div className="flex items-center space-x-3 flex-shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
            <div className="hidden md:block">
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => onTabChange('dashboard')}
                className={`group flex items-center space-x-2 h-9 px-3 rounded-lg transition-all duration-300 ${
                  activeTab === 'dashboard' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'hover:bg-gray-100/80 text-gray-700 hover:shadow-md'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${
                  activeTab === 'dashboard' ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                <span className="text-sm font-semibold whitespace-nowrap">{t('Dashboard')}</span>
              </Button>
            </div>
          </div>
          
          {/* Navigation - Takes available space */}
          <div className="flex-1 flex justify-center px-2 lg:px-4 min-w-0 overflow-hidden">
            {/* Desktop Navigation */}
            <NavigationMenu className="hidden lg:block w-full">
              <NavigationMenuList className="flex flex-wrap justify-center gap-1">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <NavigationMenuItem key={tab.id}>
                      <Button
                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                        onClick={() => onTabChange(tab.id)}
                        className={`group flex items-center space-x-1 h-9 px-2 lg:px-3 rounded-lg transition-all duration-300 ${
                          activeTab === tab.id 
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                            : 'hover:bg-gray-100/80 text-gray-700 hover:shadow-md'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 flex-shrink-0 ${
                          activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'
                        }`} />
                        <span className="hidden xl:block text-xs font-semibold whitespace-nowrap">{tab.label}</span>
                      </Button>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>

            {/* Mobile Navigation Dropdown */}
            <div className="lg:hidden w-full max-w-xs">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full flex items-center justify-center space-x-2 h-9 px-3 rounded-lg hover:bg-gray-100/80 transition-all duration-300"
                  >
                    <div className="flex items-center space-x-2">
                      {activeTab === 'dashboard' ? (
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center">
                          <LayoutDashboard className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        tabs.find(tab => tab.id === activeTab)?.icon && (
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center">
                            {React.createElement(tabs.find(tab => tab.id === activeTab)!.icon, {
                              className: "w-3 h-3 text-white"
                            })}
                          </div>
                        )
                      )}
                      <div className="hidden sm:block text-left">
                        <span className="text-sm font-semibold text-gray-900 block leading-tight">
                          {activeTab === 'dashboard' ? t('Dashboard') : tabs.find(tab => tab.id === activeTab)?.label}
                        </span>
                        <p className="text-xs text-gray-500 leading-tight">
                          {activeTab === 'dashboard' ? t('Overview') : tabs.find(tab => tab.id === activeTab)?.description}
                        </p>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-64 rounded-2xl shadow-2xl border border-gray-200/60 bg-white/95 backdrop-blur-xl" 
                  align="center"
                >
                  <div className="p-2 space-y-1">
                    {/* Dashboard item for mobile */}
                    <DropdownMenuItem
                      onClick={() => onTabChange('dashboard')}
                      className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                        activeTab === 'dashboard'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                          : 'hover:bg-gray-100/80 text-gray-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                        activeTab === 'dashboard'
                          ? 'bg-white/20'
                          : 'bg-gray-100'
                      }`}>
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{t('Dashboard')}</div>
                        <div className={`text-xs ${
                          activeTab === 'dashboard' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {t('Overview')}
                        </div>
                      </div>
                    </DropdownMenuItem>
                    {tabs.map((tab) => {
                      const IconComponent = tab.icon;
                      return (
                        <DropdownMenuItem
                          key={tab.id}
                          onClick={() => onTabChange(tab.id)}
                          className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                            activeTab === tab.id
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                              : 'hover:bg-gray-100/80 text-gray-700'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                            activeTab === tab.id
                              ? 'bg-white/20'
                              : 'bg-gray-100'
                          }`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{tab.label}</div>
                            <div className={`text-xs ${
                              activeTab === tab.id ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {tab.description}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* User Profile - Compact */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <div className="hidden xl:flex items-center">
              <Badge 
                variant="secondary" 
                className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-2 py-1 rounded-full border border-green-200/60 flex items-center space-x-1 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Sparkles className="w-3 h-3 animate-pulse" />
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full ring-2 ring-gray-200/60 hover:ring-blue-400/60 transition-all duration-300 hover:shadow-lg flex-shrink-0">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarImage src={undefined} alt={getDisplayName(profile)} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs">
                      {getInitials(profile)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 rounded-2xl shadow-2xl border border-gray-200/60 bg-white/95 backdrop-blur-xl" align="end">
                <div className="flex items-center justify-start gap-3 p-4 bg-gradient-to-r from-gray-50/80 to-blue-50/80 rounded-t-2xl backdrop-blur-sm">
                  <Avatar className="h-12 w-12 ring-2 ring-blue-200/60 shadow-lg">
                    <AvatarImage src={undefined} alt={getDisplayName(profile)} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold">
                      {getInitials(profile)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="font-bold text-gray-900 text-base">
                      {getDisplayName(profile)}
                    </p>
                    <p className="text-sm text-gray-600 truncate max-w-[200px] font-medium">
                      {profile.email || t('Profile')}
                    </p>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                      <span className="text-xs text-green-600 font-semibold">{t('Online')}</span>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-gray-200/60" />
                <DropdownMenuItem className="flex items-center space-x-3 p-3 hover:bg-blue-50/80 cursor-pointer rounded-xl mx-2 my-1 transition-all duration-300 transform hover:scale-105">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="font-semibold text-gray-800">{t('Profile Settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center space-x-3 p-3 hover:bg-blue-50/80 cursor-pointer rounded-xl mx-2 my-1 transition-all duration-300 transform hover:scale-105">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="font-semibold text-gray-800">{t('Preferences')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200/60" />
                <div className="px-2 py-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 py-2">
                    {t('Language')}
                  </p>
                  {availableLanguages.map((language) => (
                    <DropdownMenuItem
                      key={language.code}
                      onClick={() => handleLanguageChange(language.code)}
                      className="flex items-center justify-between space-x-3 p-3 hover:bg-blue-50/80 cursor-pointer rounded-xl mx-1 my-1 transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Languages className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="flex items-center space-x-2 font-medium text-gray-800">
                          <span className="text-lg">{language.flag}</span>
                          <span>{language.name}</span>
                        </span>
                      </div>
                      {currentLanguage === language.code && (
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator className="bg-gray-200/60" />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 p-3 hover:bg-red-50/80 text-red-600 cursor-pointer rounded-xl mx-2 my-1 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <LogOut className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="font-semibold">{t('Sign out')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
