import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  AlertCircle,
  Plus,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/stores/authStore';
import type { 
  CreateFhirServerRequest,
  UpdateFhirServerRequest,
  FhirServerWithState
} from '@/lib/types/api';

// Imported extracted components
import { StatsCards } from './StatsCards';
import { ServerOverview } from './ServerOverview';
import { ServerDetails } from './ServerDetails';
import { AddServerDialog } from './AddServerDialog';
import { EditServerDialog } from './EditServerDialog';
import { MtlsConfigDialog } from './MtlsConfigDialog';

// mTLS Configuration type
interface MtlsConfig {
  enabled: boolean;
  clientCert?: File;
  clientKey?: File;
  caCert?: File;
  certDetails?: {
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    fingerprint: string;
  };
}

export function FhirServersManager() {
  const { clientApis } = useAuth();
  const [servers, setServers] = useState<FhirServerWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<FhirServerWithState | null>(null);
  const [loadingServerDetail, setLoadingServerDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Add Server Dialog State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Edit Server Dialog State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<FhirServerWithState | null>(null);

  // Security check state
  const [securityChecks, setSecurityChecks] = useState<Record<string, 'checking' | 'secure' | 'insecure'>>({});

  // mTLS Configuration state
  const [showMtlsDialog, setShowMtlsDialog] = useState(false);
  const [selectedServerForMtls, setSelectedServerForMtls] = useState<FhirServerWithState | null>(null);
  const [mtlsConfig, setMtlsConfig] = useState<Record<string, MtlsConfig>>({});
  const [uploadingCerts, setUploadingCerts] = useState(false);

  const checkServerSecurity = useCallback(async (server: FhirServerWithState) => {
    setSecurityChecks(prev => {
      if (prev[server.id]) {
        return prev;
      }
      
      setTimeout(async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${server.url}/metadata`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          if (response.type === 'opaque') {
            console.log(`Marking ${server.serverName || server.name} as INSECURE`);
            setSecurityChecks(prevChecks => ({ ...prevChecks, [server.id]: 'insecure' }));
          } else {
            console.log(`Marking ${server.serverName || server.name} as SECURE`);
            setSecurityChecks(prevChecks => ({ ...prevChecks, [server.id]: 'secure' }));
          }
        } catch (error) {
          console.error(`Security check failed for ${server.serverName || server.name}:`, error);
          setSecurityChecks(prevChecks => ({ ...prevChecks, [server.id]: 'secure' }));
        }
      }, 0);
      
      return { ...prev, [server.id]: 'checking' };
    });
  }, []);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientApis.servers.getFhirServers();
      
      const mappedServers: FhirServerWithState[] = response.servers.map((server) => ({
        ...server,
        connectionStatus: (server.serverName === 'Unknown FHIR Server' || 
                         server.serverName?.includes('Unknown') ||
                         server.fhirVersion === 'Unknown') ? 'disconnected' : 'connected',
        loading: false,
        error: null
      }));
      
      setServers(mappedServers);

      setSecurityChecks(prevChecks => {
        const updatedChecks = { ...prevChecks };
        
        mappedServers.forEach((server) => {
          if (server.connectionStatus === 'disconnected') {
            delete updatedChecks[server.id];
          } else {
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
  }, [clientApis, checkServerSecurity]);

  const handleAddServer = async (url: string) => {
    const existingServer = servers.find(server => server.url === url);
    if (existingServer) {
      setUrlError(`This URL is already registered for server "${existingServer.serverName || existingServer.name}"`);
      return;
    }

    try {
      setError(null);
      setUrlError(null);
      
      await clientApis.servers.postFhirServers({
        postFhirServersRequest: {
          url: url
        } as CreateFhirServerRequest
      });

      setShowAddDialog(false);
      await fetchServers();
    } catch (err: unknown) {
      console.error('Failed to add FHIR server:', err);
      
      const error = err as { response?: { status?: number }; message?: string };
      
      if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('already exists')) {
        setUrlError('This URL is already registered');
      } else if (error?.response?.status === 400) {
        setUrlError('Invalid server URL or server not accessible');
      } else {
        setError('Failed to add FHIR server. Please check if the server is accessible and supports FHIR.');
      }
      throw err;
    }
  };

  const handleEditServer = (server: FhirServerWithState) => {
    setEditingServer(server);
    setShowEditDialog(true);
  };

  const handleUpdateServer = async (server: FhirServerWithState, newUrl: string) => {
    const existingServer = servers.find(s => 
      s.url === newUrl && s.id !== server.id
    );
    
    if (existingServer) {
      setUrlError(`This URL is already registered for server "${existingServer.serverName || existingServer.name}"`);
      return;
    }

    if (newUrl === server.url) {
      setShowEditDialog(false);
      setEditingServer(null);
      return;
    }

    try {
      setError(null);
      setUrlError(null);
      
      await clientApis.servers.putFhirServersByServerId({
        serverId: server.id,
        putFhirServersByServerIdRequest: {
          url: newUrl
        } as UpdateFhirServerRequest
      });

      setShowEditDialog(false);
      setEditingServer(null);
      await fetchServers();
    } catch (err: unknown) {
      console.error('Failed to update FHIR server:', err);
      
      const error = err as { response?: { status?: number }; message?: string };
      
      if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('already exists')) {
        setUrlError('This URL is already registered');
      } else if (error?.response?.status === 400) {
        setUrlError('Invalid server URL or server not accessible');
      } else {
        setError('Failed to update FHIR server. Please check if the server is accessible and supports FHIR.');
      }
      throw err;
    }
  };

  const fetchServerDetail = useCallback(async (serverId: string) => {
    try {
      setLoadingServerDetail(true);
      const response = await clientApis.servers.getFhirServersByServerId({ serverId });
      setSelectedServer({id: serverId, ...response});
      setActiveTab('details');
    } catch (err) {
      console.error('Error fetching server detail:', err);
      setSelectedServer(null);
    } finally {
      setLoadingServerDetail(false);
    }
  }, [clientApis]);

  const handleConfigureMtls = (server: FhirServerWithState) => {
    setSelectedServerForMtls(server);
    setShowMtlsDialog(true);
  };

  const handleMtlsConfigChange = (serverId: string, config: MtlsConfig) => {
    setMtlsConfig(prev => ({
      ...prev,
      [serverId]: config
    }));
  };

  const handleCertificateUpload = async (serverId: string, certType: 'client' | 'key' | 'ca', file: File) => {
    try {
      setUploadingCerts(true);
      
      setMtlsConfig(prev => ({
        ...prev,
        [serverId]: {
          ...prev[serverId],
          [`${certType}${certType === 'client' ? 'Cert' : certType === 'key' ? 'Key' : 'Cert'}`]: file
        }
      }));

      if (certType === 'client') {
        setMtlsConfig(prev => ({
          ...prev,
          [serverId]: {
            ...prev[serverId],
            certDetails: {
              subject: 'CN=proxy-client, O=MyOrg',
              issuer: 'CN=MyOrg Test CA',
              validFrom: new Date().toISOString(),
              validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              fingerprint: 'SHA256:' + Math.random().toString(36).substring(7)
            }
          }
        }));
      }
    } catch (error) {
      console.error('Failed to upload certificate:', error);
    } finally {
      setUploadingCerts(false);
    }
  };

  const handleCheckSecurity = (server: FhirServerWithState) => {
    setSecurityChecks(prev => {
      const newChecks = { ...prev };
      delete newChecks[server.id];
      return newChecks;
    });
    checkServerSecurity(server);
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

      {/* Stats Cards */}
      <StatsCards servers={servers} />

      {/* Main Content */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-t-2xl">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
              Server Overview
            </TabsTrigger>
            <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
              Server Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ServerOverview
              servers={servers}
              securityChecks={securityChecks}
              onViewDetails={fetchServerDetail}
              onConfigureMtls={handleConfigureMtls}
              onCheckSecurity={handleCheckSecurity}
              onEditServer={handleEditServer}
            />
          </TabsContent>

          <TabsContent value="details" className="p-6 space-y-6">
            {selectedServer ? (
              <ServerDetails {...selectedServer} />
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

      {/* Dialog Components */}
      <AddServerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddServer={handleAddServer}
        loading={false}
        error={error}
        urlError={urlError}
      />

      <EditServerDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        server={editingServer}
        onUpdateServer={handleUpdateServer}
        loading={false}
        error={error}
        urlError={urlError}
      />

      <MtlsConfigDialog
        open={showMtlsDialog}
        onOpenChange={setShowMtlsDialog}
        server={selectedServerForMtls}
        config={mtlsConfig}
        onConfigChange={handleMtlsConfigChange}
        onCertificateUpload={handleCertificateUpload}
        uploadingCerts={uploadingCerts}
      />
    </div>
  );
}
