import { SmartAppsManager } from './SmartAppsManager';
import { IdPManager } from './IdPManager';
import { FhirServersManager } from './FhirServersManager';
import { ScopeManager } from './ScopeManager';
import { LaunchContextManager } from './LaunchContextManager';
import { useState } from 'react';
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
    MicOff
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
                                            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                                message.type === 'user'
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
                                            className={`rounded-lg px-3 transition-all duration-300 ${
                                                isListening ? 'animate-pulse' : ''
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

function Dashboard() {
    const { profile, fetchProfile } = useAuth();
    const { t } = useTranslation();
    const handleRefresh = () => {
        fetchProfile();
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
            {/* Header Section */}
            <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
                            {t('Clinical Administration Dashboard')}
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
                    <button
                        onClick={handleRefresh}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-blue-500/20"
                    >
                        <RefreshCw className="w-5 h-5 mr-2 inline" />
                        {t('Refresh Data')}
                    </button>
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
                            <div className="text-3xl font-bold text-foreground mb-2">12</div>
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
                            <div className="text-3xl font-bold text-foreground mb-2">247</div>
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
                            <div className="text-3xl font-bold text-foreground mb-2">8</div>
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
                            <div className="text-3xl font-bold text-foreground mb-2">5</div>
                            <p className="text-sm text-muted-foreground font-medium">{t('Active providers')}</p>
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
                                    142ms
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Database Status')}</span>
                                <div className="flex items-center">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mr-2" />
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{t('Healthy')}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('System Uptime')}</span>
                                <span className="text-foreground font-semibold">99.9%</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Last Backup')}</span>
                                <div className="flex items-center">
                                    <Clock className="w-5 h-5 text-muted-foreground mr-2" />
                                    <span className="text-muted-foreground font-medium">{t('2 hours ago')}</span>
                                </div>
                            </div>
                        </div>
                    </DescriptionList>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center mb-6">
                        <div className="w-14 h-14 bg-blue-500/10 dark:bg-blue-400/20 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                            <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Recent Activity')}</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-4 px-5 bg-blue-500/5 dark:bg-blue-400/10 rounded-xl hover:bg-blue-500/10 dark:hover:bg-blue-400/20 transition-all duration-200 border border-blue-500/20 dark:border-blue-400/30">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-blue-500 dark:bg-blue-400 rounded-full mr-4 shadow-sm"></div>
                                <span className="text-foreground font-medium">{t('New user registered')}</span>
                            </div>
                            <span className="text-sm text-muted-foreground bg-muted/80 px-3 py-1 rounded-full font-medium">{t('2min ago')}</span>
                        </div>
                        <div className="flex items-center justify-between py-4 px-5 bg-emerald-500/5 dark:bg-emerald-400/10 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-emerald-400/20 transition-all duration-200 border border-emerald-500/20 dark:border-emerald-400/30">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-emerald-500 dark:bg-emerald-400 rounded-full mr-4 shadow-sm"></div>
                                <span className="text-foreground font-medium">{t('Application approved')}</span>
                            </div>
                            <span className="text-sm text-muted-foreground bg-muted/80 px-3 py-1 rounded-full font-medium">{t('5min ago')}</span>
                        </div>
                        <div className="flex items-center justify-between py-4 px-5 bg-violet-500/5 dark:bg-violet-400/10 rounded-xl hover:bg-violet-500/10 dark:hover:bg-violet-400/20 transition-all duration-200 border border-violet-500/20 dark:border-violet-400/30">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-violet-500 dark:bg-violet-400 rounded-full mr-4 shadow-sm"></div>
                                <span className="text-foreground font-medium">{t('Identity provider configured')}</span>
                            </div>
                            <span className="text-sm text-muted-foreground bg-muted/80 px-3 py-1 rounded-full font-medium">{t('1h ago')}</span>
                        </div>
                        <div className="flex items-center justify-between py-4 px-5 bg-orange-500/5 dark:bg-orange-400/10 rounded-xl hover:bg-orange-500/10 dark:hover:bg-orange-400/20 transition-all duration-200 border border-orange-500/20 dark:border-orange-400/30">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-orange-500 dark:bg-orange-400 rounded-full mr-4 shadow-sm"></div>
                                <span className="text-foreground font-medium">{t('FHIR server connected')}</span>
                            </div>
                            <span className="text-sm text-muted-foreground bg-muted/80 px-3 py-1 rounded-full font-medium">{t('3h ago')}</span>
                        </div>
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
                            <div className="text-lg font-bold text-foreground">v0.0.1-alpha</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-xl">
                        <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-muted-foreground">{t('Environment')}</div>
                            <div className="text-lg font-bold text-foreground">{t('Development')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
