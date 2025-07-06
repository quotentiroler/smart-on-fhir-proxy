import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Timer, 
  AlertTriangle, 
  Play, 
  Pause, 
  Download, 
  Search,
  Server,
  Database,
  Network
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OAuthFlowEvent {
  id: string;
  timestamp: string;
  type: 'authorization' | 'token' | 'refresh' | 'error' | 'revoke';
  status: 'success' | 'error' | 'pending' | 'warning';
  clientId: string;
  clientName: string;
  userId?: string;
  userName?: string;
  scopes: string[];
  grantType: string;
  responseTime: number;
  ipAddress: string;
  userAgent: string;
  errorMessage?: string;
  errorCode?: string;
  tokenType?: string;
  expiresIn?: number;
  refreshToken?: boolean;
  fhirContext?: {
    patient?: string;
    encounter?: string;
    location?: string;
  };
}

interface OAuthAnalytics {
  totalFlows: number;
  successRate: number;
  averageResponseTime: number;
  activeTokens: number;
  topClients: Array<{
    clientId: string;
    clientName: string;
    count: number;
    successRate: number;
  }>;
  flowsByType: Record<string, number>;
  errorsByType: Record<string, number>;
  hourlyStats: Array<{
    hour: string;
    success: number;
    error: number;
    total: number;
  }>;
}

