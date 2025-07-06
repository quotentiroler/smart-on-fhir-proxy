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
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { createAuthenticatedApiClients } from '../lib/apiClient';
import type { GetFhirServersByServerName200Response } from '../lib/api-client';

interface FhirServer {
  name: string;
  displayName: string;
  url: string;
  fhirVersion: string;
  serverVersion?: string;
  serverName?: string;
  supported: boolean;
  error?: string;
  endpoints: {
    base: string;
    smartConfig: string;
    metadata: string;
  };
}

export function FhirServersManager() {
  const [servers, setServers] = useState<FhirServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<GetFhirServersByServerName200Response | null>(null);
  const [loadingServerDetail, setLoadingServerDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const apiClient = useMemo(() => createAuthenticatedApiClients(), []);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.servers.getFhirServers();
      setServers(response.servers);
    } catch (err) {
      setError('Failed to load FHIR servers');
      console.error('Error fetching servers:', err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

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
          <Button
            onClick={fetchServers}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Refresh
          </Button>
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
                <div key={server.name} className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                        <Server className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">{server.displayName}</h3>
                        <p className="text-sm text-gray-600 font-medium">{server.name}</p>
                      </div>
                    </div>
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
                        onClick={() => fetchServerDetail(server.name)}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Details</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(server.endpoints.metadata, '_blank')}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Metadata</span>
                      </Button>
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
                          <span className="text-sm font-bold text-gray-900">{selectedServer.serverName || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50/50 rounded-xl">
                          <span className="text-sm font-semibold text-gray-600">FHIR Version:</span>
                          <span className="text-sm font-bold text-gray-900">{selectedServer.fhirVersion}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50/50 rounded-xl">
                          <span className="text-sm font-semibold text-gray-600">Server Version:</span>
                          <span className="text-sm font-bold text-gray-900">{selectedServer.serverVersion || 'Unknown'}</span>
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
    </div>
  );
}
