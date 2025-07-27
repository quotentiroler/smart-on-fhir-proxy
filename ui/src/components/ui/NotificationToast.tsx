import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

interface NotificationToastProps {
  notification: {
    type: 'success' | 'error';
    message: string;
  } | null;
  onClose: () => void;
}

export function NotificationToast({ notification, onClose }: NotificationToastProps) {
  if (!notification) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${
      notification.type === 'success' 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-200' 
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200'
    } animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-center space-x-2">
        {notification.type === 'success' ? (
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        )}
        <span className="font-medium">{notification.message}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="ml-2 h-6 w-6 p-0 text-current hover:bg-current/10"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