export function OAuthMonitoringDashboard() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<OAuthFlowEvent[]>([]);
  const [analytics, setAnalytics] = useState<OAuthAnalytics | null>(null);
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data generation for demonstration
  const generateMockData = () => {
    const mockEvents: OAuthFlowEvent[] = [];
    const clientApps = [
      { id: 'epic-app-1', name: 'Epic MyChart' },
      { id: 'cerner-app-2', name: 'Cerner PowerChart' },
      { id: 'smart-app-3', name: 'Clinical Decision Support' },
      { id: 'research-app-4', name: 'Population Health Analytics' },
      { id: 'mobile-app-5', name: 'Provider Mobile App' }
    ];

    const flowTypes = ['authorization_code', 'client_credentials', 'refresh_token'];
    const eventTypes: Array<'authorization' | 'token' | 'refresh' | 'error' | 'revoke'> = 
      ['authorization', 'token', 'refresh', 'error', 'revoke'];

    // Generate events for the last 24 hours
    for (let i = 0; i < 150; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      const client = clientApps[Math.floor(Math.random() * clientApps.length)];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const status = eventType === 'error' ? 'error' : 
                    Math.random() > 0.85 ? 'error' : 
                    Math.random() > 0.95 ? 'warning' : 'success';

      const event: OAuthFlowEvent = {
        id: `event-${i}`,
        timestamp: timestamp.toISOString(),
        type: eventType,
        status,
        clientId: client.id,
        clientName: client.name,
        userId: status !== 'error' ? `user-${Math.floor(Math.random() * 100)}` : undefined,
        userName: status !== 'error' ? `Dr. ${['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][Math.floor(Math.random() * 5)]}` : undefined,
        scopes: [
          'patient/*.read',
          'user/*.read',
          'launch/patient',
          'fhirUser',
          'openid',
          'profile'
        ].slice(0, Math.floor(Math.random() * 6) + 1),
        grantType: flowTypes[Math.floor(Math.random() * flowTypes.length)],
        responseTime: Math.floor(Math.random() * 2000) + 100,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        errorMessage: status === 'error' ? 'Invalid client credentials' : undefined,
        errorCode: status === 'error' ? 'invalid_client' : undefined,
        tokenType: status === 'success' ? 'Bearer' : undefined,
        expiresIn: status === 'success' ? 3600 : undefined,
        refreshToken: status === 'success' && Math.random() > 0.5,
        fhirContext: status === 'success' ? {
          patient: `Patient/${Math.floor(Math.random() * 1000)}`,
          encounter: Math.random() > 0.7 ? `Encounter/${Math.floor(Math.random() * 500)}` : undefined,
          location: Math.random() > 0.8 ? `Location/${Math.floor(Math.random() * 50)}` : undefined
        } : undefined
      };

      mockEvents.push(event);
    }

    // Sort by timestamp (newest first)
    mockEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Generate analytics
    const totalFlows = mockEvents.length;
    const successfulFlows = mockEvents.filter(e => e.status === 'success').length;
    const successRate = (successfulFlows / totalFlows) * 100;
    const averageResponseTime = mockEvents.reduce((sum, e) => sum + e.responseTime, 0) / totalFlows;
    const activeTokens = mockEvents.filter(e => e.status === 'success' && e.tokenType).length;

    const clientStats = new Map<string, { name: string; count: number; successful: number }>();
    mockEvents.forEach(event => {
      if (!clientStats.has(event.clientId)) {
        clientStats.set(event.clientId, { name: event.clientName, count: 0, successful: 0 });
      }
      const stat = clientStats.get(event.clientId)!;
      stat.count++;
      if (event.status === 'success') stat.successful++;
    });

    const topClients = Array.from(clientStats.entries())
      .map(([clientId, stat]) => ({
        clientId,
        clientName: stat.name,
        count: stat.count,
        successRate: (stat.successful / stat.count) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const flowsByType = mockEvents.reduce((acc, event) => {
      acc[event.grantType] = (acc[event.grantType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByType = mockEvents
      .filter(e => e.status === 'error')
      .reduce((acc, event) => {
        const errorType = event.errorCode || 'unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Generate hourly stats for the last 24 hours
    const hourlyStats = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - (23 - i), 0, 0, 0);
      const hourEvents = mockEvents.filter(e => {
        const eventTime = new Date(e.timestamp);
        return eventTime.getHours() === hour.getHours() && 
               eventTime.getDate() === hour.getDate();
      });
      
      return {
        hour: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        success: hourEvents.filter(e => e.status === 'success').length,
        error: hourEvents.filter(e => e.status === 'error').length,
        total: hourEvents.length
      };
    });

    const mockAnalytics: OAuthAnalytics = {
      totalFlows,
      successRate,
      averageResponseTime,
      activeTokens,
      topClients,
      flowsByType,
      errorsByType,
      hourlyStats
    };

    setEvents(mockEvents);
    setAnalytics(mockAnalytics);
    setIsLoading(false);
  };

  useEffect(() => {
    generateMockData();
    
    if (isRealTimeActive) {
      const interval = setInterval(() => {
        generateMockData();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [isRealTimeActive]);

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
                         event.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('Loading OAuth monitoring data...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
              {t('OAuth Flow Monitoring')}
            </h1>
            <div className="text-gray-600 text-lg flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              {t('Real-time monitoring and analytics for OAuth 2.0 flows')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={isRealTimeActive ? "default" : "outline"}
              onClick={() => setIsRealTimeActive(!isRealTimeActive)}
              className={`px-6 py-3 font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20 ${
                isRealTimeActive 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isRealTimeActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isRealTimeActive ? t('Pause') : t('Resume')} {t('Real-time')}
            </Button>
            <Button
              variant="outline"
              onClick={generateMockData}
              className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-gray-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Refresh')}
            </Button>
            <Button
              variant="outline"
              className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-gray-200"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('Export')}
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Status */}
      {isRealTimeActive && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200/50 shadow-lg">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mr-4 shadow-sm">
              <Activity className="h-5 w-5 text-green-600 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-900 mb-1">{t('Real-time Monitoring Active')}</h3>
              <p className="text-green-800 font-medium">{t('Data refreshes every 30 seconds. OAuth events are being tracked live.')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('OAuth Analytics Dashboard')}</h3>
              <p className="text-gray-600 font-medium">{t('Monitor OAuth flows, tokens, and system performance')}</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100/50 rounded-2xl p-2">
              <TabsTrigger value="overview" className="rounded-xl font-medium">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="flows" className="rounded-xl font-medium">{t('OAuth Flows')}</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl font-medium">{t('Analytics')}</TabsTrigger>
              <TabsTrigger value="monitoring" className="rounded-xl font-medium">{t('System Health')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                          <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-blue-800 tracking-wide">{t('Total Flows')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-blue-900 mb-2">{analytics?.totalFlows.toLocaleString()}</div>
                      <p className="text-sm text-blue-700 font-medium">{t('Last 24 hours')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-green-800 tracking-wide">{t('Success Rate')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-green-900 mb-2">
                        {analytics?.successRate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-green-700 font-medium">
                        <span className="text-green-600">↗ 2.1%</span> {t('from yesterday')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                          <Timer className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-orange-800 tracking-wide">{t('Avg Response Time')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-orange-900 mb-2">
                        {analytics?.averageResponseTime.toFixed(0)}ms
                      </div>
                      <p className="text-sm text-orange-700 font-medium">
                        <span className="text-green-600">↘ 15ms</span> {t('improvement')}
                      </p>
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
                        <h3 className="text-sm font-semibold text-purple-800 tracking-wide">{t('Active Tokens')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-purple-900 mb-2">{analytics?.activeTokens}</div>
                      <p className="text-sm text-purple-700 font-medium">{t('Currently valid')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
                      <BarChart3 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 tracking-tight">{t('Flow Activity (24h)')}</h4>
                      <p className="text-gray-600 font-medium">{t('OAuth flows over time')}</p>
                    </div>
                  </div>
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="font-medium">{t('Chart visualization would be implemented here')}</p>
                      <p className="text-sm mt-2">{t('Integration with charting library needed')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 tracking-tight">{t('Top Applications')}</h4>
                      <p className="text-gray-600 font-medium">{t('Most active OAuth clients')}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {analytics?.topClients.map((client, index) => (
                      <div key={client.clientId} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{client.clientName}</p>
                            <p className="text-sm text-gray-600 font-medium">{client.count} {t('flows')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={client.successRate > 95 ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}>
                            {client.successRate.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="flows" className="space-y-6">
              {/* Filters */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
                    <Search className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 tracking-tight">{t('Filter OAuth Flows')}</h4>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">{t('Type:')}</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="border rounded-xl px-3 py-2 bg-white shadow-sm"
                    >
                      <option value="all">{t('All Types')}</option>
                      <option value="authorization">{t('Authorization')}</option>
                      <option value="token">{t('Token')}</option>
                      <option value="refresh">{t('Refresh')}</option>
                      <option value="error">{t('Error')}</option>
                      <option value="revoke">{t('Revoke')}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">{t('Status:')}</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border rounded-xl px-3 py-2 bg-white shadow-sm"
                    >
                      <option value="all">{t('All Statuses')}</option>
                      <option value="success">{t('Success')}</option>
                      <option value="error">{t('Error')}</option>
                      <option value="warning">{t('Warning')}</option>
                      <option value="pending">{t('Pending')}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('Search by client or user...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border rounded-xl px-3 py-2 min-w-[200px] bg-white shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Events List - Simplified for brevity */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">{t('Recent OAuth Events')}</h4>
                    <p className="text-gray-600 font-medium">
                      {t('Showing {{count}} of {{total}} events', { 
                        count: filteredEvents.length, 
                        total: events.length 
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-center text-gray-500 py-8">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>{t('OAuth events would be displayed here')}</p>
                  <p className="text-sm mt-2">{t('Full event list implementation in progress')}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="text-center text-gray-500 py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>{t('Advanced analytics charts coming soon')}</p>
              </div>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                      <Server className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">{t('OAuth Server')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">{t('Status')}</span>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('Healthy')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">{t('Uptime')}</span>
                      <span className="font-bold text-gray-900">99.9%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">{t('Response Time')}</span>
                      <span className="font-bold text-gray-900">142ms</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                      <Database className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">{t('Token Store')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">{t('Status')}</span>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('Healthy')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">{t('Storage Used')}</span>
                      <span className="font-bold text-gray-900">68%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">{t('Active Tokens')}</span>
                      <span className="font-bold text-gray-900">{analytics?.activeTokens}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                      <Network className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">{t('Network')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">{t('Status')}</span>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('Healthy')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">{t('Throughput')}</span>
                      <span className="font-bold text-gray-900">1.2k req/min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">{t('Error Rate')}</span>
                      <span className="font-bold text-gray-900">0.3%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 tracking-tight">{t('System Alerts')}</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                      <p className="text-yellow-800 font-medium">
                        {t('High response time detected on authorization endpoint (avg 850ms)')}
                      </p>
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mr-3" />
                      <p className="text-orange-800 font-medium">
                        {t('Token storage is at 68% capacity. Consider cleanup or expansion.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
