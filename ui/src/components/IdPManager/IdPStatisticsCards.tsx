import { Server, Shield, Globe, Key } from 'lucide-react';

interface IdPStatisticsCardsProps {
  idps: Array<{
    status: 'active' | 'inactive';
    userCount: number;
    type: string;
  }>;
}

export function IdPStatisticsCards({ idps }: IdPStatisticsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-xl flex items-center justify-center shadow-sm">
                <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-sm font-semibold text-blue-800 dark:text-blue-300 tracking-wide">Total IdPs</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">{idps.length}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-sm font-semibold text-green-800 dark:text-green-300 tracking-wide">Active</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {idps.filter(idp => idp.status === 'active').length}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-xl flex items-center justify-center shadow-sm">
                <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-sm font-semibold text-purple-800 dark:text-purple-300 tracking-wide">Total Users</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {idps.reduce((acc, idp) => acc + idp.userCount, 0)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/30 rounded-xl flex items-center justify-center shadow-sm">
                <Key className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-sm font-semibold text-orange-800 dark:text-orange-300 tracking-wide">SAML Providers</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {idps.filter(idp => idp.type === 'SAML').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
