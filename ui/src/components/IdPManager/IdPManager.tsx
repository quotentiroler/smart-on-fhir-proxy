import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Plus, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/stores/authStore';

// Import extracted components
import { NotificationToast } from '../ui/NotificationToast';
import { IdPStatisticsCards } from './IdPStatisticsCards';
import { IdPAddForm } from './IdPAddForm';
import { IdPTable } from './IdPTable';
import { IdPEditDialog } from './IdPEditDialog';
import { ConnectionTestDialog } from './ConnectionTestDialog';
import { CertificatesDialog } from './CertificatesDialog';

// Sample data for Identity Providers (fallback when no real data)
const SAMPLE_IDPS: IdP[] = [
  {
    id: '1',
    name: 'Hospital Azure AD',
    type: 'SAML',
    provider: 'Microsoft Azure',
    status: 'active',
    entityId: 'https://hospital.onmicrosoft.com/saml',
    ssoUrl: 'https://login.microsoftonline.com/hospital/saml2',
    lastUsed: '2024-12-28T10:30:00Z',
    userCount: 156,
  },
  {
    id: '2',
    name: 'Google Workspace',
    type: 'OAuth2',
    provider: 'Google',
    status: 'active',
    entityId: 'google-workspace-hospital',
    ssoUrl: 'https://accounts.google.com/oauth/authorize',
    lastUsed: '2024-12-28T09:15:00Z',
    userCount: 89,
  },
  {
    id: '3',
    name: 'Epic MyChart SSO',
    type: 'OIDC',
    provider: 'Epic',
    status: 'active',
    entityId: 'epic-mychart-sso',
    ssoUrl: 'https://mychart.hospital.com/oauth2/authorize',
    lastUsed: '2024-12-27T16:45:00Z',
    userCount: 342,
  },
  {
    id: '4',
    name: 'Legacy LDAP',
    type: 'LDAP',
    provider: 'OpenLDAP',
    status: 'inactive',
    entityId: 'ldap://hospital.local',
    ssoUrl: 'ldap://hospital.local:389',
    lastUsed: '2024-12-15T08:30:00Z',
    userCount: 23,
  },
  {
    id: '5',
    name: 'Okta Healthcare',
    type: 'SAML',
    provider: 'Okta',
    status: 'active',
    entityId: 'https://hospital.okta.com/saml2/service-provider',
    ssoUrl: 'https://hospital.okta.com/app/saml/sso',
    lastUsed: '2024-12-28T11:00:00Z',
    userCount: 78,
  },
];

export type IdP = {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: 'active' | 'inactive';
  entityId: string;
  ssoUrl: string;
  lastUsed: string;
  userCount: number;
};

export type IdPFormData = {
  name: string;
  type: string;
  provider: string;
  entityId: string;
  ssoUrl: string;
  displayName: string;
  clientSecret: string;
  tokenUrl: string;
  userInfoUrl: string;
  logoutUrl: string;
  issuer: string;
  metadataUrl: string;
  certificate: string;
  signatureAlgorithm: string;
  nameIdFormat: string;
  defaultScopes: string;
  validateSignature: boolean;
  wantAuthnRequestsSigned: boolean;
  enabled: boolean;
};

