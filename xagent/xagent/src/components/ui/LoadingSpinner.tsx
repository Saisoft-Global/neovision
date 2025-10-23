/**
 * Modern Loading Spinner with Multiple Variants
 */
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'spinner',
  className 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  
  if (variant === 'spinner') {
    return (
      <div className={cn('relative', sizeClasses[size], className)}>
        <div className="absolute inset-0 rounded-full border-4 border-indigo-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }
  
  if (variant === 'dots') {
    return (
      <div className={cn('flex gap-2', className)}>
        <div className={cn('rounded-full bg-indigo-600 animate-bounce', sizeClasses[size])}></div>
        <div className={cn('rounded-full bg-purple-600 animate-bounce delay-100', sizeClasses[size])}></div>
        <div className={cn('rounded-full bg-pink-600 animate-bounce delay-200', sizeClasses[size])}></div>
      </div>
    );
  }
  
  return (
    <div className={cn('rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse', sizeClasses[size], className)}></div>
  );
};
