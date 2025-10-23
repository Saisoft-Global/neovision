/**
 * Modern Input Component with Floating Label
 */
import { InputHTMLAttributes, useState } from 'react';
import { cn } from '../../utils/cn';

interface ModernInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const ModernInput = ({
  label,
  error,
  icon,
  className,
  ...props
}: ModernInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = props.value || props.defaultValue;
  
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      
      <input
        className={cn(
          'modern-input',
          icon && 'pl-12',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      
      {label && (
        <label
          className={cn(
            'absolute left-4 transition-all duration-200 pointer-events-none',
            icon && 'left-12',
            isFocused || hasValue
              ? '-top-2 text-xs bg-white px-2 text-indigo-600 font-medium'
              : 'top-1/2 -translate-y-1/2 text-gray-500'
          )}
        >
          {label}
        </label>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
