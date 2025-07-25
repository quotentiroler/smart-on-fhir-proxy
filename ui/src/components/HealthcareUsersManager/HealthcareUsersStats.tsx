import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import { useState } from 'react';

interface BaseUser {
  enabled: boolean;
  createdAt?: string;
  createdTimestamp?: number;
  primaryRole?: string;
  realmRoles?: string[];
}

interface HealthcareUsersStatsProps {
  users: BaseUser[];
}

interface RoleData {
  role: string;
  count: number;
  color: string;
  percentage: number;
}

// Role colors mapping
const ROLE_COLORS: { [key: string]: string } = {
  'administrator': '#3b82f6', // blue
  'practitioner': '#10b981', // emerald
  'nurse': '#f59e0b', // amber
  'researcher': '#8b5cf6', // violet
  'user': '#6b7280', // gray
  'other': '#ef4444', // red
};

// Simple SVG Pie Chart Component
function PieChart({ data, size = 80 }: { data: RoleData[]; size?: number }) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  
  // Filter out data with 0 count to avoid rendering issues
  const validData = data.filter(item => item.count > 0);
  
  if (validData.length === 0) {
    return (
      <div 
        className="rounded-full border-4 border-gray-300 dark:border-gray-600" 
        style={{ width: size, height: size }}
      />
    );
  }

  // If only one segment with 100%, render as a full circle
  if (validData.length === 1) {
    return (
      <div className="relative group">
        <div
          className="rounded-full cursor-pointer transition-all duration-200 hover:opacity-80"
          style={{ 
            width: size, 
            height: size, 
            backgroundColor: validData[0].color 
          }}
          onMouseEnter={() => setHoveredSegment(validData[0].role)}
          onMouseLeave={() => setHoveredSegment(null)}
        />
        
        {/* Tooltip */}
        {hoveredSegment && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap">
            <div className="text-xs font-semibold text-popover-foreground">
              {hoveredSegment}: {validData[0].count} users
            </div>
          </div>
        )}
      </div>
    );
  }

  const radius = size / 2 - 2;
  const centerX = size / 2;
  const centerY = size / 2;
  
  let currentAngle = 0;
  
  const segments = validData.map((item) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + (item.percentage / 100) * 360;
    currentAngle = endAngle;
    
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    return {
      ...item,
      pathData,
      isHovered: hoveredSegment === item.role
    };
  });

  return (
    <div className="relative group">
      <svg width={size} height={size} className="transform -rotate-90">
        {segments.map((segment) => (
          <path
            key={segment.role}
            d={segment.pathData}
            fill={segment.color}
            className={`transition-all duration-200 cursor-pointer ${
              segment.isHovered ? 'opacity-80 scale-105' : 'opacity-100'
            }`}
            onMouseEnter={() => setHoveredSegment(segment.role)}
            onMouseLeave={() => setHoveredSegment(null)}
          />
        ))}
      </svg>
      
      {/* Tooltip */}
      {hoveredSegment && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap">
          <div className="text-xs font-semibold text-popover-foreground">
            {hoveredSegment}: {validData.find(d => d.role === hoveredSegment)?.count} users
          </div>
        </div>
      )}
    </div>
  );
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

  // Calculate role distribution for all users
  const roleDistribution = users.reduce((acc, user) => {
    const role = user.primaryRole || 'user';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const roleData: RoleData[] = Object.entries(roleDistribution).map(([role, count]) => ({
    role: role.charAt(0).toUpperCase() + role.slice(1),
    count,
    color: ROLE_COLORS[role] || ROLE_COLORS['other'],
    percentage: users.length > 0 ? (count / users.length) * 100 : 0
  })).sort((a, b) => b.count - a.count);

  // Calculate role distribution for active users only
  const activeUsersByRole = users.filter(user => user.enabled).reduce((acc, user) => {
    const role = user.primaryRole || 'user';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const activeRoleData: RoleData[] = Object.entries(activeUsersByRole).map(([role, count]) => ({
    role: role.charAt(0).toUpperCase() + role.slice(1),
    count,
    color: ROLE_COLORS[role] || ROLE_COLORS['other'],
    percentage: activeUsers > 0 ? (count / activeUsers) * 100 : 0
  })).sort((a, b) => b.count - a.count);

  // Calculate role distribution for inactive users only
  const inactiveUsersByRole = users.filter(user => !user.enabled).reduce((acc, user) => {
    const role = user.primaryRole || 'user';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const inactiveRoleData: RoleData[] = Object.entries(inactiveUsersByRole).map(([role, count]) => ({
    role: role.charAt(0).toUpperCase() + role.slice(1),
    count,
    color: ROLE_COLORS[role] || ROLE_COLORS['other'],
    percentage: inactiveUsers > 0 ? (count / inactiveUsers) * 100 : 0
  })).sort((a, b) => b.count - a.count);

  // Calculate role distribution for recent users only
  const recentUsersByRole = users.filter(user => {
    const createdDate = user.createdAt ? new Date(user.createdAt) : 
                       user.createdTimestamp ? new Date(user.createdTimestamp) : null;
    if (!createdDate) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate > weekAgo;
  }).reduce((acc, user) => {
    const role = user.primaryRole || 'user';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const recentRoleData: RoleData[] = Object.entries(recentUsersByRole).map(([role, count]) => ({
    role: role.charAt(0).toUpperCase() + role.slice(1),
    count,
    color: ROLE_COLORS[role] || ROLE_COLORS['other'],
    percentage: recentUsers > 0 ? (count / recentUsers) * 100 : 0
  })).sort((a, b) => b.count - a.count);

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
          <div className="ml-4">
            <PieChart data={roleData} size={64} />
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
          <div className="ml-4">
            <PieChart data={activeRoleData} size={64} />
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
          <div className="ml-4">
            <PieChart data={inactiveRoleData} size={64} />
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
          <div className="ml-4">
            <PieChart data={recentRoleData} size={64} />
          </div>
        </div>
      </div>
    </div>
  );
}
