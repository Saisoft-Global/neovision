/**
 * Status Badge Component
 * Shows status with color coding and animations
 */
import { cn } from '../../utils/cn';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'processing' | 'success' | 'error' | 'warning';
  label?: string;
  showDot?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge = ({
  status,
  label,
  showDot = true,
  pulse = true,
  size = 'md',
  className
}: StatusBadgeProps) => {
  const statusConfig = {
    online: {
      color: 'bg-green-500',
      text: 'text-green-700',
      bgColor: 'bg-green-50',
      label: 'Online'
    },
    offline: {
      color: 'bg-gray-500',
      text: 'text-gray-700',
      bgColor: 'bg-gray-50',
      label: 'Offline'
    },
    busy: {
      color: 'bg-red-500',
      text: 'text-red-700',
      bgColor: 'bg-red-50',
      label: 'Busy'
    },
    away: {
      color: 'bg-yellow-500',
      text: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      label: 'Away'
    },
    processing: {
      color: 'bg-blue-500',
      text: 'text-blue-700',
      bgColor: 'bg-blue-50',
      label: 'Processing'
    },
    success: {
      color: 'bg-green-500',
      text: 'text-green-700',
      bgColor: 'bg-green-50',
      label: 'Success'
    },
    error: {
      color: 'bg-red-500',
      text: 'text-red-700',
      bgColor: 'bg-red-50',
      label: 'Error'
    },
    warning: {
      color: 'bg-yellow-500',
      text: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      label: 'Warning'
    }
  };

  const config = statusConfig[status] || statusConfig.offline;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs md:text-sm',
    lg: 'px-4 py-2 text-sm md:text-base'
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-full',
      'glass-card',
      sizeClasses[size],
      className
    )}>
      {showDot && (
        <div className="relative">
          <div className={cn('rounded-full', dotSizeClasses[size], config.color)} />
          {pulse && (
            <div className={cn(
              'absolute inset-0 rounded-full animate-ping',
              dotSizeClasses[size],
              config.color,
              'opacity-75'
            )} />
          )}
        </div>
      )}
      <span className={cn('font-medium text-white')}>
        {label || config.label}
      </span>
    </div>
  );
};
