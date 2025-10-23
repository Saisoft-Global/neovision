import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentTypeSelector } from './AgentTypeSelector';
import { PersonalityConfigurator } from './PersonalityConfigurator';
import { SkillsSelector } from './SkillsSelector';
import { ToolsSelector } from './ToolsSelector';
import { WorkflowDesigner } from './workflow/WorkflowDesigner';
import { WorkforceConfigurator } from './WorkforceConfigurator';
import { useAgentBuilder } from '../../hooks/useAgentBuilder';
import { useAgentStore } from '../../store/agentStore';
import { ModernCard } from '../ui/ModernCard';
import { ModernButton } from '../ui/ModernButton';
import { Save, AlertCircle, User, FileText, Sparkles, Upload } from 'lucide-react';
import { AGENT_TEMPLATES, getAgentTemplate } from '../../config/agentTemplates';

export const AgentBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { selectAgent } = useAgentStore();
  const { 
    config,
    updateConfig,
    saveAgent,
    isValid,
    validationErrors 
  } = useAgentBuilder();

  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleLoadTemplate = (templateId: string) => {
    const template = getAgentTemplate(templateId);
    if (template) {
      console.log(`📋 Loading template: ${template.name}`);
      
      // Merge template config with current config
      updateConfig({
        name: template.config.name || template.name,
        description: template.config.description,
        type: template.config.type,
        personality: template.config.personality,
        skills: template.config.skills,
        llm_config: template.config.llm_config
      });
      
      setShowTemplates(false);
      console.log(`✅ Template loaded! Customize as needed and save.`);
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const importedConfig = JSON.parse(text);
          
          console.log('📥 Importing agent config from JSON:', importedConfig);
          updateConfig(importedConfig);
          console.log('✅ Configuration imported! Review and save.');
        } catch (error) {
          alert('Failed to import JSON: Invalid format');
          console.error('Import error:', error);
        }
      }
    };
    input.click();
  };

  const handleSave = async () => {
    if (!isValid || isSaving) return;
    
    setIsSaving(true);
    try {
      const createdAgent = await saveAgent();
      
      if (createdAgent) {
        console.log(`🎉 Agent "${createdAgent.name}" created successfully!`);
        
        // Auto-select the newly created agent
        selectAgent({
          id: createdAgent.id,
          name: createdAgent.name,
          type: createdAgent.type,
          description: config.description || '',
          expertise: config.skills?.map(s => s.name) || [],
          isAvailable: true,
          personality: config.personality
        });
        
        // Navigate to agents page
        setTimeout(() => {
          navigate('/agents');
        }, 500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Save className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Configure Your Agent</h2>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton
            onClick={() => setShowTemplates(!showTemplates)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Templates</span>
          </ModernButton>
          <ModernButton
            onClick={handleImportJSON}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import JSON</span>
          </ModernButton>
          <ModernButton
            onClick={handleSave}
            disabled={!isValid || isSaving}
            variant="primary"
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Agent</span>
              </>
            )}
          </ModernButton>
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplates && (
        <ModernCard variant="glass" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h3 className="text-xl font-semibold text-white">Agent Templates</h3>
            </div>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-gray-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleLoadTemplate(template.id)}
                className="text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition group"
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-3xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white group-hover:text-blue-400 transition truncate">
                      {template.name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">{template.industry}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2">
                  {template.description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <span>✓ {template.config.skills?.length || 0} skills</span>
                  <span>•</span>
                  <span>✓ Personality</span>
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-300">
              💡 <strong>Tip:</strong> Select a template to auto-fill configuration, then customize as needed before saving.
            </p>
          </div>
        </ModernCard>
      )}

      {/* Basic Details Section */}
      <ModernCard variant="glass" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Basic Details</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="agent-name" className="block text-sm font-medium text-gray-300 mb-2">
                Agent Name *
              </label>
              <input
                id="agent-name"
                type="text"
                value={config.name || ''}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="e.g., HR Assistant, Finance Advisor, Customer Support Bot"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="agent-description" className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                id="agent-description"
                value={config.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="Describe what this agent does and its primary responsibilities..."
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>
        </div>
      </ModernCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ModernCard variant="glass" className="p-6">
            <AgentTypeSelector
              selectedType={config.type}
              onSelect={(type) => updateConfig({ type })}
            />
          </ModernCard>
          
          <ModernCard variant="glass" className="p-6">
            <PersonalityConfigurator
              personality={config.personality}
              onChange={(personality) => updateConfig({ personality })}
            />
          </ModernCard>
          
          <ModernCard variant="glass" className="p-6">
            <SkillsSelector
              skills={config.skills}
              onChange={(skills) => updateConfig({ skills })}
            />
          </ModernCard>
          
          <ModernCard variant="glass" className="p-6">
            <ToolsSelector
              selectedToolIds={config.tools || []}
              onChange={(tools) => updateConfig({ tools })}
            />
          </ModernCard>
          
          <WorkforceConfigurator
            config={config}
            updateConfig={updateConfig}
          />
        </div>

        <div className="lg:border-l lg:border-white/10 lg:pl-6">
          <ModernCard variant="glass" className="p-6">
            <WorkflowDesigner
              workflows={config.workflows}
              onChange={(workflows) => updateConfig({ workflows })}
            />
          </ModernCard>
        </div>
      </div>

      {!isValid && (
        <ModernCard variant="glass" className="p-6 border-red-500/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-400 font-semibold mb-2">Configuration Errors:</h3>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-red-300 text-sm">• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </ModernCard>
      )}
    </div>
  );
};