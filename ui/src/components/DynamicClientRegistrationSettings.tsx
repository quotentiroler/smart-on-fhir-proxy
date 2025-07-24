import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Shield,
  Clock,
  Globe,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ExternalLink
} from 'lucide-react';
import { createAuthenticatedApiClients } from '@/lib/apiClient';
import type { GetAdminClientRegistrationSettings200Response } from '@/lib/api-client/models';

// Simple Switch component since we don't have one
const Switch = ({ 
  id, 
  checked, 
  onCheckedChange 
}: { 
  id: string; 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void 
}) => (
  <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      id={id}
      className="sr-only"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
    <div className={`w-11 h-6 rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    }`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      } m-0.5`} />
    </div>
  </label>
);

interface ClientRegistrationSettings {
  enabled: boolean;
  requireHttps: boolean;
  allowedScopes: string[];
  maxClientLifetime: number;
  requireTermsOfService: boolean;
  requirePrivacyPolicy: boolean;
  allowPublicClients: boolean;
  allowConfidentialClients: boolean;
  allowBackendServices: boolean;
  adminApprovalRequired: boolean;
  rateLimitPerMinute: number;
  maxRedirectUris: number;
  allowedRedirectUriPatterns: string[];
  notificationEmail?: string;
}

const DEFAULT_SCOPES = [
  'openid',
  'profile',
  'fhirUser',
  'launch',
  'launch/patient',
  'launch/encounter',
  'patient/*.read',
  'patient/*.rs',
  'user/*.read',
  'user/*.rs',
  'online_access'
];

const DEFAULT_REDIRECT_PATTERNS = [
  'https://.*',
  'http://localhost:.*',
  'http://127\\.0\\.0\\.1:.*'
];

export function DynamicClientRegistrationSettings() {
  const [settings, setSettings] = useState<ClientRegistrationSettings>({
    enabled: true,
    requireHttps: true,
    allowedScopes: DEFAULT_SCOPES,
    maxClientLifetime: 365,
    requireTermsOfService: false,
    requirePrivacyPolicy: false,
    allowPublicClients: true,
    allowConfidentialClients: true,
    allowBackendServices: false,
    adminApprovalRequired: false,
    rateLimitPerMinute: 10,
    maxRedirectUris: 5,
    allowedRedirectUriPatterns: DEFAULT_REDIRECT_PATTERNS,
    notificationEmail: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newScope, setNewScope] = useState('');
  const [newPattern, setNewPattern] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const apiClients = createAuthenticatedApiClients();
      const settingsData = await apiClients.admin.getAdminClientRegistrationSettings();
      
      setSettings(settingsData);
      setMessage({ type: 'success', text: 'Settings loaded successfully' });
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to load settings' 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const apiClients = createAuthenticatedApiClients();
      await apiClients.admin.putAdminClientRegistrationSettings({
        getAdminClientRegistrationSettings200Response: settings as GetAdminClientRegistrationSettings200Response
      });
      
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save settings' 
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const apiClients = createAuthenticatedApiClients();
      await apiClients.admin.postAdminClientRegistrationResetDefaults();
      
      // Reload the settings after reset
      await loadSettings();
      setMessage({ type: 'success', text: 'Settings reset to defaults successfully' });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to reset settings' 
      });
    } finally {
      setSaving(false);
    }
  };

  const addScope = () => {
    if (newScope && !settings.allowedScopes.includes(newScope)) {
      setSettings(prev => ({
        ...prev,
        allowedScopes: [...prev.allowedScopes, newScope]
      }));
      setNewScope('');
    }
  };

  const removeScope = (scope: string) => {
    setSettings(prev => ({
      ...prev,
      allowedScopes: prev.allowedScopes.filter(s => s !== scope)
    }));
  };

  const addPattern = () => {
    if (newPattern && !settings.allowedRedirectUriPatterns.includes(newPattern)) {
      setSettings(prev => ({
        ...prev,
        allowedRedirectUriPatterns: [...prev.allowedRedirectUriPatterns, newPattern]
      }));
      setNewPattern('');
    }
  };

  const removePattern = (pattern: string) => {
    setSettings(prev => ({
      ...prev,
      allowedRedirectUriPatterns: prev.allowedRedirectUriPatterns.filter(p => p !== pattern)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading registration settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header matching the app style */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-3xl border border-blue-100/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
                  Dynamic Client Registration
                </h2>
                <div className="text-gray-600 text-lg flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  Configure RFC 7591 automated app registration settings
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={settings.enabled ? "default" : "secondary"} className="px-3 py-1">
                {settings.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ExternalLink className="w-4 h-4" />
                <span>Public endpoint: <code className="bg-gray-100 px-2 py-1 rounded">/auth/register</code></span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              disabled={saving}
              className="px-8 py-3 rounded-xl"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Defaults
            </Button>
            <Button 
              onClick={saveSettings}
              disabled={saving}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards matching app style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-semibold text-blue-800 tracking-wide">Registration</div>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-2">{settings.enabled ? 'Active' : 'Inactive'}</div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-sm font-semibold text-green-800 tracking-wide">Allowed Scopes</div>
              </div>
              <div className="text-3xl font-bold text-green-900 mb-2">{settings.allowedScopes.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-sm font-semibold text-purple-800 tracking-wide">Client Lifetime</div>
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-2">{settings.maxClientLifetime || '∞'}</div>
              <div className="text-sm text-purple-600">{settings.maxClientLifetime ? 'days' : 'unlimited'}</div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Globe className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-sm font-semibold text-orange-800 tracking-wide">URI Patterns</div>
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-2">{settings.allowedRedirectUriPatterns.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Basic Settings</h3>
                <p className="text-gray-600 font-medium">Core configuration for dynamic client registration</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">{/* ... existing content ... */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enabled">Enable Dynamic Registration</Label>
                <p className="text-sm text-gray-500">Allow apps to register automatically via public endpoint</p>
              </div>
              <Switch
                id="enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="requireHttps">Require HTTPS</Label>
                <p className="text-sm text-gray-500">Enforce HTTPS for redirect URIs (localhost exempted)</p>
              </div>
              <Switch
                id="requireHttps"
                checked={settings.requireHttps}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireHttps: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="adminApproval">Admin Approval Required</Label>
                <p className="text-sm text-gray-500">New clients need manual approval before activation</p>
              </div>
              <Switch
                id="adminApproval"
                checked={settings.adminApprovalRequired}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, adminApprovalRequired: checked }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rateLimit">Rate Limit (per minute)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.rateLimitPerMinute}
                  onChange={(e) => setSettings(prev => ({ ...prev, rateLimitPerMinute: parseInt(e.target.value) || 10 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRedirectUris">Max Redirect URIs</Label>
                <Input
                  id="maxRedirectUris"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxRedirectUris}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxRedirectUris: parseInt(e.target.value) || 5 }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Types */}
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Allowed Client Types</h3>
                <p className="text-gray-600 font-medium">Which types of OAuth2 clients can register</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">{/* ... existing content ... */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="allowPublic">Public Clients</Label>
                <p className="text-sm text-gray-500">Web apps, mobile apps (no client secret)</p>
              </div>
              <Switch
                id="allowPublic"
                checked={settings.allowPublicClients}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowPublicClients: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="allowConfidential">Confidential Clients</Label>
                <p className="text-sm text-gray-500">Server-side apps with client secret</p>
              </div>
              <Switch
                id="allowConfidential"
                checked={settings.allowConfidentialClients}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowConfidentialClients: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="allowBackend">Backend Services</Label>
                <p className="text-sm text-gray-500">System-to-system integrations (client_credentials)</p>
              </div>
              <Switch
                id="allowBackend"
                checked={settings.allowBackendServices}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowBackendServices: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="requireTos">Require Terms of Service</Label>
                <p className="text-sm text-gray-500">Apps must provide TOS URI</p>
              </div>
              <Switch
                id="requireTos"
                checked={settings.requireTermsOfService}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireTermsOfService: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="requirePrivacy">Require Privacy Policy</Label>
                <p className="text-sm text-gray-500">Apps must provide privacy policy URI</p>
              </div>
              <Switch
                id="requirePrivacy"
                checked={settings.requirePrivacyPolicy}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requirePrivacyPolicy: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lifetime & Notifications */}
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Lifetime & Notifications</h3>
                <p className="text-gray-600 font-medium">Client expiration and notification settings</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">{/* ... existing content ... */}
            <div className="space-y-2">
              <Label htmlFor="lifetime">Client Lifetime (days)</Label>
              <Input
                id="lifetime"
                type="number"
                min="0"
                max="3650"
                value={settings.maxClientLifetime}
                onChange={(e) => setSettings(prev => ({ ...prev, maxClientLifetime: parseInt(e.target.value) || 0 }))}
                placeholder="0 = no expiration"
              />
              <p className="text-sm text-gray-500">
                {settings.maxClientLifetime === 0 ? 'Clients never expire' : `Clients expire after ${settings.maxClientLifetime} days`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notificationEmail">Notification Email</Label>
              <Input
                id="notificationEmail"
                type="email"
                value={settings.notificationEmail || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                placeholder="admin@example.com"
              />
              <p className="text-sm text-gray-500">
                Get notified when new clients register
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Allowed Scopes */}
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Allowed Scopes</h3>
                <p className="text-gray-600 font-medium">SMART scopes that can be requested during registration</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{/* ... existing content ... */}
            <div className="flex space-x-2">
              <Input
                value={newScope}
                onChange={(e) => setNewScope(e.target.value)}
                placeholder="e.g., patient/*.write"
                onKeyDown={(e) => e.key === 'Enter' && addScope()}
              />
              <Button onClick={addScope} size="sm">Add</Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {settings.allowedScopes.map((scope) => (
                <div key={scope} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                  <code className="text-sm">{scope}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeScope(scope)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redirect URI Patterns */}
      <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Allowed Redirect URI Patterns</h3>
              <p className="text-gray-600 font-medium">Regular expression patterns for validating redirect URIs</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{/* ... existing content ... */}
          <div className="flex space-x-2">
            <Input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="e.g., https://myapp\\.example\\.com/.*"
              onKeyDown={(e) => e.key === 'Enter' && addPattern()}
            />
            <Button onClick={addPattern} size="sm">Add Pattern</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {settings.allowedRedirectUriPatterns.map((pattern, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <code className="text-sm flex-1 mr-2">{pattern}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePattern(pattern)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
