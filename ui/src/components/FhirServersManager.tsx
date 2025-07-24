import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Server,
  Database,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Copy,
  Eye,
  Info,
  Play,
  Plus,
  Loader2,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createAuthenticatedApiClients } from '../lib/apiClient';
import type { 
  GetFhirServersByServerName200Response,
  GetFhirServers200ResponseServersInner
} from '../lib/api-client';

// Extend the API type to include our UI-specific computed property
type FhirServerWithStatus = GetFhirServers200ResponseServersInner & {
  hasConnectionError?: boolean;
};

export function FhirServersManager() {
  const [servers, setServers] = useState<FhirServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<GetFhirServersByServerName200Response | null>(null);
  const [loadingServerDetail, setLoadingServerDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Add Server Dialog State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [addingServer, setAddingServer] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Edit Server Dialog State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<FhirServerWithStatus | null>(null);
  const [editServerUrl, setEditServerUrl] = useState('');
  const [updatingServer, setUpdatingServer] = useState(false);

  // Security check state
  const [securityChecks, setSecurityChecks] = useState<Record<string, 'checking' | 'secure' | 'insecure'>>({});

  const apiClient = useMemo(() => createAuthenticatedApiClients(), []);

  const checkServerSecurity = useCallback(async (server: FhirServerWithStatus) => {
    // Use functional state update to check current state
    setSecurityChecks(prev => {
      // Don't check if already checking or checked
      if (prev[server.id]) {
        console.log(`Security check for ${server.displayName} skipped - already ${prev[server.id]}`);
        return prev;
      }
      
      console.log(`Starting security check for ${server.displayName}`);
      
      // Set to checking and start the async check
      setTimeout(async () => {
        try {
          // Try to access the FHIR server directly from the browser
          // We'll use a simple fetch to test if the server responds at all
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          const response = await fetch(`${server.url}/metadata`, {
            method: 'HEAD',
            mode: 'no-cors', // This prevents CORS issues and lets us test if server is accessible
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          console.log(`Security check for ${server.displayName}: response type=${response.type}`);

          // For no-cors mode, if we get 'opaque' response, it means the server responded
          // If the server is publicly accessible (like HAPI FHIR), this is a security concern
          // because users can bypass the proxy
          if (response.type === 'opaque') {
            console.log(`Marking ${server.displayName} as INSECURE (server responds to direct requests)`);
            setSecurityChecks(prevChecks => ({ ...prevChecks, [server.id]: 'insecure' }));
          } else {
            console.log(`Marking ${server.displayName} as SECURE (server properly protected)`);
            setSecurityChecks(prevChecks => ({ ...prevChecks, [server.id]: 'secure' }));
          }
        } catch (error) {
          // Network error - server might be down or unreachable
          console.log(`Security check for ${server.displayName} failed (network error):`, error);
          console.log(`Marking ${server.displayName} as SECURE (server unreachable from browser)`);
          setSecurityChecks(prevChecks => ({ ...prevChecks, [server.id]: 'secure' }));
        }
      }, 0);
      
      return { ...prev, [server.id]: 'checking' };
    });
  }, []); // Remove securityChecks from dependencies

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.servers.getFhirServers();
      
      // Map servers and detect connection errors
      const mappedServers = response.servers.map(server => ({
        ...server,
        hasConnectionError: server.serverName === 'Unknown FHIR Server' || 
                           server.displayName === 'Unknown FHIR Server' ||
                           server.displayName?.includes('Unknown') ||
                           server.fhirVersion === 'Unknown'
      }));
      
      setServers(mappedServers);

      // Clear security checks for servers with connection errors and perform checks for working servers
      setSecurityChecks(prevChecks => {
        const updatedChecks = { ...prevChecks };
        
        mappedServers.forEach(server => {
          if (server.hasConnectionError) {
            // Clear any existing security check for servers with connection errors
            delete updatedChecks[server.id];
          } else {
            // Perform security check for working servers
            checkServerSecurity(server);
          }
        });
        
        return updatedChecks;
      });
    } catch (err) {
      setError('Failed to load FHIR servers');
      console.error('Error fetching servers:', err);
    } finally {
      setLoading(false);
    }
  }, [apiClient, checkServerSecurity]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddServer = async () => {
    const trimmedUrl = newServerUrl.trim();
    
    if (!trimmedUrl) {
      setUrlError('Server URL is required');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setUrlError('Please enter a valid URL (e.g., https://hapi.fhir.org/baseR4)');
      return;
    }

    // Check if URL already exists
    const existingServer = servers.find(server => server.url === trimmedUrl);
    if (existingServer) {
      setUrlError(`This URL is already registered for server "${existingServer.displayName}"`);
      return;
    }

    try {
      setAddingServer(true);
      setError(null);
      setUrlError(null);
      
      await apiClient.servers.postFhirServers({
        postFhirServersRequest: {
          url: trimmedUrl
        }
      });

      // Reset form
      setNewServerUrl('');
      setShowAddDialog(false);
      
      // Refresh servers list
      await fetchServers();
    } catch (err: unknown) {
      console.error('Failed to add FHIR server:', err);
      
      // Check if it's a duplicate URL error from the backend
      const error = err as { response?: { status?: number }; message?: string };
      
      if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('already exists')) {
        setUrlError('This URL is already registered');
      } else if (error?.response?.status === 400) {
        setUrlError('Invalid server URL or server not accessible');
      } else {
        setError('Failed to add FHIR server. Please check if the server is accessible and supports FHIR.');
      }
    } finally {
      setAddingServer(false);
    }
  };

  const handleEditServer = (server: FhirServerWithStatus) => {
    setEditingServer(server);
    setEditServerUrl(server.url);
    setShowEditDialog(true);
  };

  const handleUpdateServer = async () => {
    if (!editingServer) return;
    
    const trimmedUrl = editServerUrl.trim();
    
    if (!trimmedUrl) {
      setUrlError('Server URL is required');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setUrlError('Please enter a valid URL (e.g., https://hapi.fhir.org/baseR4)');
      return;
    }

    // Check if URL already exists on a different server
    const existingServer = servers.find(server => 
      server.url === trimmedUrl && server.id !== editingServer.id
    );
    
    if (existingServer) {
      setUrlError(`This URL is already registered for server "${existingServer.displayName}"`);
      return;
    }

    // If the URL is the same as current, no need to update
    if (trimmedUrl === editingServer.url) {
      setEditServerUrl('');
      setShowEditDialog(false);
      setEditingServer(null);
      return;
    }

    try {
      setUpdatingServer(true);
      setError(null);
      setUrlError(null);
      
      // Use the PUT endpoint to update the server
      await apiClient.servers.putFhirServersByServerId({
        serverId: editingServer.id,
        putFhirServersByServerIdRequest: {
          url: trimmedUrl
        }
      });

      // Reset form
      setEditServerUrl('');
      setShowEditDialog(false);
      setEditingServer(null);
      
      // Refresh servers list
      await fetchServers();
    } catch (err: unknown) {
      console.error('Failed to update FHIR server:', err);
      
      // Check if it's a duplicate URL error from the backend
      const error = err as { response?: { status?: number }; message?: string };
      
      if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('already exists')) {
        setUrlError('This URL is already registered');
      } else if (error?.response?.status === 400) {
        setUrlError('Invalid server URL or server not accessible');
      } else {
        setError('Failed to update FHIR server. Please check if the server is accessible and supports FHIR.');
      }
    } finally {
      setUpdatingServer(false);
    }
  };

  const fetchServerDetail = useCallback(async (serverName: string) => {
    try {
      setLoadingServerDetail(true);
      const response = await apiClient.servers.getFhirServersByServerName({ serverName });
      setSelectedServer(response);
      setActiveTab('details'); // Switch to details tab
    } catch (err) {
      console.error('Error fetching server detail:', err);
      setSelectedServer(null);
    } finally {
      setLoadingServerDetail(false);
    }
  }, [apiClient]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Loading FHIR Servers</h2>
          <p className="text-muted-foreground font-medium">Fetching server information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-destructive">Error Loading Servers</h3>
              <p className="text-destructive/80">{error}</p>
            </div>
          </div>
          <Button
            onClick={fetchServers}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Enhanced Header */}
      <div className="bg-card/80 backdrop-blur-sm p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
              FHIR Server Management
            </h1>

            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Database className="w-5 h-5 text-primary" />
              </div>
              Manage and monitor FHIR server connections
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-emerald-500/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Server
            </Button>
            <Button
              onClick={fetchServers}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-blue-500/20"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                  <Server className="w-6 h-6 text-primary" />
                </div>
                <div className="text-sm font-semibold text-primary tracking-wide">Total Servers</div>
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">{servers.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-xl flex items-center justify-center shadow-sm">
                  <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tracking-wide">Supported Servers</div>
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {servers.filter(s => s.supported).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center shadow-sm">
                  <X className="w-6 h-6 text-destructive" />
                </div>
                <div className="text-sm font-semibold text-destructive tracking-wide">Unsupported Servers</div>
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {servers.filter(s => !s.supported).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-violet-500/10 dark:bg-violet-400/20 rounded-xl flex items-center justify-center shadow-sm">
                  <Play className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="text-sm font-semibold text-violet-700 dark:text-violet-300 tracking-wide">Launch Contexts</div>
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">12</div>
              <p className="text-sm text-violet-700 dark:text-violet-300 font-medium">Available contexts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-t-2xl">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">Server Overview</TabsTrigger>
            <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">Server Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {servers.map((server) => (
                <div key={server.id} className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                        server.hasConnectionError 
                          ? 'bg-destructive/10' 
                          : 'bg-primary/10'
                      }`}>
                        {server.hasConnectionError ? (
                          <AlertTriangle className="w-6 h-6 text-destructive" />
                        ) : (
                          <Server className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-bold text-foreground tracking-tight">{server.displayName}</h3>
                          {server.hasConnectionError && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{server.name}</p>
                        {server.hasConnectionError && (
                          <p className="text-xs text-destructive font-medium">Unable to connect to server</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={server.supported ? "default" : "destructive"}
                        className={server.supported
                          ? "bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30 shadow-sm"
                          : "bg-destructive/10 text-destructive border-destructive/30 shadow-sm"
                        }
                      >
                        {server.supported ? (
                          <><Check className="w-3 h-3 mr-1" /> Supported</>
                        ) : (
                          <><X className="w-3 h-3 mr-1" /> Unsupported</>
                        )}
                      </Badge>
                      
                      {/* Security Status Badge */}
                      {securityChecks[server.id] === 'insecure' && (
                        <Badge 
                          variant="destructive" 
                          className="bg-orange-500/10 dark:bg-orange-400/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-400/30 shadow-sm"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Security Warning
                        </Badge>
                      )}
                      {securityChecks[server.id] === 'secure' && (
                        <Badge 
                          variant="default" 
                          className="bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30 shadow-sm"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Secure
                        </Badge>
                      )}
                      {securityChecks[server.id] === 'checking' && (
                        <Badge 
                          variant="secondary" 
                          className="bg-primary/10 text-primary border-primary/30 shadow-sm"
                        >
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Checking...
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-3 rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">FHIR Version</span>
                        <p className="text-sm font-bold text-foreground mt-1">{server.fhirVersion}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Server Software</span>
                        <p className="text-sm font-bold text-foreground mt-1">{server.serverName || 'Unknown'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-muted-foreground">Base URL:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(server.url)}
                          className="h-8 px-3 rounded-lg hover:bg-muted transition-colors duration-200"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-foreground bg-muted/50 p-3 rounded-xl font-mono break-all border border-border/50">
                        {server.url}
                      </p>
                    </div>

                    {/* Security Warning - only show for servers without connection errors */}
                    {!server.hasConnectionError && securityChecks[server.id] === 'insecure' && (
                      <div className="bg-orange-500/10 dark:bg-orange-400/10 p-3 rounded-xl border border-orange-500/20 dark:border-orange-400/20">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Security Warning</span>
                        </div>
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          This FHIR server is publicly accessible and can be reached directly, 
                          bypassing the secure proxy. For proper security, the FHIR server should only be accessible 
                          through the SMART on FHIR Proxy.
                        </p>
                      </div>
                    )}

                    {/* Launch Context Summary */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-muted-foreground">Launch Contexts:</span>
                        <span className="text-xs text-muted-foreground">3 available</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-400/20">
                          Global
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                          Patient Chart
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-violet-500/10 dark:bg-violet-400/20 text-violet-700 dark:text-violet-300 border-violet-500/20 dark:border-violet-400/20">
                          Provider Context
                        </Badge>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchServerDetail(server.id)}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl border-border hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Details</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Clear the existing security check and re-run it
                          setSecurityChecks(prev => {
                            const newChecks = { ...prev };
                            delete newChecks[server.id];
                            return newChecks;
                          });
                          checkServerSecurity(server);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Check Security</span>
                      </Button>
                      {server.hasConnectionError && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditServer(server)}
                          className="flex items-center space-x-2 px-4 py-2 rounded-xl border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Fix URL</span>
                        </Button>
                      )}
                      {!server.hasConnectionError && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(server.endpoints.metadata, '_blank')}
                          className="flex items-center space-x-2 px-4 py-2 rounded-xl border-border hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Metadata</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="p-6 space-y-6">
            {selectedServer ? (
              <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm">
                      <Server className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground tracking-tight">{selectedServer.displayName}</h2>
                      <p className="text-muted-foreground font-medium">{selectedServer.name}</p>
                    </div>
                  </div>
                  <Badge
                    variant={selectedServer.supported ? "default" : "destructive"}
                    className={selectedServer.supported
                      ? "bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30 shadow-sm px-4 py-2"
                      : "bg-destructive/10 text-destructive border-destructive/30 shadow-sm px-4 py-2"
                    }
                  >
                    {selectedServer.supported ? (
                      <><Check className="w-4 h-4 mr-2" /> Supported</>
                    ) : (
                      <><X className="w-4 h-4 mr-2" /> Unsupported</>
                    )}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                          <Info className="w-4 h-4 text-primary" />
                        </div>
                        Server Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                          <span className="text-sm font-semibold text-muted-foreground">Server Name:</span>
                          <span className={`text-sm font-bold ${(selectedServer.serverName === 'Unknown FHIR Server' || !selectedServer.serverName) ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {selectedServer.serverName || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                          <span className="text-sm font-semibold text-muted-foreground">FHIR Version:</span>
                          <span className={`text-sm font-bold ${selectedServer.fhirVersion === 'Unknown' ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {selectedServer.fhirVersion}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                          <span className="text-sm font-semibold text-muted-foreground">Server Version:</span>
                          <span className={`text-sm font-bold ${(!selectedServer.serverVersion || selectedServer.serverVersion === 'Unknown') ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {selectedServer.serverVersion || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
                        <div className="w-8 h-8 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-lg flex items-center justify-center mr-3">
                          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Connection
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-muted-foreground">Base URL:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(selectedServer.url)}
                            className="h-8 px-3 rounded-lg hover:bg-muted transition-colors duration-200"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-foreground bg-muted/50 p-3 rounded-xl font-mono break-all border border-border">
                          {selectedServer.url}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Endpoints - only show for servers without connection errors */}
                {selectedServer.fhirVersion !== 'Unknown' && selectedServer.supported && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-foreground mb-6 flex items-center">
                      <div className="w-8 h-8 bg-purple-500/10 dark:bg-purple-400/20 rounded-lg flex items-center justify-center mr-3">
                        <ExternalLink className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      API Endpoints
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(selectedServer.endpoints).map(([key, url]) => (
                        <div key={key} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border hover:bg-muted/70 transition-all duration-200">
                          <div className="flex-1">
                            <p className="font-semibold text-foreground capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-sm text-muted-foreground font-mono break-all">{url}</p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(url)}
                              className="h-10 px-3 rounded-xl hover:bg-background transition-colors duration-200"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(url, '_blank')}
                              className="h-10 px-3 rounded-xl hover:bg-background transition-colors duration-200"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connection Error Message for servers with issues */}
                {(selectedServer.fhirVersion === 'Unknown' || !selectedServer.supported) && (
                  <div className="mt-8">
                    <div className="bg-destructive/10 p-6 rounded-xl border border-destructive/20">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-destructive">Connection Error</h4>
                          <p className="text-destructive/80 text-sm">Unable to connect to this FHIR server or retrieve metadata</p>
                        </div>
                      </div>
                      <p className="text-destructive/70 text-sm">
                        This server cannot be reached or does not respond with valid FHIR metadata. 
                        API endpoints and advanced features are not available for this server.
                      </p>
                    </div>
                  </div>
                )}

                {/* Launch Context Associations */}
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-foreground mb-6 flex items-center">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                      <Database className="w-4 h-4 text-primary" />
                    </div>
                    Associated Launch Contexts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sample launch contexts - in a real app, these would come from API */}
                    <div className="p-4 bg-blue-500/10 dark:bg-blue-400/10 rounded-xl border border-blue-500/20 dark:border-blue-400/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100">Patient Chart Launch</h4>
                        <Badge variant="secondary" className="bg-blue-500/10 dark:bg-blue-400/20 text-blue-800 dark:text-blue-300 border-blue-500/30 dark:border-blue-400/30">
                          Global
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">Standard patient chart context for EHR integration</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Active</span>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-500/10 dark:bg-purple-400/10 rounded-xl border border-purple-500/20 dark:border-purple-400/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100">Provider Summary</h4>
                        <Badge variant="secondary" className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-800 dark:text-purple-300 border-purple-500/30 dark:border-purple-400/30">
                          Server-specific
                        </Badge>
                      </div>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">Provider-focused clinical decision support context</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Active</span>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-xl border border-emerald-500/20 dark:border-emerald-400/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Encounter Context</h4>
                        <Badge variant="secondary" className="bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-400/30">
                          Global
                        </Badge>
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">Encounter-specific clinical workflow context</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                      </div>
                    </div>

                    <div className="p-4 bg-orange-500/10 dark:bg-orange-400/10 rounded-xl border border-orange-500/20 dark:border-orange-400/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-100">Quality Reporting</h4>
                        <Badge variant="secondary" className="bg-orange-500/10 dark:bg-orange-400/20 text-orange-800 dark:text-orange-300 border-orange-500/30 dark:border-orange-400/30">
                          Server-specific
                        </Badge>
                      </div>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">Clinical quality measure reporting context</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card/70 backdrop-blur-sm p-12 rounded-2xl border border-border shadow-lg text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-muted/50 rounded-2xl flex items-center justify-center shadow-sm">
                  <Info className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">No Server Selected</h3>
                <p className="text-muted-foreground mb-6 font-medium">
                  Select a server from the overview tab to view detailed information
                </p>
                {loadingServerDetail && (
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Server Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New FHIR Server</DialogTitle>
            <DialogDescription>
              Enter the base URL of the FHIR server. The server name and details will be automatically retrieved from the server's metadata.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="server-url" className="text-right">
                Server URL
              </Label>
              <Input
                id="server-url"
                value={newServerUrl}
                onChange={(e) => {
                  setNewServerUrl(e.target.value);
                  setUrlError(null); // Clear error when user types
                }}
                placeholder="https://hapi.fhir.org/baseR4"
                className="col-span-3"
              />
            </div>
            {urlError && (
              <div className="col-span-4 text-red-600 text-sm mt-2">
                {urlError}
              </div>
            )}
            {error && (
              <div className="col-span-4 text-red-600 text-sm mt-2">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setUrlError(null);
                setNewServerUrl('');
              }}
              disabled={addingServer}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddServer}
              disabled={addingServer || !newServerUrl.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {addingServer ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Server...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Server
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Server Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Fix Server URL</DialogTitle>
            <DialogDescription>
              Update the URL for "{editingServer?.displayName}". The server name and details will be automatically retrieved from the server's metadata.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-server-url" className="text-right">
                Server URL
              </Label>
              <Input
                id="edit-server-url"
                value={editServerUrl}
                onChange={(e) => {
                  setEditServerUrl(e.target.value);
                  setUrlError(null); // Clear error when user types
                }}
                placeholder="https://hapi.fhir.org/baseR4"
                className="col-span-3"
              />
            </div>
            {urlError && (
              <div className="col-span-4 text-red-600 text-sm mt-2">
                {urlError}
              </div>
            )}
            {error && (
              <div className="col-span-4 text-red-600 text-sm mt-2">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setUrlError(null);
                setEditServerUrl('');
                setEditingServer(null);
              }}
              disabled={updatingServer}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateServer}
              disabled={updatingServer || !editServerUrl.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {updatingServer ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Server
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
