import { useState, useEffect, useCallback, useRef } from 'react';
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
  Network,
  ChevronDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { oauthWebSocketService, type OAuthAnalytics, type OAuthEventSimple } from '../service/oauth-websocket-service';
import { oauthMonitoringService } from '../service/oauth-monitoring-service';
import { getItem } from '../lib/storage';
import { config } from '@/config';

interface SystemHealth {
  oauthServer: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    responseTime: number;
  };
  tokenStore: {
    status: 'healthy' | 'degraded' | 'down';
    storageUsed: number;
    activeTokens: number;
  };
  network: {
    status: 'healthy' | 'degraded' | 'down';
    throughput: string;
    errorRate: number;
  };
}

export function OAuthMonitoringDashboard() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<OAuthEventSimple[]>([]);
  const [analytics, setAnalytics] = useState<OAuthAnalytics | null>(null);
  const [systemHealth] = useState<SystemHealth | null>(null);
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'sse'>('websocket');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Track whether this is the initial data load
  const isInitialLoadRef = useRef(true);
  // Track the current real-time state so handlers can access the latest value
  const isRealTimeActiveRef = useRef(isRealTimeActive);

  // Update ref whenever the state changes
  useEffect(() => {
    isRealTimeActiveRef.current = isRealTimeActive;
  }, [isRealTimeActive]);

  // Load initial data
  const loadInitialData = useCallback(async (forceMode?: 'websocket' | 'sse') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Always disconnect first to ensure clean state
      if (oauthWebSocketService.isConnected) {
        oauthWebSocketService.disconnect();
        // Add a small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Connect using the specified or preferred mode
      const targetMode = forceMode || connectionMode;
      await oauthWebSocketService.connectWithMode(targetMode === 'websocket' ? 'websocket' : 'sse');
      
      // Wait a bit to ensure connection is fully stable
      await new Promise(resolve => setTimeout(resolve, 100));
     
      try {
        await oauthWebSocketService.authenticate();
        
        // Set up event handlers BEFORE subscribing
        if (oauthWebSocketService.isUsingSSE) {
          // For SSE mode, data comes through update handlers, not initial data handlers
          console.info('Using SSE mode for OAuth monitoring');
          
          // In SSE mode, we need to fetch initial data via API and then use update handlers
          try {
            const initialEventsResponse = await oauthMonitoringService.getEvents({ limit: 100 });
            const initialAnalyticsResponse = await oauthMonitoringService.getAnalytics();
            
            // Convert API response types to WebSocket service types
            const convertedEvents: OAuthEventSimple[] = (initialEventsResponse.events || []).map(event => ({
              id: event.id || '',
              timestamp: event.timestamp || new Date().toISOString(),
              type: (event.type as OAuthEventSimple['type']) || 'authorization',
              status: (event.status as OAuthEventSimple['status']) || 'success',
              clientId: event.clientId || '',
              clientName: event.clientName,
              scopes: event.scopes || [],
              grantType: event.grantType || '',
              responseTime: event.responseTime || 0,
              errorMessage: event.errorMessage
            }));
            
            const convertedAnalytics: OAuthAnalytics = {
              totalFlows: initialAnalyticsResponse.totalFlows || 0,
              successRate: initialAnalyticsResponse.successRate || 0,
              averageResponseTime: initialAnalyticsResponse.averageResponseTime || 0,
              activeTokens: initialAnalyticsResponse.activeTokens || 0,
              topClients: initialAnalyticsResponse.topClients || [],
              flowsByType: (initialAnalyticsResponse.flowsByType as Record<string, number>) || {},
              errorsByType: (initialAnalyticsResponse.errorsByType as Record<string, number>) || {},
              hourlyStats: initialAnalyticsResponse.hourlyStats || []
            };
            
            if (isInitialLoadRef.current || isRealTimeActiveRef.current) {
              setEvents(convertedEvents);
              setAnalytics(convertedAnalytics);
            }
          } catch (apiError) {
            console.warn('Failed to fetch initial data via API for SSE mode:', apiError);
            // Continue anyway, real-time updates will start flowing
          }
        } else {
          // For WebSocket mode, use the initial data handlers
          oauthWebSocketService.onEventsData((eventList) => {
            // Only update state if this is the initial load OR if real-time is active
            if (isInitialLoadRef.current || isRealTimeActiveRef.current) {
              setEvents(eventList);
            }
          });

          oauthWebSocketService.onAnalyticsData((analyticsData) => {
            // Only update state if this is the initial load OR if real-time is active
            if (isInitialLoadRef.current || isRealTimeActiveRef.current) {
              setAnalytics(analyticsData);
            }
          });
        }

        oauthWebSocketService.onError((errorMsg) => {
          setError(errorMsg);
        });

        // Subscribe to real-time data
        await oauthWebSocketService.subscribe('events');
        await oauthWebSocketService.subscribe('analytics');

        // Mark that initial load is complete
        isInitialLoadRef.current = false;

      } catch {
        setError('Connected but not authenticated. Please log in to view OAuth monitoring data.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to monitoring service');
    } finally {
      setIsLoading(false);
    }
  }, [connectionMode]);

  // Setup real-time subscriptions
  useEffect(() => {
    let eventsUnsubscribe: (() => void) | undefined;
    let analyticsUnsubscribe: (() => void) | undefined;

    if (isRealTimeActive) {
      // Subscribe to real-time events via WebSocket
      eventsUnsubscribe = oauthWebSocketService.onEventsUpdate((event: OAuthEventSimple) => {
        setEvents(prev => [event, ...prev.slice(0, 999)]); // Keep last 1000 events
      });

      // Subscribe to analytics updates via WebSocket
      analyticsUnsubscribe = oauthWebSocketService.onAnalyticsUpdate((newAnalytics: OAuthAnalytics) => {
        setAnalytics(newAnalytics);
      });
    } else {
      console.info('Real-time updates are PAUSED');
    }

    // Cleanup function
    return () => {
      if (eventsUnsubscribe) {
        eventsUnsubscribe();
      }
      if (analyticsUnsubscribe) {
        analyticsUnsubscribe();
      }
    };
  }, [isRealTimeActive]);

  // Load initial data on component mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeConnection = async () => {
      if (isMounted) {
        await loadInitialData();
      }
    };
    
    initializeConnection();
    
    return () => {
      isMounted = false;
    };
  }, [loadInitialData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (oauthWebSocketService.isConnected) {
        oauthWebSocketService.disconnect();
      }
    };
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const refreshData = async () => {
    // Reset the initial load flag when manually refreshing
    isInitialLoadRef.current = true;
    await loadInitialData();
  };

  const toggleRealTime = () => {
    setIsRealTimeActive(!isRealTimeActive);
  };

  const switchConnectionMode = async (newMode: 'websocket' | 'sse') => {
    if (newMode === connectionMode) return;
    
    setConnectionMode(newMode);
    // Reset the initial load flag when switching connection modes
    isInitialLoadRef.current = true;
    // Reconnect with the new mode
    await loadInitialData(newMode);
  };

  const exportAnalytics = async () => {
    try {
      // Get the current analytics data
      const currentAnalytics = analytics;
      
      if (!currentAnalytics) {
        setError('No analytics data available to export');
        return;
      }

      // Create export data with timestamp
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportType: 'oauth-analytics',
        source: 'dashboard-current-state',
        data: currentAnalytics,
        metadata: {
          totalEvents: events.length,
          connectionMode: oauthWebSocketService.connectionMode,
          realTimeActive: isRealTimeActive
        }
      };

      // Create and download the file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `oauth-analytics-dashboard-${new Date().toISOString().split('T')[0]}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export analytics data');
    }
  };

  const exportServerEvents = async () => {
    try {
      // Get token from encrypted storage
      const tokenData = await getItem<{access_token: string}>('openid_tokens');
      let accessToken = '';
      
      if (tokenData?.access_token) {
        accessToken = tokenData.access_token;
      }
      
      if (!accessToken) {
        setError('No authentication token available for server export. Please log in.');
        return;
      }

      // NOTE: Using fetch for now - will switch to API client once events export endpoint is regenerated
      const response = await fetch(`${config.api.baseUrl}/monitoring/oauth/events/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/x-jsonlines'
        }
      });

      if (!response.ok) {
        throw new Error(`Events export failed: ${response.statusText}`);
      }

      // Get the filename from response headers or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `oauth-events-${new Date().toISOString().split('T')[0]}.jsonl`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export server events data');
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
                         event.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.errorMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('Loading OAuth monitoring data...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('Failed to Load OAuth Monitoring Data')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Try Again')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-background to-muted/50 p-8 rounded-3xl border border-border shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
              {t('OAuth Flow Monitoring')}
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              {t('Real-time monitoring and analytics for OAuth 2.0 flows')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={isRealTimeActive ? "default" : "outline"}
              onClick={toggleRealTime}
              className={`px-6 py-3 font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-border ${
                isRealTimeActive 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800' 
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              {isRealTimeActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isRealTimeActive ? t('Pause') : t('Resume')} {t('Real-time')}
            </Button>
            <Button
              variant="outline"
              onClick={refreshData}
              className="px-6 py-3 bg-background text-foreground font-semibold rounded-2xl hover:bg-muted transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-border"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Refresh')}
            </Button>
            <div className="relative export-menu-container">
              <Button
                variant="outline"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-6 py-3 bg-background text-foreground font-semibold rounded-2xl hover:bg-muted transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-border"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('Export')}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-background border border-border rounded-2xl shadow-xl z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        exportAnalytics();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted rounded-xl transition-colors"
                    >
                      <div className="font-semibold text-foreground">{t('Export Current Data')}</div>
                      <div className="text-sm text-muted-foreground">{t('Download current dashboard analytics')}</div>
                    </button>
                    <button
                      onClick={() => {
                        exportServerEvents();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted rounded-xl transition-colors"
                    >
                      <div className="font-semibold text-foreground">{t('Export Server Events')}</div>
                      <div className="text-sm text-muted-foreground">{t('Download events log from server')}</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Status */}
      {isRealTimeActive ? (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-2xl border border-green-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                <Activity className="h-5 w-5 text-green-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-1">
                  {t('Real-time Monitoring Active')}
                </h3>
                <p className="text-green-800 dark:text-green-400 font-medium">
                  {t('OAuth events are pushed in real time as they occur.')}
                </p>
              </div>
            </div>
            <div className="text-right space-y-3">
              <div>
                <div className="text-sm text-green-700 dark:text-green-400 mb-2">Connection Mode</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={connectionMode === 'websocket' ? "default" : "ghost"}
                    onClick={() => switchConnectionMode('websocket')}
                    size="sm"
                    className={`text-xs px-3 py-1 h-8 border transition-all ${
                      connectionMode === 'websocket' 
                        ? 'bg-green-500/30 hover:bg-green-500/40 text-green-900 dark:text-green-100 border-green-500/50 font-semibold shadow-sm' 
                        : 'bg-green-500/10 hover:bg-green-500/15 text-green-700/70 dark:text-green-400/70 border-green-500/20 font-medium'
                    }`}
                  >
                    WebSocket
                  </Button>
                  <Button
                    variant={connectionMode === 'sse' ? "default" : "ghost"}
                    onClick={() => switchConnectionMode('sse')}
                    size="sm"
                    className={`text-xs px-3 py-1 h-8 border transition-all ${
                      connectionMode === 'sse' 
                        ? 'bg-green-500/30 hover:bg-green-500/40 text-green-900 dark:text-green-100 border-green-500/50 font-semibold shadow-sm' 
                        : 'bg-green-500/10 hover:bg-green-500/15 text-green-700/70 dark:text-green-400/70 border-green-500/20 font-medium'
                    }`}
                  >
                    SSE
                  </Button>
                </div>
                {oauthWebSocketService.isUsingSSE && connectionMode === 'websocket' && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Fallback to SSE (WebSocket failed)
                  </div>
                )}
              </div>
              <div>
                <Badge className="bg-green-500/20 text-green-800 dark:text-green-300 border-green-500/30 font-semibold">
                  {oauthWebSocketService.connectionMode === 'websocket' ? 'WebSocket Active' : 
                   oauthWebSocketService.connectionMode === 'sse' ? 'SSE Active' : 
                   'Disconnected'}
                </Badge>
                {oauthWebSocketService.isUsingSSE && connectionMode === 'websocket' && (
                  <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 font-semibold mt-1">
                    Auto-fallback
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 p-6 rounded-2xl border border-orange-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/30 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                <Pause className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-orange-900 dark:text-orange-300 mb-1">
                  {t('Real-time Monitoring Paused')}
                </h3>
                <p className="text-orange-800 dark:text-orange-400 font-medium">
                  {t('Real-time updates are paused. Click Resume to continue monitoring.')}
                </p>
              </div>
            </div>
            <div className="text-right space-y-3">
              <div>
                <div className="text-sm text-orange-700 dark:text-orange-400 mb-2">Connection Mode</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={connectionMode === 'websocket' ? "default" : "ghost"}
                    onClick={() => switchConnectionMode('websocket')}
                    size="sm"
                    className={`text-xs px-3 py-1 h-8 border transition-all ${
                      connectionMode === 'websocket' 
                        ? 'bg-orange-500/30 hover:bg-orange-500/40 text-orange-900 dark:text-orange-100 border-orange-500/50 font-semibold shadow-sm' 
                        : 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-700/70 dark:text-orange-400/70 border-orange-500/20 font-medium'
                    }`}
                  >
                    WebSocket
                  </Button>
                  <Button
                    variant={connectionMode === 'sse' ? "default" : "ghost"}
                    onClick={() => switchConnectionMode('sse')}
                    size="sm"
                    className={`text-xs px-3 py-1 h-8 border transition-all ${
                      connectionMode === 'sse' 
                        ? 'bg-orange-500/30 hover:bg-orange-500/40 text-orange-900 dark:text-orange-100 border-orange-500/50 font-semibold shadow-sm' 
                        : 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-700/70 dark:text-orange-400/70 border-orange-500/20 font-medium'
                    }`}
                  >
                    SSE
                  </Button>
                </div>
                {oauthWebSocketService.isUsingSSE && connectionMode === 'websocket' && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Fallback to SSE (WebSocket failed)
                  </div>
                )}
              </div>
              <div>
                <Badge className="bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30 font-semibold">
                  Paused ({oauthWebSocketService.connectionMode === 'websocket' ? 'WebSocket' : 
                          oauthWebSocketService.connectionMode === 'sse' ? 'SSE' : 'Disconnected'})
                </Badge>
                {oauthWebSocketService.isUsingSSE && connectionMode === 'websocket' && (
                  <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 font-semibold mt-1">
                    Auto-fallback
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border shadow-lg overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center shadow-sm">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{t('OAuth Analytics Dashboard')}</h3>
              <p className="text-muted-foreground font-medium">{t('Monitor OAuth flows, tokens, and system performance')}</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-t-2xl">
              <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="flows" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('OAuth Flows')}</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Analytics')}</TabsTrigger>
              <TabsTrigger value="monitoring" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('System Health')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center shadow-sm">
                          <BarChart3 className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-primary tracking-wide">{t('Total Flows')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-2">{analytics?.totalFlows ? analytics.totalFlows.toLocaleString() : '0'}</div>
                      <p className="text-sm text-muted-foreground font-medium">{t('Last 24 hours')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-xl flex items-center justify-center shadow-sm">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 tracking-wide">{t('Success Rate')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-300 mb-2">
                        {analytics?.successRate ? analytics.successRate.toFixed(1) : '0.0'}%
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                        {t('Current success rate')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/30 rounded-xl flex items-center justify-center shadow-sm">
                          <Timer className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 tracking-wide">{t('Avg Response Time')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-orange-900 dark:text-orange-300 mb-2">
                        {analytics?.averageResponseTime ? analytics.averageResponseTime.toFixed(0) : '0'}ms
                      </div>
                      <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                        {t('Average response time')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-xl flex items-center justify-center shadow-sm">
                          <Shield className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 tracking-wide">{t('Active Tokens')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-purple-900 dark:text-purple-300 mb-2">{analytics?.activeTokens ?? 0}</div>
                      <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">{t('Currently valid')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center shadow-sm">
                      <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Flow Activity (24h)')}</h4>
                      <p className="text-muted-foreground font-medium">{t('OAuth flows over time')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {analytics?.hourlyStats?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analytics.hourlyStats}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="hour"
                            tickFormatter={(hour) => format(new Date(hour), 'HH:mm')}
                            minTickGap={20}
                            className="text-muted-foreground"
                          />
                          <YAxis allowDecimals={false} className="text-muted-foreground" />
                          <Tooltip
                            labelFormatter={(hour) => format(new Date(hour), 'PPpp')}
                            formatter={(value: number) => [value, t('flows')]}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                            activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="font-medium">{t('No flow activity data available')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Top Applications')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Most active OAuth clients')}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {analytics?.topClients && analytics.topClients.length > 0 ? (
                      analytics.topClients.map((client, index) => (
                        <div key={client.clientId} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{client.clientName}</p>
                              <p className="text-sm text-muted-foreground font-medium">{client.count} {t('flows')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={client.successRate > 95 ? "bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20" : "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20"}>
                              {client.successRate.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p>{t('No client activity data available')}</p>
                        <p className="text-sm mt-2">{t('OAuth client statistics will appear here once data is collected')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="flows" className="space-y-6">
              {/* Filters */}
              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center shadow-sm">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Filter OAuth Flows')}</h4>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('Type:')}</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="border border-border rounded-xl px-3 py-2 bg-background text-foreground shadow-sm"
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
                    <label className="text-sm font-medium text-foreground">{t('Status:')}</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border border-border rounded-xl px-3 py-2 bg-background text-foreground shadow-sm"
                    >
                      <option value="all">{t('All Statuses')}</option>
                      <option value="success">{t('Success')}</option>
                      <option value="error">{t('Error')}</option>
                      <option value="warning">{t('Warning')}</option>
                      <option value="pending">{t('Pending')}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('Search by client or user...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border border-border rounded-xl px-3 py-2 min-w-[200px] bg-background text-foreground shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Events List - Simplified for brevity */}
              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center shadow-sm">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Recent OAuth Events')}</h4>
                    <p className="text-muted-foreground font-medium">
                      {t('Showing {{count}} of {{total}} events', { 
                        count: filteredEvents.length, 
                        total: events.length 
                      })}
                    </p>
                  </div>
                </div>
                {filteredEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                          <th className="px-4 py-3 text-left font-semibold">{t('Time')}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t('Type')}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t('Client')}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t('Status')}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t('Details')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvents.slice(0, 50).map((event, index) => (
                          <tr key={event.id || index} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground">
                              {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-mono text-xs">
                                {event.type || t('Unknown')}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">
                              {event.clientName || event.clientId || t('Unknown')}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                className={
                                  event.status === 'success'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                    : event.status === 'error'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                }
                              >
                                {event.status || t('Unknown')}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                              {event.errorMessage || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredEvents.length > 50 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">{t('Showing first 50 events of {{total}}', { total: filteredEvents.length })}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium">{t('No events match your filters')}</p>
                    <p className="text-sm mt-2">{t('Try adjusting your filter criteria')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Success Rate Chart */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-xl flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Success Rate')}</h4>
                      <p className="text-muted-foreground font-medium">{t('OAuth flow success over time')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {analytics?.hourlyStats?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.hourlyStats}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="hour"
                            tickFormatter={(hour) => format(new Date(hour), 'HH:mm')}
                            className="text-muted-foreground"
                          />
                          <YAxis className="text-muted-foreground" />
                          <Tooltip
                            labelFormatter={(hour) => format(new Date(hour), 'PPpp')}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="success" fill="hsl(var(--primary))" />
                          <Bar dataKey="error" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('No success rate data available')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Distribution Pie Chart */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Client Distribution')}</h4>
                      <p className="text-muted-foreground font-medium">{t('OAuth clients by usage')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {analytics?.topClients?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.topClients}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="hsl(var(--primary))"
                            dataKey="count"
                            label={({ clientName, count }) => `${clientName}: ${count}`}
                          >
                            {analytics.topClients.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${(index * 45) % 360}, 70%, 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('No client distribution data available')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-xl flex items-center justify-center shadow-sm">
                      <Server className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('OAuth Server')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Status')}</span>
                      <Badge className={systemHealth?.oauthServer?.status === 'healthy' 
                        ? "bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20"
                        : systemHealth?.oauthServer?.status === 'degraded'
                        ? "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20"
                        : systemHealth?.oauthServer?.status === 'down'
                        ? "bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20"
                        : "bg-gray-500/10 text-gray-800 dark:text-gray-300 border-gray-500/20"
                      }>
                        {systemHealth?.oauthServer?.status === 'healthy' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {systemHealth?.oauthServer?.status === 'degraded' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {systemHealth?.oauthServer?.status === 'down' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {!systemHealth?.oauthServer?.status && <AlertCircle className="w-3 h-3 mr-1" />}
                        {systemHealth?.oauthServer?.status ? t(systemHealth.oauthServer.status.charAt(0).toUpperCase() + systemHealth.oauthServer.status.slice(1)) : t('Unknown')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Uptime')}</span>
                      <span className="font-bold text-foreground">
                        {systemHealth?.oauthServer.uptime ? 
                          `${Math.floor(systemHealth.oauthServer.uptime / 3600)}h ${Math.floor((systemHealth.oauthServer.uptime % 3600) / 60)}m` : 
                          'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Response Time')}</span>
                      <span className="font-bold text-foreground">
                        {systemHealth?.oauthServer.responseTime ? 
                          `${systemHealth.oauthServer.responseTime.toFixed(0)}ms` : 
                          'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center shadow-sm">
                      <Database className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Token Store')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Status')}</span>
                      <Badge className={systemHealth?.tokenStore?.status === 'healthy' 
                        ? "bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20"
                        : systemHealth?.tokenStore?.status === 'degraded'
                        ? "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20"
                        : systemHealth?.tokenStore?.status === 'down'
                        ? "bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20"
                        : "bg-gray-500/10 text-gray-800 dark:text-gray-300 border-gray-500/20"
                      }>
                        {systemHealth?.tokenStore?.status === 'healthy' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {systemHealth?.tokenStore?.status === 'degraded' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {systemHealth?.tokenStore?.status === 'down' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {!systemHealth?.tokenStore?.status && <AlertCircle className="w-3 h-3 mr-1" />}
                        {systemHealth?.tokenStore?.status ? t(systemHealth.tokenStore.status.charAt(0).toUpperCase() + systemHealth.tokenStore.status.slice(1)) : t('Unknown')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Storage Used')}</span>
                      <span className="font-bold text-foreground">
                        {systemHealth?.tokenStore.storageUsed ? 
                          `${systemHealth.tokenStore.storageUsed}%` : 
                          'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Active Tokens')}</span>
                      <span className="font-bold text-foreground">
                        {systemHealth?.tokenStore.activeTokens ?? analytics?.activeTokens ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-xl flex items-center justify-center shadow-sm">
                      <Network className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Network')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Status')}</span>
                      <Badge className={systemHealth?.network?.status === 'healthy' 
                        ? "bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20"
                        : systemHealth?.network?.status === 'degraded'
                        ? "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20"
                        : systemHealth?.network?.status === 'down'
                        ? "bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20"
                        : "bg-gray-500/10 text-gray-800 dark:text-gray-300 border-gray-500/20"
                      }>
                        {systemHealth?.network?.status === 'healthy' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {systemHealth?.network?.status === 'degraded' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {systemHealth?.network?.status === 'down' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {!systemHealth?.network?.status && <AlertCircle className="w-3 h-3 mr-1" />}
                        {systemHealth?.network?.status ? t(systemHealth.network.status.charAt(0).toUpperCase() + systemHealth.network.status.slice(1)) : t('Unknown')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Throughput')}</span>
                      <span className="font-bold text-foreground">
                        {systemHealth?.network.throughput ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Error Rate')}</span>
                      <span className="font-bold text-foreground">
                        {systemHealth?.network.errorRate ? 
                          `${systemHealth.network.errorRate.toFixed(1)}%` : 
                          'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/30 rounded-xl flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground tracking-tight">{t('System Alerts')}</h4>
                </div>
                <div className="text-center text-muted-foreground py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>{t('No system alerts at this time')}</p>
                  <p className="text-sm mt-2">{t('System monitoring will display real-time alerts here')}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
