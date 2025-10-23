import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepWizard, Step } from './StepWizard';
import { AgentTypeSelector } from './AgentTypeSelector';
import { PersonalityConfigurator } from './PersonalityConfigurator';
import { SkillsSelector } from './SkillsSelector';
import { WorkflowDesigner } from './workflow/WorkflowDesigner';
import { WorkforceConfigurator } from './WorkforceConfigurator';
import { useAgentBuilder } from '../../hooks/useAgentBuilder';
import { useAgentStore } from '../../store/agentStore';
import { ModernCard } from '../ui/ModernCard';
import { ModernButton } from '../ui/ModernButton';
import { 
  Save, 
  AlertCircle, 
  User, 
  FileText, 
  Bot, 
  Brain, 
  Sparkles, 
  Workflow,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Zap
} from 'lucide-react';

const STEPS: Step[] = [
  {
    id: 'basic',
    title: 'Basic Details',
    description: 'Name and description',
    icon: <User className="w-5 h-5" />
  },
  {
    id: 'type',
    title: 'Agent Type',
    description: 'Select agent role',
    icon: <Bot className="w-5 h-5" />
  },
  {
    id: 'personality',
    title: 'Personality',
    description: 'Configure traits',
    icon: <Sparkles className="w-5 h-5" />
  },
  {
    id: 'skills',
    title: 'Skills',
    description: 'Add capabilities',
    icon: <Brain className="w-5 h-5" />
  },
  {
    id: 'workforce',
    title: 'Workforce',
    description: 'Escalation & hierarchy',
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: 'workflows',
    title: 'Workflows',
    description: 'Optional automation',
    icon: <Workflow className="w-5 h-5" />
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Confirm and save',
    icon: <CheckCircle className="w-5 h-5" />
  }
];

export const WizardAgentBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { selectAgent } = useAgentStore();
  const { 
    config,
    updateConfig,
    saveAgent,
    isValid,
    validationErrors 
  } = useAgentBuilder();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic Details
        return config.name && config.name.trim() !== '' && 
               config.description && config.description.trim() !== '';
      case 1: // Agent Type
        return !!config.type;
      case 2: // Personality
        return true; // Optional, has defaults
      case 3: // Skills
        return config.skills && config.skills.length > 0;
      case 4: // Workflows
        return true; // Optional
      case 5: // Review
        return isValid;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow going back to any previous step
    if (stepIndex <= currentStep || completedSteps.has(stepIndex - 1)) {
      setCurrentStep(stepIndex);
    }
  };

  const handleSave = async () => {
    if (!isValid || isSaving) return;
    
    setIsSaving(true);
    try {
      const createdAgent = await saveAgent();
      
      if (createdAgent) {
        // Show success message
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
        }, 500); // Small delay to ensure state updates
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Details
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Let's start with the basics</h2>
              <p className="text-gray-400">Give your agent a name and describe what it does</p>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
                  autoFocus
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
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>
        );

      case 1: // Agent Type
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Choose your agent type</h2>
              <p className="text-gray-400">Select the role that best fits your agent's purpose</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <AgentTypeSelector
                selectedType={config.type}
                onSelect={(type) => updateConfig({ type })}
              />
            </div>
          </div>
        );

      case 2: // Personality
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Define personality traits</h2>
              <p className="text-gray-400">Customize how your agent communicates and behaves</p>
            </div>

            <div className="max-w-3xl mx-auto">
              <PersonalityConfigurator
                personality={config.personality}
                onChange={(personality) => updateConfig({ personality })}
              />
            </div>
          </div>
        );

      case 3: // Skills
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Add skills and capabilities</h2>
              <p className="text-gray-400">Select the skills your agent needs to perform its tasks</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <SkillsSelector
                skills={config.skills}
                onChange={(skills) => updateConfig({ skills })}
              />
            </div>
          </div>
        );

      case 4: // Workforce
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Configure workforce capabilities</h2>
              <p className="text-gray-400">Enable escalation, hierarchy, and human oversight</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <WorkforceConfigurator
                config={config}
                updateConfig={updateConfig}
              />
            </div>
          </div>
        );

      case 5: // Workflows
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 mb-4">
                <Workflow className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Configure workflows (Optional)</h2>
              <p className="text-gray-400">Add automated workflows to enhance your agent's capabilities</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <WorkflowDesigner
                workflows={config.workflows}
                onChange={(workflows) => updateConfig({ workflows })}
              />
            </div>
          </div>
        );

      case 5: // Review
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Review your agent</h2>
              <p className="text-gray-400">Everything looks good? Let's create your agent!</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
              {/* Basic Details */}
              <ModernCard variant="glass" className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Basic Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Name:</span>
                    <p className="text-white font-medium">{config.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Description:</span>
                    <p className="text-white">{config.description}</p>
                  </div>
                </div>
              </ModernCard>

              {/* Agent Type */}
              <ModernCard variant="glass" className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  Agent Type
                </h3>
                <p className="text-white capitalize">{config.type?.replace('_', ' ')}</p>
              </ModernCard>

              {/* Personality */}
              {config.personality && (
                <ModernCard variant="glass" className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-400" />
                    Personality Traits
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(config.personality).map(([trait, value]) => (
                      <div key={trait}>
                        <span className="text-sm text-gray-400 capitalize">
                          {trait.replace('_', ' ')}:
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                              style={{ width: `${value * 100}%` }}
                            />
                          </div>
                          <span className="text-white text-sm font-medium">
                            {Math.round(value * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ModernCard>
              )}

              {/* Skills */}
              <ModernCard variant="glass" className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-green-400" />
                  Skills ({config.skills?.length || 0})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {config.skills?.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-300 text-sm"
                    >
                      {skill.name.replace('_', ' ')} (Level {skill.level})
                    </span>
                  ))}
                </div>
              </ModernCard>

              {/* Workflows */}
              {config.workflows && config.workflows.length > 0 && (
                <ModernCard variant="glass" className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Workflow className="w-5 h-5 text-orange-400" />
                    Workflows ({config.workflows.length})
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {config.workflows.length} workflow(s) configured
                  </p>
                </ModernCard>
              )}

              {/* Validation Errors */}
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Save className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Create Your AI Agent</h1>
        </div>

        {/* Step Wizard */}
        <StepWizard
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          allowSkipAhead={false}
        />
      </div>

      {/* Step Content */}
      <div className="mb-8">
        <ModernCard variant="glass" className="p-8">
          {renderStepContent()}
        </ModernCard>
      </div>

      {/* Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent p-6 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <ModernButton
            onClick={handlePrevious}
            disabled={currentStep === 0}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </ModernButton>

          <div className="text-sm text-gray-400">
            Step {currentStep + 1} of {STEPS.length}
          </div>

          {currentStep < STEPS.length - 1 ? (
            <ModernButton
              onClick={handleNext}
              disabled={!canProceed()}
              variant="primary"
              className="flex items-center gap-2"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </ModernButton>
          ) : (
            <ModernButton
              onClick={handleSave}
              disabled={!isValid || isSaving}
              variant="primary"
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Create Agent</span>
                </>
              )}
            </ModernButton>
          )}
        </div>
      </div>
    </div>
  );
};

