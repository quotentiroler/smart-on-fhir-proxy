import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';

interface HealthcareUsersHeaderProps {
  onAddUser: () => void;
}

export function HealthcareUsersHeader({ onAddUser }: HealthcareUsersHeaderProps) {
  return (
    <div className="bg-card/80 backdrop-blur-sm p-8 rounded-3xl border border-border/50 shadow-lg">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
        <div className="flex-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
            Healthcare Users
          </h1>
          <div className="text-muted-foreground text-lg flex items-center">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
              <Users className="w-5 h-5 text-primary" />
            </div>
            Manage healthcare professionals and administrative users
          </div>
        </div>
        <Button 
          onClick={onAddUser}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-blue-500/20"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New User
        </Button>
      </div>
    </div>
  );
}
