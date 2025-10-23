/**
 * Modern Button Component with Multiple Variants
 */
import { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface ModernButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'glass' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export const ModernButton = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  ...props
}: ModernButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm md:px-4',
    md: 'px-4 py-2.5 text-sm md:px-6 md:py-3 md:text-base',
    lg: 'px-6 py-3 text-base md:px-8 md:py-4 md:text-lg'
  };
  
  const variantClasses = {
    primary: 'gradient-button',
    secondary: 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95',
    glass: 'glass-button',
    outline: 'border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:scale-105 active:scale-95',
    ghost: 'text-indigo-600 hover:bg-indigo-50 hover:scale-105 active:scale-95'
  };
  
  return (
    <button
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {icon && !loading && icon}
      {children}
    </button>
  );
};
