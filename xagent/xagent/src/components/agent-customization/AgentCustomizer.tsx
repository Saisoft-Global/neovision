import React, { useState } from 'react';
import { Bot, Save, PlayCircle } from 'lucide-react';
import { AgentTemplateSelector } from './AgentTemplateSelector';
import { PersonalityEditor } from './PersonalityEditor';
import { SkillsEditor } from './SkillsEditor';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';
import { AgentTester } from './AgentTester';
import { useAgentBuilder } from '../../hooks/useAgentBuilder';
import type { AgentTemplate } from '../../services/agent/templates/AgentTemplate';

export const AgentCustomizer: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [showTester, setShowTester] = useState(false);
  const { config, updateConfig, saveAgent, isValid, validationErrors } = useAgentBuilder();

  const handleSave = async () => {
    if (isValid) {
      await saveAgent();
      setShowTester(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Bot className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Create Custom Agent</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowTester(true)}
            disabled={!isValid}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
          >
            <PlayCircle className="w-5 h-5" />
            <span>Test Agent</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            <Save className="w-5 h-5" />
            <span>Save Agent</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <AgentTemplateSelector
            selectedTemplate={selectedTemplate}
            onSelect={(template) => {
              setSelectedTemplate(template);
              updateConfig(template.config);
            }}
          />
          
          <PersonalityEditor
            personality={config.personality}
            onChange={(personality) => updateConfig({ personality })}
          />
          
          <SkillsEditor
            skills={config.skills}
            onChange={(skills) => updateConfig({ skills })}
          />
        </div>

        <div className="space-y-6">
          <KnowledgeBaseSelector
            knowledgeBases={config.knowledge_bases}
            onChange={(knowledge_bases) => updateConfig({ knowledge_bases })}
          />

          {showTester && (
            <AgentTester
              config={config}
              onClose={() => setShowTester(false)}
            />
          )}
        </div>
      </div>

      {!isValid && validationErrors.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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