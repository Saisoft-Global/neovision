import React from 'react';
import { AgentTypeSelector } from './AgentTypeSelector';
import { PersonalityConfigurator } from './PersonalityConfigurator';
import { SkillsSelector } from './SkillsSelector';
import { WorkflowDesigner } from './workflow/WorkflowDesigner';
import { useAgentBuilder } from '../../hooks/useAgentBuilder';
import { Bot, Save } from 'lucide-react';

export const AgentBuilder: React.FC = () => {
  const { 
    config,
    updateConfig,
    saveAgent,
    isValid,
    validationErrors 
  } = useAgentBuilder();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Bot className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Agent Builder</h1>
        </div>
        <button
          onClick={saveAgent}
          disabled={!isValid}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          <span>Save Agent</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <AgentTypeSelector
            selectedType={config.type}
            onSelect={(type) => updateConfig({ type })}
          />
          
          <PersonalityConfigurator
            personality={config.personality}
            onChange={(personality) => updateConfig({ personality })}
          />
          
          <SkillsSelector
            skills={config.skills}
            onChange={(skills) => updateConfig({ skills })}
          />
        </div>

        <div className="lg:border-l lg:pl-8">
          <WorkflowDesigner
            workflows={config.workflows}
            onChange={(workflows) => updateConfig({ workflows })}
          />
        </div>
      </div>

      {!isValid && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium">Configuration Errors:</h3>
          <ul className="mt-2 list-disc list-inside text-red-600">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};