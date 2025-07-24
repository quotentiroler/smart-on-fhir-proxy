import { Activity, Shield, Settings } from 'lucide-react';
import type { SmartApp } from '@/types/smartApp';

interface SmartAppsStatisticsProps {
  apps: SmartApp[];
}

export function SmartAppsStatistics({ apps }: SmartAppsStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-sm font-semibold text-blue-800 tracking-wide">Total Apps</div>
            </div>
            <div className="text-3xl font-bold text-blue-900 mb-2">{apps.length}</div>
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
              <div className="text-sm font-semibold text-green-800 tracking-wide">EHR Launch</div>
            </div>
            <div className="text-3xl font-bold text-green-900 mb-2">
              {apps.filter(app => app.appType === 'ehr-launch-app').length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-sm font-semibold text-blue-800 tracking-wide">Standalone</div>
            </div>
            <div className="text-3xl font-bold text-blue-900 mb-2">
              {apps.filter(app => app.appType === 'standalone-app').length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-sm font-semibold text-orange-800 tracking-wide">Backend Service</div>
            </div>
            <div className="text-3xl font-bold text-orange-900 mb-2">
              {apps.filter(app => app.appType === 'backend-service').length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xl">🤖</span>
              </div>
              <div className="text-sm font-semibold text-purple-800 tracking-wide">AI Agents</div>
            </div>
            <div className="text-3xl font-bold text-purple-900 mb-2">
              {apps.filter(app => app.appType === 'agent').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
