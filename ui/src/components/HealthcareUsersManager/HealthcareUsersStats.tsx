import { Users, UserCheck, UserX, Clock } from 'lucide-react';

interface BaseUser {
  enabled: boolean;
  createdAt?: string;
  createdTimestamp?: number;
}

interface HealthcareUsersStatsProps {
  users: BaseUser[];
}

export function HealthcareUsersStats({ users }: HealthcareUsersStatsProps) {
  const activeUsers = users.filter(user => user.enabled).length;
  const inactiveUsers = users.filter(user => !user.enabled).length;
  const recentUsers = users.filter(user => {
    const createdDate = user.createdAt ? new Date(user.createdAt) : 
                       user.createdTimestamp ? new Date(user.createdTimestamp) : null;
    if (!createdDate) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate > weekAgo;
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm font-semibold text-primary tracking-wide">Total Users</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">{users.length}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tracking-wide">Active</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">{activeUsers}</div>
            <div className="text-sm text-emerald-600 dark:text-emerald-400">
              {users.length > 0 ? Math.round((activeUsers / users.length) * 100) : 0}% of total
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-500/10 dark:bg-red-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-sm font-semibold text-red-700 dark:text-red-300 tracking-wide">Inactive</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">{inactiveUsers}</div>
            <div className="text-sm text-red-600 dark:text-red-400">
              {users.length > 0 ? Math.round((inactiveUsers / users.length) * 100) : 0}% of total
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-violet-500/10 dark:bg-violet-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Clock className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="text-sm font-semibold text-violet-700 dark:text-violet-300 tracking-wide">Recent</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">{recentUsers}</div>
            <div className="text-sm text-violet-600 dark:text-violet-400">Added this week</div>
          </div>
        </div>
      </div>
    </div>
  );
}
