import { useState } from 'react';
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
import {
  Settings,
  Check,
  AlertCircle,
  Loader2,
  Server,
  Shield
} from 'lucide-react';
import { createApiClients } from '@/lib/apiClient';

interface KeycloakConfigFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function KeycloakConfigForm({ onSuccess, onCancel }: KeycloakConfigFormProps) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:8080');
  const [realm, setRealm] = useState('smart-on-fhir');
  const [adminClientId, setAdminClientId] = useState('');
  const [adminClientSecret, setAdminClientSecret] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiClients = createApiClients(); // No auth needed for these endpoints

  const handleTest = async () => {
    if (!baseUrl.trim() || !realm.trim()) {
      setError('Please enter both Keycloak URL and realm name');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await apiClients.admin.postAdminKeycloakConfigTest({
        postAdminKeycloakConfigTestRequest: {
          baseUrl: baseUrl.trim(),
          realm: realm.trim()
        }
      });

      setTestResult({
        success: result.success,
        message: result.message || result.error || 'Test completed'
      });
    } catch (err) {
      console.error('Failed to test Keycloak connection:', err);
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please check the URL and try again.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!baseUrl.trim() || !realm.trim()) {
      setError('Please enter both Keycloak URL and realm name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await apiClients.admin.postAdminKeycloakConfigConfigure({
        postAdminKeycloakConfigConfigureRequest: {
          baseUrl: baseUrl.trim(),
          realm: realm.trim(),
          adminClientId: adminClientId.trim() || undefined,
          adminClientSecret: adminClientSecret.trim() || undefined
        }
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Failed to save Keycloak configuration:', err);
      setError('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">Configure Keycloak</CardTitle>
        <p className="text-sm text-muted-foreground">
          Set up your Keycloak connection to enable authentication
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {testResult && (
          <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {testResult.success ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="flex items-center space-x-2">
              <Server className="w-4 h-4" />
              <span>Keycloak URL</span>
            </Label>
            <Input
              id="baseUrl"
              type="url"
              placeholder="http://localhost:8080"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={testing || saving}
            />
            <p className="text-xs text-muted-foreground">
              The base URL of your Keycloak server
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="realm">Realm Name</Label>
            <Input
              id="realm"
              placeholder="smart-on-fhir"
              value={realm}
              onChange={(e) => setRealm(e.target.value)}
              disabled={testing || saving}
            />
            <p className="text-xs text-muted-foreground">
              The name of your Keycloak realm
            </p>
          </div>

          <div className="border-t pt-4">
            <Label className="flex items-center space-x-2 mb-3">
              <Shield className="w-4 h-4" />
              <span>Admin Client (Optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Required only for dynamic client registration. You can skip this and add it later.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="adminClientId">Client ID</Label>
                <Input
                  id="adminClientId"
                  placeholder="admin-ui"
                  value={adminClientId}
                  onChange={(e) => setAdminClientId(e.target.value)}
                  disabled={testing || saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminClientSecret">Client Secret</Label>
                <Input
                  id="adminClientSecret"
                  type="password"
                  placeholder="Enter client secret..."
                  value={adminClientSecret}
                  onChange={(e) => setAdminClientSecret(e.target.value)}
                  disabled={testing || saving}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || saving || !baseUrl.trim() || !realm.trim()}
            className="flex-1"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || testing || !baseUrl.trim() || !realm.trim()}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Connect'
            )}
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={testing || saving}
          className="w-full"
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}
