/**
 * Progress Bar Component
 * Shows loading progress for long operations
 */
import { cn } from '../../utils/cn';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  variant?: 'primary' | 'success' | 'warning';
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar = ({
  progress,
  label,
  variant = 'primary',
  showPercentage = true,
  className
}: ProgressBarProps) => {
  const colors = {
    primary: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500',
    warning: 'bg-gradient-to-r from-orange-500 to-red-500'
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-white/80">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-semibold text-white">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            colors[variant],
            'shimmer'
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};
