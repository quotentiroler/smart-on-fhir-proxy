import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Settings,
  Shield,
  Edit,
  Eye,
  Trash2,
  X,
  CheckCircle,
  Server,
  Users,
  Globe,
  AlertCircle,
} from 'lucide-react';
import type { SmartApp, ScopeSet, SmartAppType, AuthenticationType } from '@/types/smartApp';

interface SmartAppsTableProps {
  apps: SmartApp[];
  scopeSets: ScopeSet[];
  onToggleAppStatus: (id: string) => void;
  onOpenScopeEditor: (app: SmartApp) => void;
  onDeleteApp: (id: string) => void;
}

export function SmartAppsTable({
  apps,
  scopeSets,
  onToggleAppStatus,
  onOpenScopeEditor,
  onDeleteApp,
}: SmartAppsTableProps) {
  const getServerAccessBadge = (app: SmartApp) => {
    switch (app.serverAccessType) {
      case 'all-servers':
        return {
          label: 'All Servers',
          className: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300',
          icon: Globe,
        };
      case 'specific-servers':
        return {
          label: `${app.allowedServerIds?.length || 0} Servers`,
          className: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300',
          icon: Server,
        };
      case 'user-person-servers':
        return {
          label: 'User Person Servers',
          className: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300',
          icon: Users,
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300',
          icon: AlertCircle,
        };
    }
  };

  const getAppTypeBadge = (appType: SmartAppType, authenticationType: AuthenticationType) => {
    switch (appType) {
      case 'backend-service':
        return {
          label: 'Backend Service',
          className: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300',
        };
      case 'standalone-app':
        return {
          label: `Standalone (${authenticationType === 'asymmetric' ? 'Asymmetric' : 'Symmetric'})`,
          className: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300',
        };
      case 'ehr-launch-app':
        return {
          label: `EHR Launch (${authenticationType === 'asymmetric' ? 'Asymmetric' : 'Symmetric'})`,
          className: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300',
        };
      case 'agent':
        return {
          label: `AI Agent (${authenticationType === 'asymmetric' ? 'Asymmetric' : 'Symmetric'})`,
          className: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300',
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300',
        };
    }
  };

  const getAppTypeIcon = (appType: SmartAppType) => {
    switch (appType) {
      case 'backend-service':
        return '🔧';
      case 'standalone-app':
        return '📱';
      case 'ehr-launch-app':
        return '🏥';
      case 'agent':
        return '🤖';
      default:
        return '❓';
    }
  };

  const getScopeSetName = (scopeSetId?: string) => {
    if (!scopeSetId) return 'Custom';
    const scopeSet = scopeSets.find(set => set.id === scopeSetId);
    return scopeSet ? scopeSet.name : 'Unknown';
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="p-8 pb-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
            <Settings className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Registered Applications</h3>
            <p className="text-gray-600 font-medium">View and manage all SMART on FHIR applications</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200/50">
                <TableHead className="font-semibold text-gray-700">Application</TableHead>
                <TableHead className="font-semibold text-gray-700">Type & Auth</TableHead>
                <TableHead className="font-semibold text-gray-700">Server Access</TableHead>
                <TableHead className="font-semibold text-gray-700">Client ID</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Scopes</TableHead>
                <TableHead className="font-semibold text-gray-700">Last Used</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => {
                const appTypeBadge = getAppTypeBadge(app.appType, app.authenticationType);
                return (
                  <TableRow key={app.id} className="border-gray-200/50 hover:bg-gray-50/50 transition-colors duration-200">
                    <TableCell>
                      <div className="py-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getAppTypeIcon(app.appType)}</span>
                          <div>
                            <div className="font-semibold text-gray-900">{app.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{app.description}</div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${appTypeBadge.className} shadow-sm`}>
                        {appTypeBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const accessBadge = getServerAccessBadge(app);
                        const IconComponent = accessBadge.icon;
                        return (
                          <div className="space-y-1">
                            <Badge className={`${accessBadge.className} shadow-sm`}>
                              <IconComponent className="w-3 h-3 mr-1" />
                              {accessBadge.label}
                            </Badge>
                            {app.serverAccessType === 'specific-servers' && app.allowedServerIds && (
                              <div className="text-xs text-gray-500">
                                {app.allowedServerIds.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <code className="bg-gradient-to-r from-gray-100 to-gray-200 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 shadow-sm">
                        {app.clientId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={app.status === 'active' ? 'default' : 'secondary'}
                        className={app.status === 'active'
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-sm'
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-sm'
                        }
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {getScopeSetName(app.scopeSetId)}
                          </span>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {app.scopes.length} scopes
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {app.scopes.slice(0, 2).map((scope, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-mono">
                              {scope.split('/')[1]?.split('.')[0] || scope}
                            </Badge>
                          ))}
                          {app.scopes.length > 2 && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              +{app.scopes.length - 2}
                            </Badge>
                          )}
                        </div>
                        {app.customScopes.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              +{app.customScopes.length} custom
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-medium">
                      {app.lastUsed}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-gray-200/50 shadow-lg">
                          <DropdownMenuItem onClick={() => onToggleAppStatus(app.id)} className="rounded-lg">
                            <div className="flex items-center">
                              {app.status === 'active' ? (
                                <X className="w-4 h-4 mr-2 text-red-600" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                              )}
                              {app.status === 'active' ? 'Deactivate' : 'Activate'}
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onOpenScopeEditor(app)} className="rounded-lg">
                            <Shield className="w-4 h-4 mr-2 text-blue-600" />
                            Manage Scopes
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg">
                            <Edit className="w-4 h-4 mr-2 text-gray-600" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg">
                            <Eye className="w-4 h-4 mr-2 text-gray-600" />
                            View Configuration
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg">
                            <Settings className="w-4 h-4 mr-2 text-gray-600" />
                            Authentication Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteApp(app.id)}
                            className="text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
