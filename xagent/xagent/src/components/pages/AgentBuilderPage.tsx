import React, { useState } from 'react';
import { WizardAgentBuilder } from '../agent-builder/WizardAgentBuilder';
import { AgentBuilder } from '../agent-builder/AgentBuilder';
import { Bot, Wand2, Settings2 } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';

type BuilderMode = 'wizard' | 'advanced';

export const AgentBuilderPage: React.FC = () => {
  const [mode, setMode] = useState<BuilderMode>('wizard');

  return (
    <div className="space-y-6">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Agent Builder</h1>
            <p className="text-white/60 text-sm md:text-base mt-1">
              Create custom AI agents with specific configurations, personality traits, and workflows
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
          <ModernButton
            onClick={() => setMode('wizard')}
            variant={mode === 'wizard' ? 'primary' : 'secondary'}
            className="flex items-center gap-2 text-sm"
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">Wizard</span>
          </ModernButton>
          <ModernButton
            onClick={() => setMode('advanced')}
            variant={mode === 'advanced' ? 'primary' : 'secondary'}
            className="flex items-center gap-2 text-sm"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Advanced</span>
          </ModernButton>
        </div>
      </div>

      {/* Builder Content */}
      {mode === 'wizard' ? <WizardAgentBuilder /> : <AgentBuilder />}
    </div>
  );
};