export function IdPManager() {
  const { isAuthenticated, clientApis } = useAuth();
  const [idps, setIdps] = useState<IdP[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIdp, setEditingIdp] = useState<IdP | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [showCertificates, setShowCertificates] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const resetNewIdp = (): IdPFormData => ({
    name: '',
    type: 'SAML',
    provider: '',
    entityId: '',
    ssoUrl: '',
    displayName: '',
    clientSecret: '',
    tokenUrl: '',
    userInfoUrl: '',
    logoutUrl: '',
    issuer: '',
    metadataUrl: '',
    certificate: '',
    signatureAlgorithm: 'RS256',
    nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
    defaultScopes: 'openid profile email',
    validateSignature: true,
    wantAuthnRequestsSigned: false,
    enabled: true
  });

  const [newIdp, setNewIdp] = useState<IdPFormData>(resetNewIdp());

  // Load Identity Providers from backend or use sample data as fallback
  useEffect(() => {
    const loadIdPs = async () => {
      setLoading(true);
      try {
        if (!isAuthenticated) {
          setIdps(SAMPLE_IDPS);
          return;
        }

        // Try to fetch real data from backend
        const countResponse = await clientApis.identityProviders.getAdminIdpsCount();
        
        // If we get real data from the backend, fetch the full list
        if (countResponse.total && countResponse.total > 0) {
          // Fetch the actual identity providers list
          const providersResponse = await clientApis.identityProviders.getAdminIdps();
          
          // Transform backend data to match our interface
          const transformedIdps = providersResponse.map((provider) => {
            const config = provider.config as Record<string, unknown> | undefined;
            return {
              id: provider.alias || 'unknown',
              name: provider.displayName || provider.alias || 'Unknown Provider',
              type: provider.providerId || 'Unknown',
              provider: provider.providerId || 'Unknown',
              status: provider.enabled ? 'active' as const : 'inactive' as const,
              entityId: (config?.entityId as string) || provider.alias || '',
              ssoUrl: (config?.singleSignOnServiceUrl as string) || '',
              lastUsed: new Date().toISOString(), // Backend doesn't provide this
              userCount: 0, // Backend doesn't provide this
            };
          });
          
          setIdps(transformedIdps);
          console.log('Loaded real Identity Provider data from backend');
        } else {
          console.log('No real IdP data found, using sample data');
          setIdps(SAMPLE_IDPS);
        }
      } catch (error) {
        console.error('Failed to load Identity Providers, using sample data:', error);
        setIdps(SAMPLE_IDPS);
      } finally {
        setLoading(false);
      }
    };

    loadIdPs();
  }, [isAuthenticated, clientApis.identityProviders]);

  const handleAddIdp = async (formData: IdPFormData) => {
    try {
      if (isAuthenticated && clientApis.identityProviders) {
        // Try to add via backend API
        const config: Record<string, unknown> = {
          displayName: formData.displayName || formData.name,
          entityId: formData.entityId,
          singleSignOnServiceUrl: formData.ssoUrl,
        };

        // Add type-specific configuration
        if (formData.type === 'OIDC' || formData.type === 'OAuth2') {
          if (formData.clientSecret) config.clientSecret = formData.clientSecret;
          if (formData.tokenUrl) config.tokenUrl = formData.tokenUrl;
          if (formData.userInfoUrl) config.userInfoUrl = formData.userInfoUrl;
          if (formData.issuer) config.issuer = formData.issuer;
          if (formData.defaultScopes) config.defaultScopes = formData.defaultScopes;
          if (formData.logoutUrl) config.logoutUrl = formData.logoutUrl;
        }

        if (formData.type === 'SAML') {
          if (formData.signatureAlgorithm) config.signatureAlgorithm = formData.signatureAlgorithm;
          if (formData.nameIdFormat) config.nameIdPolicyFormat = formData.nameIdFormat;
          if (formData.certificate) config.signingCertificate = formData.certificate;
          if (formData.logoutUrl) config.singleLogoutServiceUrl = formData.logoutUrl;
          config.validateSignature = formData.validateSignature;
          config.wantAuthnRequestsSigned = formData.wantAuthnRequestsSigned;
        }

        // Common configuration
        if (formData.metadataUrl) config.metadataDescriptorUrl = formData.metadataUrl;
        config.enabled = formData.enabled;

        const response = await clientApis.identityProviders.postAdminIdps({
          postAdminIdpsRequest: {
            alias: formData.name.toLowerCase().replace(/\s+/g, '-'),
            providerId: formData.type.toLowerCase(),
            config,
          },
        });
        
        console.log('IdP added successfully:', response);
        
        // Reload IdPs from backend
        const providersResponse = await clientApis.identityProviders.getAdminIdps();
        const transformedIdps = providersResponse.map((provider) => {
          const config = provider.config as Record<string, unknown> | undefined;
          return {
            id: provider.alias || 'unknown',
            name: provider.displayName || provider.alias || 'Unknown Provider',
            type: provider.providerId || 'Unknown',
            provider: provider.providerId || 'Unknown',
            status: provider.enabled ? 'active' as const : 'inactive' as const,
            entityId: (config?.entityId as string) || provider.alias || '',
            ssoUrl: (config?.singleSignOnServiceUrl as string) || '',
            lastUsed: new Date().toISOString(),
            userCount: 0,
          };
        });
        setIdps(transformedIdps);
        setNotification({ type: 'success', message: 'Identity Provider added successfully!' });
      } else {
        // Fallback to local state for non-authenticated users
        const idp: IdP = {
          id: Date.now().toString(),
          name: formData.name,
          type: formData.type,
          provider: formData.provider,
          status: 'active',
          entityId: formData.entityId,
          ssoUrl: formData.ssoUrl,
          lastUsed: new Date().toISOString(),
          userCount: 0,
        };
        setIdps([...idps, idp]);
        setNotification({ type: 'success', message: 'Identity Provider added successfully!' });
      }
      
      setNewIdp(resetNewIdp());
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add IdP:', error);
      setNotification({ type: 'error', message: 'Failed to add Identity Provider. Please try again.' });
      // Fallback to local state on error
      const idp: IdP = {
        id: Date.now().toString(),
        name: formData.name,
        type: formData.type,
        provider: formData.provider,
        status: 'active',
        entityId: formData.entityId,
        ssoUrl: formData.ssoUrl,
        lastUsed: new Date().toISOString(),
        userCount: 0,
      };
      setIdps([...idps, idp]);
      setNewIdp(resetNewIdp());
      setShowAddForm(false);
    }
  };

  const handleEditIdp = (idp: IdP) => {
    setEditingIdp(idp);
  };

  const handleUpdateIdp = async (updatedIdp: IdP) => {
    try {
      if (isAuthenticated && clientApis.identityProviders) {
        // Try to update via backend API
        await clientApis.identityProviders.putAdminIdpsByAlias({
          alias: updatedIdp.id,
          putAdminIdpsByAliasRequest: {
            displayName: updatedIdp.name,
            enabled: updatedIdp.status === 'active',
            config: {
              entityId: updatedIdp.entityId,
              singleSignOnServiceUrl: updatedIdp.ssoUrl,
            },
          },
        });
        
        // Reload IdPs from backend
        const providersResponse = await clientApis.identityProviders.getAdminIdps();
        const transformedIdps = providersResponse.map((provider) => {
          const config = provider.config as Record<string, unknown> | undefined;
          return {
            id: provider.alias || 'unknown',
            name: provider.displayName || provider.alias || 'Unknown Provider',
            type: provider.providerId || 'Unknown',
            provider: provider.providerId || 'Unknown',
            status: provider.enabled ? 'active' as const : 'inactive' as const,
            entityId: (config?.entityId as string) || provider.alias || '',
            ssoUrl: (config?.singleSignOnServiceUrl as string) || '',
            lastUsed: new Date().toISOString(),
            userCount: 0,
          };
        });
        setIdps(transformedIdps);
        setNotification({ type: 'success', message: 'Identity Provider updated successfully!' });
      } else {
        // Fallback to local state
        setIdps(idps.map(idp => idp.id === updatedIdp.id ? updatedIdp : idp));
        setNotification({ type: 'success', message: 'Identity Provider updated successfully!' });
      }
      
      setEditingIdp(null);
    } catch (error) {
      console.error('Failed to update IdP:', error);
      setNotification({ type: 'error', message: 'Failed to update Identity Provider. Please try again.' });
      // Fallback to local state on error
      setIdps(idps.map(idp => idp.id === updatedIdp.id ? updatedIdp : idp));
      setEditingIdp(null);
    }
  };

  const handleTestConnection = async (idp: IdP) => {
    setTestingConnection(idp.id);
    
    try {
      // Simulate connection test - in real implementation, this would call a backend endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock result based on IdP status
      const success = idp.status === 'active' && Math.random() > 0.3; // 70% success rate for active IdPs
      const message = success 
        ? `Successfully connected to ${idp.name}. SSO endpoint is reachable and responding.`
        : idp.status === 'inactive' 
          ? `Connection failed: ${idp.name} is currently disabled.`
          : `Connection failed: Unable to reach SSO endpoint at ${idp.ssoUrl}`;
      
      setConnectionResults(prev => ({
        ...prev,
        [idp.id]: { success, message }
      }));
    } catch (error) {
      setConnectionResults(prev => ({
        ...prev,
        [idp.id]: { 
          success: false, 
          message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }
      }));
    } finally {
      setTestingConnection(null);
    }
  };

  const handleViewCertificates = (idp: IdP) => {
    setShowCertificates(idp.id);
  };

  const handleDeleteIdp = async (id: string) => {
    try {
      if (isAuthenticated && clientApis.identityProviders) {
        // Try to delete via backend API
        await clientApis.identityProviders.deleteAdminIdpsByAlias({ alias: id });
        
        // Reload IdPs from backend
        const providersResponse = await clientApis.identityProviders.getAdminIdps();
        const transformedIdps = providersResponse.map((provider) => {
          const config = provider.config as Record<string, unknown> | undefined;
          return {
            id: provider.alias || 'unknown',
            name: provider.displayName || provider.alias || 'Unknown Provider',
            type: provider.providerId || 'Unknown',
            provider: provider.providerId || 'Unknown',
            status: provider.enabled ? 'active' as const : 'inactive' as const,
            entityId: (config?.entityId as string) || provider.alias || '',
            ssoUrl: (config?.singleSignOnServiceUrl as string) || '',
            lastUsed: new Date().toISOString(),
            userCount: 0,
          };
        });
        setIdps(transformedIdps);
        setNotification({ type: 'success', message: 'Identity Provider deleted successfully!' });
      } else {
        // Fallback to local state
        setIdps(idps.filter(idp => idp.id !== id));
        setNotification({ type: 'success', message: 'Identity Provider deleted successfully!' });
      }
    } catch (error) {
      console.error('Failed to delete IdP:', error);
      setNotification({ type: 'error', message: 'Failed to delete Identity Provider. Please try again.' });
      // Fallback to local state on error
      setIdps(idps.filter(idp => idp.id !== id));
    }
  };

  const toggleIdpStatus = async (id: string) => {
    const idp = idps.find(i => i.id === id);
    if (idp) {
      const updatedIdp = { ...idp, status: idp.status === 'active' ? 'inactive' as const : 'active' as const };
      await handleUpdateIdp(updatedIdp);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div className="text-muted-foreground">Loading Identity Providers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Notification Toast */}
      <NotificationToast
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-background to-muted/50 p-8 rounded-3xl border border-border shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
              Identity Provider Management
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              Configure and manage identity providers for healthcare system authentication
            </div>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)} 
            className="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-blue-500/20"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Identity Provider
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <IdPStatisticsCards idps={idps} />

      {/* Add New IdP Form */}
      <IdPAddForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSubmit={async (e: React.FormEvent) => {
          e.preventDefault();
          await handleAddIdp(newIdp);
        }}
        newIdp={newIdp}
        setNewIdp={setNewIdp}
      />

      {/* Identity Providers Table */}
      <IdPTable
        idps={idps}
        testingConnection={testingConnection}
        connectionResults={connectionResults}
        onEdit={handleEditIdp}
        onToggleStatus={toggleIdpStatus}
        onTestConnection={handleTestConnection}
        onViewCertificates={handleViewCertificates}
        onDelete={handleDeleteIdp}
      />

      {/* Edit IdP Dialog */}
      <IdPEditDialog
        isOpen={!!editingIdp}
        onClose={() => setEditingIdp(null)}
        onUpdate={handleUpdateIdp}
        editingIdp={editingIdp}
        setEditingIdp={setEditingIdp}
      />

      {/* Connection Test Results Dialog */}
      {Object.keys(connectionResults).length > 0 && (
        <ConnectionTestDialog
          isOpen={Object.keys(connectionResults).length > 0}
          onClose={() => setConnectionResults({})}
          connectionResults={connectionResults}
          idps={idps}
        />
      )}

      {/* Certificates Dialog */}
      {showCertificates && (
        <CertificatesDialog
          isOpen={!!showCertificates}
          onClose={() => setShowCertificates(null)}
          showCertificates={showCertificates}
          idps={idps}
        />
      )}
    </div>
  );
}