import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface IdP {
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
}

interface IdPAddFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  newIdp: IdP;
  setNewIdp: (idp: IdP) => void;
}

export function IdPAddForm({ isOpen, onClose, onSubmit, newIdp, setNewIdp }: IdPAddFormProps) {
  if (!isOpen) return null;

  return (
    <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center shadow-sm">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">Add New Identity Provider</h3>
            <p className="text-muted-foreground font-medium">Configure a new identity provider for healthcare system authentication</p>
          </div>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-semibold text-foreground">Provider Name</Label>
            <Input
              id="name"
              placeholder="e.g., Hospital Azure AD"
              value={newIdp.name}
              onChange={(e) => setNewIdp({ ...newIdp, name: e.target.value })}
              className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="provider" className="text-sm font-semibold text-foreground">Provider Type</Label>
            <Input
              id="provider"
              placeholder="e.g., Microsoft Azure, Google, Okta"
              value={newIdp.provider}
              onChange={(e) => setNewIdp({ ...newIdp, provider: e.target.value })}
              className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="type" className="text-sm font-semibold text-foreground">Authentication Type</Label>
            <select
              id="type"
              className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200"
              value={newIdp.type}
              onChange={(e) => setNewIdp({ ...newIdp, type: e.target.value })}
            >
              <option value="SAML">SAML 2.0</option>
              <option value="OAuth2">OAuth 2.0</option>
              <option value="OIDC">OpenID Connect</option>
              <option value="LDAP">LDAP</option>
            </select>
          </div>
          <div className="space-y-3">
            <Label htmlFor="entityId" className="text-sm font-semibold text-foreground">Entity ID / Client ID</Label>
            <Input
              id="entityId"
              placeholder="Entity identifier or client ID"
              value={newIdp.entityId}
              onChange={(e) => setNewIdp({ ...newIdp, entityId: e.target.value })}
              className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="ssoUrl" className="text-sm font-semibold text-foreground">SSO URL / Authorization Endpoint</Label>
          <Input
            id="ssoUrl"
            type="url"
            placeholder="https://login.provider.com/sso"
            value={newIdp.ssoUrl}
            onChange={(e) => setNewIdp({ ...newIdp, ssoUrl: e.target.value })}
            className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
            required
          />
        </div>

        {/* Additional Configuration Fields */}
        <div className="mt-8 pt-6 border-t border-border">
          <h4 className="text-lg font-semibold text-foreground mb-4">Additional Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <Label htmlFor="displayName" className="text-sm font-semibold text-foreground">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Friendly name for users"
                value={newIdp.displayName}
                onChange={(e) => setNewIdp({ ...newIdp, displayName: e.target.value })}
                className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="issuer" className="text-sm font-semibold text-foreground">Issuer</Label>
              <Input
                id="issuer"
                placeholder="Identity provider issuer URL"
                value={newIdp.issuer}
                onChange={(e) => setNewIdp({ ...newIdp, issuer: e.target.value })}
                className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
          </div>

          {/* OIDC/OAuth2 specific fields */}
          {(newIdp.type === 'OIDC' || newIdp.type === 'OAuth2') && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="clientSecret" className="text-sm font-semibold text-foreground">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="OAuth2/OIDC client secret"
                    value={newIdp.clientSecret}
                    onChange={(e) => setNewIdp({ ...newIdp, clientSecret: e.target.value })}
                    className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="tokenUrl" className="text-sm font-semibold text-foreground">Token URL</Label>
                  <Input
                    id="tokenUrl"
                    type="url"
                    placeholder="https://login.provider.com/token"
                    value={newIdp.tokenUrl}
                    onChange={(e) => setNewIdp({ ...newIdp, tokenUrl: e.target.value })}
                    className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="userInfoUrl" className="text-sm font-semibold text-foreground">User Info URL</Label>
                  <Input
                    id="userInfoUrl"
                    type="url"
                    placeholder="https://login.provider.com/userinfo"
                    value={newIdp.userInfoUrl}
                    onChange={(e) => setNewIdp({ ...newIdp, userInfoUrl: e.target.value })}
                    className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="defaultScopes" className="text-sm font-semibold text-foreground">Default Scopes</Label>
                  <Input
                    id="defaultScopes"
                    placeholder="openid profile email"
                    value={newIdp.defaultScopes}
                    onChange={(e) => setNewIdp({ ...newIdp, defaultScopes: e.target.value })}
                    className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SAML specific fields */}
          {newIdp.type === 'SAML' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="signatureAlgorithm" className="text-sm font-semibold text-foreground">Signature Algorithm</Label>
                  <select
                    id="signatureAlgorithm"
                    className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200"
                    value={newIdp.signatureAlgorithm}
                    onChange={(e) => setNewIdp({ ...newIdp, signatureAlgorithm: e.target.value })}
                  >
                    <option value="RS256">RSA-SHA256</option>
                    <option value="RS384">RSA-SHA384</option>
                    <option value="RS512">RSA-SHA512</option>
                    <option value="ES256">ECDSA-SHA256</option>
                    <option value="ES384">ECDSA-SHA384</option>
                    <option value="ES512">ECDSA-SHA512</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="nameIdFormat" className="text-sm font-semibold text-foreground">NameID Format</Label>
                  <select
                    id="nameIdFormat"
                    className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200"
                    value={newIdp.nameIdFormat}
                    onChange={(e) => setNewIdp({ ...newIdp, nameIdFormat: e.target.value })}
                  >
                    <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">Persistent</option>
                    <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">Transient</option>
                    <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">Email Address</option>
                    <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">Unspecified</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="certificate" className="text-sm font-semibold text-foreground">X.509 Certificate</Label>
                <Textarea
                  id="certificate"
                  placeholder="-----BEGIN CERTIFICATE-----&#10;MIIBIjANBgkqhkiG9w0BAQ...&#10;-----END CERTIFICATE-----"
                  value={newIdp.certificate}
                  onChange={(e) => setNewIdp({ ...newIdp, certificate: e.target.value })}
                  className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm min-h-[120px]"
                  rows={5}
                />
              </div>
            </div>
          )}

          {/* Common additional fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3">
              <Label htmlFor="logoutUrl" className="text-sm font-semibold text-foreground">Logout URL</Label>
              <Input
                id="logoutUrl"
                type="url"
                placeholder="https://login.provider.com/logout"
                value={newIdp.logoutUrl}
                onChange={(e) => setNewIdp({ ...newIdp, logoutUrl: e.target.value })}
                className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="metadataUrl" className="text-sm font-semibold text-foreground">Metadata URL</Label>
              <Input
                id="metadataUrl"
                type="url"
                placeholder="https://login.provider.com/.well-known/metadata"
                value={newIdp.metadataUrl}
                onChange={(e) => setNewIdp({ ...newIdp, metadataUrl: e.target.value })}
                className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
          </div>

          {/* Security Options */}
          <div className="mt-6 pt-4 border-t border-border">
            <h5 className="text-md font-semibold text-foreground mb-4">Security Options</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="validateSignature"
                  checked={newIdp.validateSignature}
                  onChange={(e) => setNewIdp({ ...newIdp, validateSignature: e.target.checked })}
                  className="rounded border-border"
                />
                <Label htmlFor="validateSignature" className="text-sm text-foreground">Validate Signature</Label>
              </div>
              {newIdp.type === 'SAML' && (
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="wantAuthnRequestsSigned"
                    checked={newIdp.wantAuthnRequestsSigned}
                    onChange={(e) => setNewIdp({ ...newIdp, wantAuthnRequestsSigned: e.target.checked })}
                    className="rounded border-border"
                  />
                  <Label htmlFor="wantAuthnRequestsSigned" className="text-sm text-foreground">Want AuthnRequests Signed</Label>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <Button 
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Add Identity Provider
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="px-8 py-3 border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
