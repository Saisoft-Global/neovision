import React from 'react';
import { UniversalBrowserAutomation } from '../automation/UniversalBrowserAutomation';
import { Zap } from 'lucide-react';

export const AutomationPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">Browser Automation</h1>
      </div>
      <p className="text-white/60 text-sm md:text-base">
        ⚡ Automate web tasks with voice and text commands
      </p>
      <UniversalBrowserAutomation />
    </div>
  );
};
