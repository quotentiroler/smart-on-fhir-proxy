import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Shield, 
  Edit, 
  TestTube, 
  FileText, 
  XCircle, 
  Loader2, 
  CheckCircle 
} from 'lucide-react';

interface IdP {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: 'active' | 'inactive';
  entityId: string;
  ssoUrl: string;
  userCount: number;
  lastUsed: string;
}

interface IdPTableProps {
  idps: IdP[];
  testingConnection: string | null;
  connectionResults: Record<string, { success: boolean; message: string }>;
  onToggleStatus: (id: string) => void;
  onEdit: (idp: IdP) => void;
  onTestConnection: (idp: IdP) => Promise<void>;
  onViewCertificates: (idp: IdP) => void;
  onDelete: (id: string) => void;
}

export function IdPTable({
  idps,
  testingConnection,
  connectionResults,
  onToggleStatus,
  onEdit,
  onTestConnection,
  onViewCertificates,
  onDelete
}: IdPTableProps) {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'SAML':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'OAuth2':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'OIDC':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'LDAP':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div className="backdrop-blur-sm bg-card/90 rounded-2xl shadow-xl border border-border p-8 transition-all duration-300 hover:shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Identity Providers
        </h3>
        <p className="text-muted-foreground">
          View and manage all configured identity providers
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-muted/50 to-muted/70 hover:from-muted/70 hover:to-muted/90 border-b border-border">
              <TableHead className="font-semibold text-foreground">Provider</TableHead>
              <TableHead className="font-semibold text-foreground">Type</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
              <TableHead className="font-semibold text-foreground">Users</TableHead>
              <TableHead className="font-semibold text-foreground">Last Used</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {idps.map((idp) => (
              <TableRow key={idp.id} className="hover:bg-muted/30 transition-colors duration-200 border-b border-border/50">
                <TableCell className="py-4">
                  <div>
                    <div className="font-medium text-foreground">{idp.name}</div>
                    <div className="text-sm text-muted-foreground">{idp.provider}</div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Badge className={`${getTypeBadgeColor(idp.type)} shadow-sm`}>
                    {idp.type}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <Badge 
                    variant={idp.status === 'active' ? 'default' : 'secondary'}
                    className={`${idp.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'} shadow-sm`}
                  >
                    {idp.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-sm font-medium text-foreground">{idp.userCount}</span>
                  <span className="text-xs text-muted-foreground ml-1">users</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground py-4">
                  {new Date(idp.lastUsed).toLocaleDateString()}
                </TableCell>
                <TableCell className="py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50 transition-colors duration-200 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover/90 backdrop-blur-sm border border-border shadow-xl">
                      <DropdownMenuItem onClick={() => onToggleStatus(idp.id)} className="hover:bg-muted/50">
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          {idp.status === 'active' ? 'Disable' : 'Enable'}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(idp)} className="hover:bg-muted/50">
                        <div className="flex items-center">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Configuration
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onTestConnection(idp)} 
                        className="hover:bg-muted/50"
                        disabled={testingConnection === idp.id}
                      >
                        <div className="flex items-center">
                          {testingConnection === idp.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : connectionResults[idp.id] ? (
                            connectionResults[idp.id].success ? (
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                            )
                          ) : (
                            <TestTube className="h-4 w-4 mr-2" />
                          )}
                          {testingConnection === idp.id ? 'Testing...' : 'Test Connection'}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewCertificates(idp)} className="hover:bg-muted/50">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          View Certificates
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(idp.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <div className="flex items-center">
                          <XCircle className="h-4 w-4 mr-2" />
                          Remove Provider
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
