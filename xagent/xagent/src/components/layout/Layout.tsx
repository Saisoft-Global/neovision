import React from 'react';
import { Navigation } from './Navigation';
import { MobileNav } from './MobileNav';
import { GradientBackground } from '../ui/GradientBackground';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <GradientBackground variant="primary">
      <div className="min-h-screen">
        {/* Desktop Navigation */}
        <Navigation />
        
        {/* Mobile Navigation */}
        <MobileNav />
        
        {/* Main Content */}
        <main className="md:ml-64 min-h-screen p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </GradientBackground>
  );
};