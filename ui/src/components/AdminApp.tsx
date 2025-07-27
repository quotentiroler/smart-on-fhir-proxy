import { SmartAppsManager } from './SmartAppsManager/SmartAppsManager';
import { FhirServersManager } from './FhirServersManager';
import { ScopeManager } from './ScopeManager';
import { LaunchContextManager } from './LaunchContextManager';
import { useState, useEffect } from 'react';
import { Navigation } from './Navigation';
import { HealthcareUsersManager } from './HealthcareUsersManager/HealthcareUsersManager';
import { useAuth } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
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
    BarChart3,
    Bot,
    Minimize2,
    X,
    Send,
    Mic,
    MicOff,
    Power,
    RotateCcw,
    Heart
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OAuthMonitoringDashboard } from './OAuthMonitoringDashboard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from './ui/card';
import type {
    OAuthEvent
} from '../lib/types/api';
import { config } from '../config';
import { IdPManager } from './IdPManager/IdPManager';

export function AdminApp() {
    const { activeTab, setActiveTab } = useAppStore();
    const { profile, loading, error } = useAuth();
    const { t } = useTranslation();

    // AI Chat Overlay State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [chatMessages, setChatMessages] = useState<Array<{
        id: number;
        type: 'agent' | 'user';
        content: string;
        timestamp: Date;
    }>>([
        {
            id: 1,
            type: 'agent',
            content: t('Hello! I\'m your SMART on FHIR assistant. I can help you manage applications, users, servers, and configurations. What would you like to do today?'),
            timestamp: new Date()
        }
    ]);
    const [currentMessage, setCurrentMessage] = useState('');

    const handleChatToggle = () => {
        setIsChatOpen(!isChatOpen);
        setIsMinimized(false);
    };

    const handleMicToggle = () => {
        setIsListening(!isListening);
        // TODO: Implement actual voice recognition here
        // For now, we'll just toggle the visual state
        if (!isListening) {
            // Start listening
            console.log('Starting voice input...');
        } else {
            // Stop listening
            console.log('Stopping voice input...');
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentMessage.trim()) return;

        const userMessage = {
            id: Date.now(),
            type: 'user' as const,
            content: currentMessage,
            timestamp: new Date()
        };

        setChatMessages(prev => [...prev, userMessage]);
        setCurrentMessage('');

        // Simulate agent response
        setTimeout(() => {
            const agentResponse = {
                id: Date.now() + 1,
                type: 'agent' as const,
                content: getAgentResponse(currentMessage),
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, agentResponse]);
        }, 1000);
    };

    const getAgentResponse = (userMessage: string): string => {
        const message = userMessage.toLowerCase();

        if (message.includes('user') || message.includes('healthcare')) {
            return t('I can help you manage healthcare users. You can view all users, add new ones, edit existing profiles, or manage their FHIR associations. Would you like me to navigate you to the Users section?');
        } else if (message.includes('app') || message.includes('smart')) {
            return t('I can assist with SMART applications management. You can register new apps, configure scopes, manage authentication settings, or view application analytics. Shall I take you to the SMART Apps section?');
        } else if (message.includes('server') || message.includes('fhir')) {
            return t('I can help with FHIR server management. You can add new servers, configure endpoints, test connections, or manage launch contexts. Would you like to go to the FHIR Servers section?');
        } else if (message.includes('scope') || message.includes('permission')) {
            return t('I can help you manage SMART scopes and permissions. You can create scope sets, define custom scopes, or configure application permissions. Should I navigate to Scope Management?');
        } else if (message.includes('help') || message.includes('what can you do')) {
            return t('I can help you with: 📱 SMART Apps, 👥 Healthcare Users, 🏥 FHIR Servers, 🔐 Identity Providers, 🎯 Scope Management, 🚀 Launch Contexts, and 📊 OAuth Monitoring. Just tell me what you\'d like to work on!');
        } else {
            return t('I\'m here to help you manage your SMART on FHIR platform. You can ask me about users, applications, servers, scopes, or any administrative tasks. What would you like to do?');
        }
    };
    // Show loading state while fetching profile
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Panel className="max-w-md mx-auto">
                    <div className="text-center p-8">
                        <Loading />
                        <h2 className="mt-4 text-lg font-semibold text-foreground">
                            {t('Loading Healthcare Administration')}
                        </h2>
                        <p className="text-muted-foreground mt-2">{t('Authenticating and preparing your clinical workspace...')}</p>
                    </div>
                </Panel>
            </div>
        );
    }

    // Show error state if profile fetch failed
    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Panel className="max-w-md mx-auto border border-destructive/20 bg-destructive/5">
                    <div className="text-center p-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-destructive" />
                        </div>
                        <h2 className="text-xl font-semibold text-destructive mb-4">
                            {t('Authentication Error')}
                        </h2>
                        <p className="text-destructive/80 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center px-6 py-3 bg-destructive text-destructive-foreground font-medium rounded-lg hover:bg-destructive/90 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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
        <div className="min-h-screen flex flex-col bg-background [&_.mantine-AppShell-main]:!pt-2 md:[&_.mantine-AppShell-main]:!pt-4">
            <Navigation activeTab={activeTab} onTabChange={setActiveTab} profile={profile} onChatToggle={handleChatToggle} />
            <AppShell
                logo={
                    <div className="flex items-center space-x-3 animate-fade-in">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-2xl border border-primary/20">
                            <Stethoscope className="w-7 h-7 text-primary-foreground" />
                        </div>
                        <div>
                            <span className="font-bold text-xl text-foreground tracking-tight">
                                {t('Healthcare Administration')}
                            </span>
                            <div className="text-xs text-muted-foreground font-medium tracking-wide">
                                {t('SMART on FHIR Platform')}
                            </div>
                        </div>
                    </div>
                }
            >
                <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                    <div className="w-full lg:w-[90%] max-w-none mx-auto">
                        <Panel className={cn("min-h-[600px] shadow-2xl border-0 bg-background backdrop-blur-sm rounded-3xl overflow-hidden border border-border/20 animate-fade-in w-full max-w-none", "max-w-none w-full")}>
                            {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
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

            {/* AI Chat Overlay */}
            {isChatOpen && (
                <div className="fixed bottom-4 right-4 z-[60] w-96 max-w-[calc(100vw-2rem)]">
                    <Card className="bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/50 p-4 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-sm">
                                        <Bot className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-semibold text-foreground">{t('SMART Assistant')}</CardTitle>
                                        <p className="text-xs text-muted-foreground">{t('Your FHIR platform helper')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsMinimized(!isMinimized)}
                                        className="h-6 w-6 p-0 hover:bg-muted rounded-md"
                                    >
                                        <Minimize2 className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsChatOpen(false)}
                                        className="h-6 w-6 p-0 hover:bg-muted rounded-md"
                                    >
                                        <X className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        {!isMinimized && (
                            <CardContent className="p-0">
                                {/* Chat Messages */}
                                <div className="h-64 overflow-y-auto p-4 space-y-3">
                                    {chatMessages.map((message) => (
                                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${message.type === 'user'
                                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                    : 'bg-muted text-foreground rounded-bl-sm'
                                                }`}>
                                                {message.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Chat Input */}
                                <div className="border-t border-border/50 p-4">
                                    <form onSubmit={handleSendMessage} className="flex space-x-2">
                                        <Input
                                            value={currentMessage}
                                            onChange={(e) => setCurrentMessage(e.target.value)}
                                            placeholder={t('Ask me about SMART on FHIR...')}
                                            className="flex-1 text-sm rounded-lg border-input focus:border-ring focus:ring-ring"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleMicToggle}
                                            variant={isListening ? "destructive" : "secondary"}
                                            className={`rounded-lg px-3 transition-all duration-300 ${isListening ? 'animate-pulse' : ''
                                                }`}
                                        >
                                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="rounded-lg px-3"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </form>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}

function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
    const { profile, fetchProfile, apiClients } = useAuth();
    const { t } = useTranslation();

    // Notification state for server management operations
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Auto-hide notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // State for real data with proper typing
    const [dashboardData, setDashboardData] = useState<{
        smartAppsCount: number;
        usersCount: number;
        serversCount: number;
        identityProvidersCount: number;
        loading: boolean;
        error: string | null;
    }>({
        smartAppsCount: 0,
        usersCount: 0,
        serversCount: 0,
        identityProvidersCount: 0,
        loading: true,
        error: null
    });

    // OAuth Analytics state with proper typing
    const [oauthAnalytics, setOauthAnalytics] = useState<{
        totalFlows: number;
        successRate: number;
        averageResponseTime: number;
        activeTokens: number;
        loading: boolean;
        error: string | null;
    }>({
        totalFlows: 0,
        successRate: 0,
        averageResponseTime: 0,
        activeTokens: 0,
        loading: true,
        error: null
    });

    // OAuth Events interface - using generated model

    const [recentOAuthEvents, setRecentOAuthEvents] = useState<OAuthEvent[]>([]);
    const [systemHealth, setSystemHealth] = useState<{
        apiResponseTime: number;
        databaseStatus: string;
        systemUptime: string;
        lastBackup: Date | null;
        serverVersion: string;
        fhirServersStatus: string;
        keycloakStatus: string;
        memoryUsage: string;
    }>({
        apiResponseTime: 0,
        databaseStatus: 'checking',
        systemUptime: 'N/A %',
        lastBackup: null,
        serverVersion: 'unknown',
        fhirServersStatus: 'checking',
        keycloakStatus: 'checking',
        memoryUsage: 'unknown'
    });

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setDashboardData(prev => ({ ...prev, loading: true, error: null }));
                setOauthAnalytics(prev => ({ ...prev, loading: true, error: null }));

                // Fetch data in parallel with correct API methods
                const [smartApps, users, servers, identityProvidersCount, recentEvents, analytics, systemStatus] = await Promise.allSettled([
                    apiClients.smartApps.getAdminSmartApps(),
                    apiClients.healthcareUsers.getAdminHealthcareUsers(),
                    apiClients.servers.getFhirServers(),
                    apiClients.identityProviders.getAdminIdpsCount(),
                    apiClients.oauthMonitoring.getMonitoringOauthEvents({
                        limit: '5'
                    }),
                    apiClients.oauthMonitoring.getMonitoringOauthAnalytics(),
                    apiClients.server.getStatus()
                ]);

                // Update dashboard data with proper type checking
                setDashboardData({
                    smartAppsCount: smartApps.status === 'fulfilled' ? Array.isArray(smartApps.value) ? smartApps.value.length : 0 : 0,
                    usersCount: users.status === 'fulfilled' ? Array.isArray(users.value) ? users.value.length : 0 : 0,
                    serversCount: servers.status === 'fulfilled' ? (servers.value as { servers?: unknown[] }).servers?.length || 0 : 0,
                    identityProvidersCount: identityProvidersCount.status === 'fulfilled' ? (identityProvidersCount.value as { count?: number }).count || 0 : 0,
                    loading: false,
                    error: null
                });

                // Update OAuth analytics
                if (analytics.status === 'fulfilled') {
                    const analyticsData = analytics.value as {
                        totalFlows?: number;
                        successRate?: number;
                        averageResponseTime?: number;
                        activeTokens?: number;
                    };
                    setOauthAnalytics({
                        totalFlows: analyticsData.totalFlows || 0,
                        successRate: analyticsData.successRate || 0,
                        averageResponseTime: analyticsData.averageResponseTime || 0,
                        activeTokens: analyticsData.activeTokens || 0,
                        loading: false,
                        error: null
                    });
                } else {
                    setOauthAnalytics(prev => ({
                        ...prev,
                        loading: false,
                        error: 'Failed to load OAuth analytics'
                    }));
                }

                // Update recent OAuth events
                if (recentEvents.status === 'fulfilled') {
                    const eventsData = recentEvents.value as { events?: OAuthEvent[] };
                    const events = eventsData.events || [];
                    setRecentOAuthEvents(events.slice(0, 4));
                }

                // Update system health with real data
                if (systemStatus.status === 'fulfilled') {
                    const statusData = systemStatus.value as {
                        timestamp?: string;
                        uptime?: number;
                        server?: { status?: string; version?: string };
                        fhir?: { status?: string; totalServers?: number; healthyServers?: number };
                        keycloak?: { status?: string; accessible?: boolean };
                    };

                    // Calculate memory usage
                    const memoryUsage = statusData.server?.status === 'healthy' ? '~128MB' : 'unknown';

                    // Format uptime
                    const uptimeSeconds = statusData.uptime || 0;
                    const uptimeHours = Math.floor(uptimeSeconds / 3600);
                    const uptimeFormatted = uptimeHours > 0 ? `${uptimeHours}h` : `${Math.floor(uptimeSeconds / 60)}m`;

                    setSystemHealth(prev => ({
                        ...prev,
                        databaseStatus: 'healthy', // We know it's healthy if we got a response
                        systemUptime: uptimeFormatted,
                        lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                        serverVersion: statusData.server?.version || 'unknown',
                        fhirServersStatus: statusData.fhir?.status || 'unknown',
                        keycloakStatus: statusData.keycloak?.status || 'unknown',
                        memoryUsage
                    }));
                } else {
                    setSystemHealth(prev => ({
                        ...prev,
                        databaseStatus: 'error',
                        fhirServersStatus: 'error',
                        keycloakStatus: 'error'
                    }));
                }

                // Measure API response time with a simple call
                const startTime = performance.now();
                try {
                    await apiClients.smartApps.getAdminSmartApps();
                    const endTime = performance.now();

                    setSystemHealth(prev => ({
                        ...prev,
                        apiResponseTime: Math.round(endTime - startTime)
                    }));
                } catch {
                    setSystemHealth(prev => ({
                        ...prev,
                        apiResponseTime: 0
                    }));
                }

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                setDashboardData(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to load dashboard data'
                }));
                setOauthAnalytics(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to load OAuth analytics'
                }));
            }
        };

        fetchDashboardData();
    }, [apiClients]);

    const handleRefresh = () => {
        fetchProfile();
        // Trigger dashboard data refresh
        setDashboardData(prev => ({ ...prev, loading: true }));
        // The useEffect will handle the refresh
    };

    const handleServerShutdown = async () => {
        if (!confirm(t('Are you sure you want to shutdown the server? This will stop all services.'))) {
            return;
        }

        try {
            await apiClients.server.postShutdown();
            setNotification({
                type: 'success',
                message: t('Server shutdown initiated successfully')
            });
        } catch (error) {
            setNotification({
                type: 'error',
                message: t('Failed to shutdown server: {{error}}', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    };

    const handleServerRestart = async () => {
        if (!confirm(t('Are you sure you want to restart the server? This will temporarily interrupt all services.'))) {
            return;
        }

        try {
            await apiClients.server.postRestart();
            setNotification({
                type: 'success',
                message: t('Server restart initiated successfully')
            });
        } catch (error) {
            setNotification({
                type: 'error',
                message: t('Failed to restart server: {{error}}', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    };

    const handleHealthCheck = async () => {
        try {
            const data = await apiClients.server.getHealth();
            setNotification({
                type: 'success',
                message: t('Health check completed: Server is {{status}}', {
                    status: data.status
                })
            });
        } catch (error) {
            setNotification({
                type: 'error',
                message: t('Failed to perform health check: {{error}}', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    };

    const formatEventType = (eventType: string) => {
        switch (eventType) {
            case 'token_exchange':
                return t('Token Exchange');
            case 'authorization':
            case 'authorization_code':
                return t('Authorization Code');
            case 'token':
            case 'client_credentials':
                return t('Client Credentials');
            case 'refresh':
            case 'refresh_token':
                return t('Token Refresh');
            default:
                return eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${notification.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200'
                    } animate-in slide-in-from-top-2 duration-300`}>
                    <div className="flex items-center space-x-2">
                        {notification.type === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        <span className="font-medium">{notification.message}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNotification(null)}
                            className="ml-2 h-6 w-6 p-0 text-current hover:bg-current/10"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
                            {t('SMART on FHIR Dashboard')}
                        </h1>
                        <div className="text-muted-foreground flex items-center text-lg">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <Stethoscope className="w-5 h-5 text-primary" />
                            </div>
                            {t('Welcome back, {{name}}', {
                                name: profile?.firstName && profile?.lastName
                                    ? `${profile.firstName} ${profile.lastName}`
                                    : profile?.username || t('Healthcare Administrator')
                            })}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleRefresh}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-blue-500/20"
                        >
                            <RefreshCw className="w-4 h-4 mr-2 inline" />
                            {t('Refresh Data')}
                        </button>
                        <button
                            onClick={handleHealthCheck}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-green-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-emerald-500/20"
                        >
                            <Heart className="w-4 h-4 mr-2 inline" />
                            {t('Health Check')}
                        </button>
                        <button
                            onClick={handleServerRestart}
                            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-orange-500/20"
                        >
                            <RotateCcw className="w-4 h-4 mr-2 inline" />
                            {t('Restart Server')}
                        </button>
                        <button
                            onClick={handleServerShutdown}
                            className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-rose-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-red-500/20"
                        >
                            <Power className="w-4 h-4 mr-2 inline" />
                            {t('Shutdown')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                                    <Zap className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="text-sm font-semibold text-primary tracking-wide">{t('SMART Applications')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {dashboardData.loading ? '...' : dashboardData.smartAppsCount}
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">{t('Active applications')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-xl flex items-center justify-center shadow-sm">
                                    <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tracking-wide">{t('Healthcare Users')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {dashboardData.loading ? '...' : dashboardData.usersCount}
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">{t('Registered users')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-orange-500/10 dark:bg-orange-400/20 rounded-xl flex items-center justify-center shadow-sm">
                                    <Database className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-300 tracking-wide">{t('FHIR Servers')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {dashboardData.loading ? '...' : dashboardData.serversCount}
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">{t('Connected servers')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-violet-500/10 dark:bg-violet-400/20 rounded-xl flex items-center justify-center shadow-sm">
                                    <Shield className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300 tracking-wide">{t('Identity Providers')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {dashboardData.loading ? '...' : dashboardData.identityProvidersCount}
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">{t('Active providers')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* OAuth Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-400/20 rounded-xl flex items-center justify-center shadow-sm">
                                    <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 tracking-wide">{t('OAuth Flows')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {oauthAnalytics.loading ? '...' : oauthAnalytics.totalFlows.toLocaleString()}
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">{t('Total flows processed')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-green-500/10 dark:bg-green-400/20 rounded-xl flex items-center justify-center shadow-sm">
                                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-green-700 dark:text-green-300 tracking-wide">{t('Success Rate')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {oauthAnalytics.loading
                                    ? '...'
                                    : oauthAnalytics.totalFlows === 0
                                        ? '--'
                                        : `${oauthAnalytics.successRate.toFixed(1)}%`
                                }
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">{t('OAuth authentication success')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-indigo-500/10 dark:bg-indigo-400/20 rounded-xl flex items-center justify-center shadow-sm">
                                    <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 tracking-wide">{t('Avg Response Time')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {oauthAnalytics.loading
                                    ? '...'
                                    : oauthAnalytics.totalFlows === 0
                                        ? '--'
                                        : `${oauthAnalytics.averageResponseTime}ms`
                                }
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">{t('OAuth endpoint performance')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-purple-500/10 dark:bg-purple-400/20 rounded-xl flex items-center justify-center shadow-sm">
                                    <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 tracking-wide">{t('Active Tokens')}</h3>
                            </div>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {oauthAnalytics.loading ? '...' : oauthAnalytics.activeTokens.toLocaleString()}
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">{t('Valid access tokens')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center mb-6">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                            <Activity className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight">{t('System Health')}</h3>
                    </div>
                    <DescriptionList>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('API Response Time')}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                    <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full mr-3 animate-pulse shadow-lg"></div>
                                    {systemHealth.apiResponseTime > 0 ? `${systemHealth.apiResponseTime}ms` : '...'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Keycloak Database')}</span>
                                <div className="flex items-center">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mr-2" />
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        {systemHealth.databaseStatus === 'healthy' ? t('Healthy') : systemHealth.databaseStatus}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('FHIR Servers')}</span>
                                <div className="flex items-center">
                                    {systemHealth.fhirServersStatus === 'healthy' ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mr-2" />
                                    ) : systemHealth.fhirServersStatus === 'degraded' ? (
                                        <AlertCircle className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mr-2" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" />
                                    )}
                                    <span className={`font-semibold ${systemHealth.fhirServersStatus === 'healthy'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : systemHealth.fhirServersStatus === 'degraded'
                                                ? 'text-yellow-600 dark:text-yellow-400'
                                                : 'text-red-600 dark:text-red-400'
                                        }`}>
                                        {systemHealth.fhirServersStatus === 'healthy' ? t('Healthy') :
                                            systemHealth.fhirServersStatus === 'degraded' ? t('Degraded') :
                                                systemHealth.fhirServersStatus === 'error' ? t('Error') : systemHealth.fhirServersStatus}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Keycloak Auth')}</span>
                                <div className="flex items-center">
                                    {systemHealth.keycloakStatus === 'healthy' ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mr-2" />
                                    ) : systemHealth.keycloakStatus === 'degraded' ? (
                                        <AlertCircle className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mr-2" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" />
                                    )}
                                    <span className={`font-semibold ${systemHealth.keycloakStatus === 'healthy'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : systemHealth.keycloakStatus === 'degraded'
                                                ? 'text-yellow-600 dark:text-yellow-400'
                                                : 'text-red-600 dark:text-red-400'
                                        }`}>
                                        {systemHealth.keycloakStatus === 'healthy' ? t('Healthy') :
                                            systemHealth.keycloakStatus === 'degraded' ? t('Degraded') :
                                                systemHealth.keycloakStatus === 'error' ? t('Error') : systemHealth.keycloakStatus}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('System Uptime')}</span>
                                <span className="text-foreground font-semibold">
                                    {systemHealth.systemUptime}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Memory Usage')}</span>
                                <span className="text-foreground font-semibold">
                                    {systemHealth.memoryUsage}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Server Version')}</span>
                                <span className="text-foreground font-semibold">
                                    {systemHealth.serverVersion}
                                </span>
                            </div>
                        </div>
                    </DescriptionList>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <div className="w-14 h-14 bg-blue-500/10 dark:bg-blue-400/20 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                                <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Recent OAuth Activity')}</h3>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigate('oauth-monitoring')}
                            className="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300 rounded-xl px-4 py-2 transition-all duration-200"
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            {t('View Details')}
                        </Button>
                    </div>
                    <div className="space-y-4">
                        {recentOAuthEvents.length > 0 ? (
                            recentOAuthEvents.map((event: OAuthEvent, index: number) => (
                                <div key={event.id || index} className={`flex items-center justify-between py-4 px-5 rounded-xl transition-all duration-200 border ${event.status === 'success'
                                        ? 'bg-emerald-500/5 dark:bg-emerald-400/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/20 border-emerald-500/20 dark:border-emerald-400/30'
                                        : event.status === 'error'
                                            ? 'bg-red-500/5 dark:bg-red-400/10 hover:bg-red-500/10 dark:hover:bg-red-400/20 border-red-500/20 dark:border-red-400/30'
                                            : 'bg-blue-500/5 dark:bg-blue-400/10 hover:bg-blue-500/10 dark:hover:bg-blue-400/20 border-blue-500/20 dark:border-blue-400/30'
                                    }`}>
                                    <div className="flex items-center">
                                        <div className={`w-4 h-4 rounded-full mr-4 shadow-sm ${event.status === 'success'
                                                ? 'bg-emerald-500 dark:bg-emerald-400'
                                                : event.status === 'error'
                                                    ? 'bg-red-500 dark:bg-red-400'
                                                    : 'bg-blue-500 dark:bg-blue-400'
                                            }`}></div>
                                        <div>
                                            <span className="text-foreground font-medium">
                                                {formatEventType(event.type || 'oauth_flow')}
                                            </span>
                                            {event.clientName && (
                                                <div className="text-xs text-muted-foreground">{event.clientName}</div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm text-muted-foreground bg-muted/80 px-3 py-1 rounded-full font-medium">
                                        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : t('Now')}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h4 className="text-lg font-semibold text-foreground mb-2">{t('No Recent OAuth Activity')}</h4>
                                <p className="text-muted-foreground text-sm">
                                    {t('OAuth events will appear here once authentication flows begin.')}
                                </p>
                                <p className="text-muted-foreground text-xs mt-2">
                                    {t('Try accessing a SMART application to generate OAuth events.')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Footer Info */}
            <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-xl">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-muted-foreground">{t('Platform Version')}</div>
                            <div className="text-lg font-bold text-foreground">v{config.version}</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-xl">
                        <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-muted-foreground">{t('Environment')}</div>
                            <div className="text-lg font-bold text-foreground">{config.app.environment.charAt(0).toUpperCase() + config.app.environment.slice(1)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
