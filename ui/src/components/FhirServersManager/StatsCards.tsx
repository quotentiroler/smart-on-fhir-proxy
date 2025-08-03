import {
  Server,
  Check,
  X,
  Play
} from 'lucide-react';
import type { FhirServerWithState } from '../../lib/types/api';

interface StatsCardsProps {
  servers: FhirServerWithState[];
}

export function StatsCards({ servers }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Server className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm font-semibold text-primary tracking-wide">Total Servers</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">{servers.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tracking-wide">Supported Servers</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {servers.filter(s => s.supported).length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center shadow-sm">
                <X className="w-6 h-6 text-destructive" />
              </div>
              <div className="text-sm font-semibold text-destructive tracking-wide">Unsupported Servers</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {servers.filter(s => !s.supported).length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-violet-500/10 dark:bg-violet-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Play className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="text-sm font-semibold text-violet-700 dark:text-violet-300 tracking-wide">Launch Contexts</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">12</div>
            <p className="text-sm text-violet-700 dark:text-violet-300 font-medium">Available contexts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
