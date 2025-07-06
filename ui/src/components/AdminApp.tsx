import { SmartAppsManager } from './SmartAppsManager';
import { IdPManager } from './IdPManager';
import { FhirServersManager } from './FhirServersManager';
import { ScopeManager } from './ScopeManager';
import { LaunchContextManager } from './LaunchContextManager';
import { useState } from 'react';
import { Navigation } from './Navigation';
import { HealthcareUsersManager } from './HealthcareUsersManager';
import { useAuth } from '../stores/authStore';
import { LoginForm } from './LoginForm';
import { cn } from '../lib/utils';
import {
    AppShell,
    Panel,
    Loading,
    DescriptionList
} from '@medplum/react';
import {
    Activity,
    Users,
    Shield,
    Stethoscope,
    Zap,
    RefreshCw,
    Database,
    CheckCircle,
    AlertCircle,
    Clock,
    BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OAuthMonitoringDashboard } from './OAuthMonitoringDashboard';

export function AdminApp() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { profile, loading, error } = useAuth();
    const { t } = useTranslation();
    // Show loading state while fetching profile
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Panel className="max-w-md mx-auto">
                    <div className="text-center p-8">
                        <Loading />
                        <h2 className="mt-4 text-lg font-semibold text-gray-800">
                            {t('Loading Healthcare Administration')}
                        </h2>
                        <p className="text-gray-600 mt-2">{t('Authenticating and preparing your clinical workspace...')}</p>
                    </div>
                </Panel>
            </div>
        );
    }

    // Show error state if profile fetch failed
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Panel className="max-w-md mx-auto border border-red-200 bg-red-50">
                    <div className="text-center p-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-red-900 mb-4">
                            {t('Authentication Error')}
                        </h2>
                        <p className="text-red-700 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t('Retry Authentication')}
                        </button>
                    </div>
                </Panel>
            </div>
        );
    }

    // Show login prompt if no profile (not authenticated)
    if (!profile) {
        return <LoginForm />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <AppShell
                logo={
                    <div className="flex items-center space-x-3 animate-fade-in">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl border border-white/20">
                            <Stethoscope className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">
                                {t('Healthcare Administration')}
                            </span>
                            <div className="text-xs text-gray-600 font-medium tracking-wide">
                                {t('SMART on FHIR Platform')}
                            </div>
                        </div>
                    </div>
                }
            >
                <Navigation activeTab={activeTab} onTabChange={setActiveTab} profile={profile} />
                <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                    <div className="w-full lg:w-[90%] max-w-none mx-auto">
                        <Panel className={cn("min-h-[600px] shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden border border-white/20 animate-fade-in w-full max-w-none", "max-w-none w-full")}>
                            {activeTab === 'dashboard' && <Dashboard />}
                            {activeTab === 'smart-apps' && <SmartAppsManager />}
                            {activeTab === 'users' && <HealthcareUsersManager />}
                            {activeTab === 'fhir-servers' && <FhirServersManager />}
                            {activeTab === 'idp' && <IdPManager />}
                            {activeTab === 'scopes' && <ScopeManager />}
                            {activeTab === 'launch-context' && <LaunchContextManager />}
                            {activeTab === 'oauth-monitoring' && <OAuthMonitoringDashboard />}
                        </Panel>
                    </div>
                </div>
            </AppShell>
        </div>
    );
}

