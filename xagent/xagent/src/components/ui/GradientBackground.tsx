/**
 * Animated Gradient Background Component
 */
import { ReactNode } from 'react';

interface GradientBackgroundProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'dark';
}

export const GradientBackground = ({ 
  children, 
  variant = 'primary' 
}: GradientBackgroundProps) => {
  const gradients = {
    primary: 'from-indigo-500 via-purple-500 to-pink-500',
    secondary: 'from-blue-500 via-indigo-500 to-purple-500',
    dark: 'from-gray-900 via-purple-900 to-indigo-900'
  };
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[variant]} animate-gradient-shift`}>
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
