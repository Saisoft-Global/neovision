/**
 * Modern Card Component with Glassmorphism
 */
import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ModernCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'glass' | 'solid' | 'gradient';
  hover?: boolean;
  glow?: boolean;
}

export const ModernCard = ({ 
  children, 
  className, 
  variant = 'solid',
  hover = true,
  glow = false
}: ModernCardProps) => {
  const baseClasses = 'rounded-2xl p-4 md:p-6 transition-all duration-300';
  
  const variantClasses = {
    glass: 'glass-card',
    solid: 'bg-white shadow-xl',
    gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl'
  };
  
  const hoverClasses = hover ? 'hover:shadow-2xl md:hover:-translate-y-1' : '';
  const glowClasses = glow ? 'pulse-glow' : '';
  
  return (
    <div className={cn(
      baseClasses,
      variantClasses[variant],
      hoverClasses,
      glowClasses,
      className
    )}>
      {children}
    </div>
  );
};
