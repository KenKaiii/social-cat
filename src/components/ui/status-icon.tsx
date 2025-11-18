import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType = 'success' | 'error' | 'warning' | 'pending' | 'running' | 'default';

interface StatusIconProps {
  status: StatusType | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const containerSizeClasses = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

export function StatusIcon({ status, className, size = 'sm' }: StatusIconProps) {
  const normalizedStatus = status.toLowerCase();

  const getStatusConfig = () => {
    switch (normalizedStatus) {
      case 'success':
      case 'completed':
      case 'active':
        return {
          icon: CheckCircle2,
          gradient: 'from-green-400 to-emerald-500',
        };
      case 'error':
      case 'failed':
        return {
          icon: XCircle,
          gradient: 'from-red-400 to-rose-500',
        };
      case 'warning':
      case 'pending':
        return {
          icon: AlertTriangle,
          gradient: 'from-yellow-400 to-amber-500',
        };
      case 'running':
      case 'processing':
        return {
          icon: Clock,
          gradient: 'from-blue-400 to-cyan-500',
        };
      default:
        return {
          icon: Clock,
          gradient: 'from-gray-400 to-gray-500',
        };
    }
  };

  const { icon: Icon, gradient } = getStatusConfig();

  return (
    <div
      className={cn(
        'rounded-md bg-gradient-to-br',
        gradient,
        containerSizeClasses[size],
        className
      )}
    >
      <Icon className={cn('text-white', sizeClasses[size])} />
    </div>
  );
}
