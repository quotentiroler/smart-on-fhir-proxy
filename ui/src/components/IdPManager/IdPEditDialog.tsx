import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Shield } from 'lucide-react';

interface IdP {
  id: string;
  name: string;
  type: string;
  provider: string;
  entityId: string;
  ssoUrl: string;
  status: 'active' | 'inactive';
  userCount: number;
  lastUsed: string;
}

interface IdPEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (idp: IdP) => Promise<void>;
  editingIdp: IdP | null;
  setEditingIdp: (idp: IdP | null) => void;
}

export function IdPEditDialog({ 
  isOpen, 
  onClose, 
  onUpdate, 
  editingIdp, 
  setEditingIdp 
}: IdPEditDialogProps) {
  if (!editingIdp) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/40 rounded-xl flex items-center justify-center shadow-sm">
              <Edit className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                Edit Identity Provider
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                Modify the configuration for {editingIdp.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.preventDefault();
          onUpdate(editingIdp);
        }} className="space-y-6">
          {/* Basic Configuration */}
          <div className="bg-card/50 p-6 rounded-xl border border-border">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Basic Configuration</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="edit-name" className="text-sm font-semibold text-foreground">Provider Name</Label>
                <Input
                  id="edit-name"
                  value={editingIdp.name}
                  onChange={(e) => setEditingIdp({ ...editingIdp, name: e.target.value })}
                  className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-provider" className="text-sm font-semibold text-foreground">Provider Type</Label>
                <Input
                  id="edit-provider"
                  value={editingIdp.provider}
                  onChange={(e) => setEditingIdp({ ...editingIdp, provider: e.target.value })}
                  className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-3">
                <Label htmlFor="edit-type" className="text-sm font-semibold text-foreground">Authentication Type</Label>
                <select
                  id="edit-type"
                  className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200"
                  value={editingIdp.type}
                  onChange={(e) => setEditingIdp({ ...editingIdp, type: e.target.value })}
                >
                  <option value="SAML">SAML 2.0</option>
                  <option value="OAuth2">OAuth 2.0</option>
                  <option value="OIDC">OpenID Connect</option>
                  <option value="LDAP">LDAP</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-entityId" className="text-sm font-semibold text-foreground">Entity ID / Client ID</Label>
                <Input
                  id="edit-entityId"
                  value={editingIdp.entityId}
                  onChange={(e) => setEditingIdp({ ...editingIdp, entityId: e.target.value })}
                  className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-3 mt-6">
              <Label htmlFor="edit-ssoUrl" className="text-sm font-semibold text-foreground">SSO URL / Authorization Endpoint</Label>
              <Input
                id="edit-ssoUrl"
                value={editingIdp.ssoUrl}
                onChange={(e) => setEditingIdp({ ...editingIdp, ssoUrl: e.target.value })}
                className="rounded-xl border-border focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Update Provider
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
      </DialogContent>
    </Dialog>
  );
}