function Dashboard() {
    const { profile, fetchProfile } = useAuth();
    const { t } = useTranslation();
    const handleRefresh = () => {
        fetchProfile();
    };

    return (
        <div className="p-8 space-y-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100/50 shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
                            {t('Clinical Administration Dashboard')}
                        </h1>
                        <div className="text-gray-600 flex items-center text-lg">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <Stethoscope className="w-5 h-5 text-blue-600" />
                            </div>
                            {t('Welcome back, {{name}}', {
                                name: profile?.firstName && profile?.lastName
                                    ? `${profile.firstName} ${profile.lastName}`
                                    : profile?.username || t('Healthcare Administrator')
                            })}
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
                    >
                        <RefreshCw className="w-5 h-5 mr-2 inline" />
                        {t('Refresh Data')}
                    </button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                                    <Zap className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="text-sm font-semibold text-blue-800 tracking-wide">{t('SMART Applications')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-blue-900 mb-2">12</div>
                            <p className="text-sm text-blue-700 font-medium">{t('Active applications')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                                    <Users className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="text-sm font-semibold text-green-800 tracking-wide">{t('Healthcare Users')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-green-900 mb-2">247</div>
                            <p className="text-sm text-green-700 font-medium">{t('Registered users')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                                    <Database className="w-6 h-6 text-orange-600" />
                                </div>
                                <h3 className="text-sm font-semibold text-orange-800 tracking-wide">{t('FHIR Servers')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-orange-900 mb-2">8</div>
                            <p className="text-sm text-orange-700 font-medium">{t('Connected servers')}</p>
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
                                <h3 className="text-sm font-semibold text-purple-800 tracking-wide">{t('Identity Providers')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-purple-900 mb-2">5</div>
                            <p className="text-sm text-purple-700 font-medium">{t('Active providers')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center mb-6">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                            <Activity className="w-7 h-7 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('System Health')}</h3>
                    </div>
                    <DescriptionList>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm font-medium text-gray-700">{t('API Response Time')}</span>
                                <span className="text-green-600 font-semibold flex items-center">
                                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse shadow-lg"></div>
                                    142ms
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm font-medium text-gray-700">{t('Database Status')}</span>
                                <div className="flex items-center">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                                    <span className="text-green-600 font-semibold">{t('Healthy')}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm font-medium text-gray-700">{t('System Uptime')}</span>
                                <span className="text-gray-900 font-semibold">99.9%</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm font-medium text-gray-700">{t('Last Backup')}</span>
                                <div className="flex items-center">
                                    <Clock className="w-5 h-5 text-gray-500 mr-2" />
                                    <span className="text-gray-700 font-medium">{t('2 hours ago')}</span>
                                </div>
                            </div>
                        </div>
                    </DescriptionList>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center mb-6">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                            <BarChart3 className="w-7 h-7 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('Recent Activity')}</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-4 px-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 border border-blue-200/50">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mr-4 shadow-sm"></div>
                                <span className="text-gray-700 font-medium">{t('New user registered')}</span>
                            </div>
                            <span className="text-sm text-gray-500 bg-white/80 px-3 py-1 rounded-full font-medium">{t('2min ago')}</span>
                        </div>
                        <div className="flex items-center justify-between py-4 px-5 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-200/50">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full mr-4 shadow-sm"></div>
                                <span className="text-gray-700 font-medium">{t('Application approved')}</span>
                            </div>
                            <span className="text-sm text-gray-500 bg-white/80 px-3 py-1 rounded-full font-medium">{t('5min ago')}</span>
                        </div>
                        <div className="flex items-center justify-between py-4 px-5 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-200 border border-purple-200/50">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mr-4 shadow-sm"></div>
                                <span className="text-gray-700 font-medium">{t('Identity provider configured')}</span>
                            </div>
                            <span className="text-sm text-gray-500 bg-white/80 px-3 py-1 rounded-full font-medium">{t('1h ago')}</span>
                        </div>
                        <div className="flex items-center justify-between py-4 px-5 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all duration-200 border border-orange-200/50">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full mr-4 shadow-sm"></div>
                                <span className="text-gray-700 font-medium">{t('FHIR server connected')}</span>
                            </div>
                            <span className="text-sm text-gray-500 bg-white/80 px-3 py-1 rounded-full font-medium">{t('3h ago')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Footer Info */}
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-600">{t('Platform Version')}</div>
                            <div className="text-lg font-bold text-gray-900">v0.0.1-alpha</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-600">{t('Environment')}</div>
                            <div className="text-lg font-bold text-gray-900">{t('Development')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
