import { Activity, Shield, Settings } from 'lucide-react';
import type { SmartApp } from '@/lib/types/api';

interface SmartAppsStatisticsProps {
  apps: SmartApp[];
}

export function SmartAppsStatistics({ apps }: SmartAppsStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 tracking-wide">Total Apps</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">{apps.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tracking-wide">EHR Launch</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {apps.filter(app => app.appType === 'ehr-launch').length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 tracking-wide">Standalone</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {apps.filter(app => app.appType === 'standalone-app').length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-orange-500/10 dark:bg-orange-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Settings className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-sm font-semibold text-orange-700 dark:text-orange-300 tracking-wide">Backend Service</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {apps.filter(app => app.appType === 'backend-service').length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-violet-500/10 dark:bg-violet-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xl">🤖</span>
              </div>
              <div className="text-sm font-semibold text-violet-700 dark:text-violet-300 tracking-wide">AI Agents</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {apps.filter(app => app.appType === 'agent').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
