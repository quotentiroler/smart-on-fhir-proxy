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
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading FHIR Servers</h2>
          <p className="text-gray-600 font-medium">Fetching server information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Servers</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
          <Button
            onClick={fetchServers}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
              FHIR Server Management
            </h1>

            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-3 shadow-sm">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-600 text-lg flex items-center">
              Manage and monitor FHIR server connections
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-2xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Server
            </Button>
            <Button
              onClick={fetchServers}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Server className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-semibold text-blue-800 tracking-wide">Total Servers</div>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-2">{servers.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-sm font-semibold text-green-800 tracking-wide">Supported Servers</div>
              </div>
              <div className="text-3xl font-bold text-green-900 mb-2">
                {servers.filter(s => s.supported).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center shadow-sm">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-sm font-semibold text-red-800 tracking-wide">Unsupported Servers</div>
              </div>
              <div className="text-3xl font-bold text-red-900 mb-2">
                {servers.filter(s => !s.supported).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Play className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-sm font-semibold text-purple-800 tracking-wide">Launch Contexts</div>
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-2">12</div>
              <p className="text-sm text-purple-700 font-medium">Available contexts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 m-4 bg-gray-100/50">
            <TabsTrigger value="overview" className="rounded-xl">Server Overview</TabsTrigger>
            <TabsTrigger value="details" className="rounded-xl">Server Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {servers.map((server) => (
                <div key={server.id} className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-sm ${
                        server.hasConnectionError 
                          ? 'from-red-100 to-red-200' 
                          : 'from-blue-100 to-blue-200'
                      }`}>
                        {server.hasConnectionError ? (
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        ) : (
                          <Server className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-bold text-gray-900 tracking-tight">{server.displayName}</h3>
                          {server.hasConnectionError && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 font-medium">{server.name}</p>
                        {server.hasConnectionError && (
                          <p className="text-xs text-red-600 font-medium">Unable to connect to server</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={server.supported ? "default" : "destructive"}
                        className={server.supported
                          ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-sm"
                          : "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300 shadow-sm"
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
                          className="bg-gradient-to-r from-yellow-100 to-orange-200 text-orange-800 border-orange-300 shadow-sm"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Security Warning
                        </Badge>
                      )}
                      {securityChecks[server.id] === 'secure' && (
                        <Badge 
                          variant="default" 
                          className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-sm"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Secure
                        </Badge>
                      )}
                      {securityChecks[server.id] === 'checking' && (
                        <Badge 
                          variant="secondary" 
                          className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300 shadow-sm"
                        >
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Checking...
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50/50 p-3 rounded-xl">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">FHIR Version</span>
                        <p className="text-sm font-bold text-gray-900 mt-1">{server.fhirVersion}</p>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-xl">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Server Software</span>
                        <p className="text-sm font-bold text-gray-900 mt-1">{server.serverName || 'Unknown'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-600">Base URL:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(server.url)}
                          className="h-8 px-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-900 bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl font-mono break-all border border-gray-200/50">
                        {server.url}
                      </p>
                    </div>

                    {/* Security Warning - only show for servers without connection errors */}
                    {!server.hasConnectionError && securityChecks[server.id] === 'insecure' && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-xl border border-orange-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-semibold text-orange-800">Security Warning</span>
                        </div>
                        <p className="text-xs text-orange-700">
                          This FHIR server is publicly accessible and can be reached directly, 
                          bypassing the secure proxy. For proper security, the FHIR server should only be accessible 
                          through the SMART on FHIR Proxy.
                        </p>
                      </div>
                    )}

                    {/* Launch Context Summary */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-600">Launch Contexts:</span>
                        <span className="text-xs text-gray-500">3 available</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          Global
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Patient Chart
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          Provider Context
                        </Badge>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchServerDetail(server.id)}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
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
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl border-blue-300 text-blue-700 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Check Security</span>
                      </Button>
                      {server.hasConnectionError && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditServer(server)}
                          className="flex items-center space-x-2 px-4 py-2 rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
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
                          className="flex items-center space-x-2 px-4 py-2 rounded-xl border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
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
              <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center shadow-sm">
                      <Server className="w-7 h-7 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{selectedServer.displayName}</h2>
                      <p className="text-gray-600 font-medium">{selectedServer.name}</p>
                    </div>
                  </div>
                  <Badge
                    variant={selectedServer.supported ? "default" : "destructive"}
                    className={selectedServer.supported
                      ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-sm px-4 py-2"
                      : "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300 shadow-sm px-4 py-2"
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
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <Info className="w-4 h-4 text-blue-600" />
                        </div>
                        Server Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50/50 rounded-xl">
                          <span className="text-sm font-semibold text-gray-600">Server Name:</span>
                          <span className={`text-sm font-bold ${(selectedServer.serverName === 'Unknown FHIR Server' || !selectedServer.serverName) ? 'text-gray-500' : 'text-gray-900'}`}>
                            {selectedServer.serverName || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50/50 rounded-xl">
                          <span className="text-sm font-semibold text-gray-600">FHIR Version:</span>
                          <span className={`text-sm font-bold ${selectedServer.fhirVersion === 'Unknown' ? 'text-gray-500' : 'text-gray-900'}`}>
                            {selectedServer.fhirVersion}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50/50 rounded-xl">
                          <span className="text-sm font-semibold text-gray-600">Server Version:</span>
                          <span className={`text-sm font-bold ${(!selectedServer.serverVersion || selectedServer.serverVersion === 'Unknown') ? 'text-gray-500' : 'text-gray-900'}`}>
                            {selectedServer.serverVersion || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <Database className="w-4 h-4 text-green-600" />
                        </div>
                        Connection
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-600">Base URL:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(selectedServer.url)}
                            className="h-8 px-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-900 bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl font-mono break-all border border-gray-200/50">
                          {selectedServer.url}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Endpoints - only show for servers without connection errors */}
                {selectedServer.fhirVersion !== 'Unknown' && selectedServer.supported && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <ExternalLink className="w-4 h-4 text-purple-600" />
                      </div>
                      API Endpoints
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(selectedServer.endpoints).map(([key, url]) => (
                        <div key={key} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200/50 hover:from-gray-100 hover:to-gray-200 transition-all duration-200">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-sm text-gray-600 font-mono break-all">{url}</p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(url)}
                              className="h-10 px-3 rounded-xl hover:bg-white transition-colors duration-200"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(url, '_blank')}
                              className="h-10 px-3 rounded-xl hover:bg-white transition-colors duration-200"
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
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-900">Connection Error</h4>
                          <p className="text-red-700 text-sm">Unable to connect to this FHIR server or retrieve metadata</p>
                        </div>
                      </div>
                      <p className="text-red-600 text-sm">
                        This server cannot be reached or does not respond with valid FHIR metadata. 
                        API endpoints and advanced features are not available for this server.
                      </p>
                    </div>
                  </div>
                )}

                {/* Launch Context Associations */}
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                      <Database className="w-4 h-4 text-indigo-600" />
                    </div>
                    Associated Launch Contexts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sample launch contexts - in a real app, these would come from API */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-900">Patient Chart Launch</h4>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                          Global
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700 mb-2">Standard patient chart context for EHR integration</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-blue-600 font-medium">Active</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-900">Provider Summary</h4>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">
                          Server-specific
                        </Badge>
                      </div>
                      <p className="text-sm text-purple-700 mb-2">Provider-focused clinical decision support context</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-purple-600 font-medium">Active</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-emerald-900">Encounter Context</h4>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                          Global
                        </Badge>
                      </div>
                      <p className="text-sm text-emerald-700 mb-2">Encounter-specific clinical workflow context</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-emerald-600 font-medium">Active</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-orange-900">Quality Reporting</h4>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                          Server-specific
                        </Badge>
                      </div>
                      <p className="text-sm text-orange-700 mb-2">Clinical quality measure reporting context</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs text-orange-600 font-medium">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm p-12 rounded-2xl border border-gray-200/50 shadow-lg text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
                  <Info className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No Server Selected</h3>
                <p className="text-gray-600 mb-6 font-medium">
                  Select a server from the overview tab to view detailed information
                </p>
                {loadingServerDetail && (
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
