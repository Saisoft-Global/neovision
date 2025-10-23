/**
 * Skeleton Loading Component
 * Shows placeholder while content loads
 */
import { cn } from '../../utils/cn';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  className?: string;
}

export const Skeleton = ({
  variant = 'rectangular',
  width,
  height,
  className
}: SkeletonProps) => {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl'
  };

  return (
    <div
      className={cn(
        'bg-white/20 backdrop-blur-sm shimmer',
        variantClasses[variant],
        className
      )}
      style={{
        width: width || (variant === 'circular' ? '40px' : '100%'),
        height: height || (variant === 'text' ? '16px' : variant === 'circular' ? '40px' : '100px')
      }}
    />
  );
};

// Skeleton Group for complex layouts
export const SkeletonGroup = () => (
  <div className="space-y-4 p-6">
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width="48px" height="48px" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    <Skeleton variant="rectangular" height="200px" />
    <div className="space-y-2">
      <Skeleton variant="text" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="90%" />
    </div>
  </div>
);
