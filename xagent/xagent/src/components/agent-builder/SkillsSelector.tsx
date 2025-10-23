import React from 'react';
import { Plus, X, Star, Brain, Sparkles } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';
import { ModernInput } from '../ui/ModernInput';
import type { AgentSkill } from '../../types/agent-framework';

interface SkillsSelectorProps {
  skills: AgentSkill[];
  onChange: (skills: AgentSkill[]) => void;
}

// Core skills that are automatically attached to all agents
const CORE_SKILL_NAMES = [
  'natural_language_understanding',
  'natural_language_generation',
  'task_comprehension',
  'reasoning',
  'context_retention'
];

// Pre-defined skills library for different domains
const PREDEFINED_SKILLS = [
  // Email & Communication
  { name: 'email_management', description: 'Manage and process emails', category: 'Communication' },
  { name: 'email_drafting', description: 'Draft professional emails', category: 'Communication' },
  { name: 'email_classification', description: 'Classify and prioritize emails', category: 'Communication' },
  
  // Document Processing
  { name: 'document_analysis', description: 'Analyze and extract information from documents', category: 'Documents' },
  { name: 'ocr_processing', description: 'Extract text from images and scanned documents', category: 'Documents' },
  { name: 'document_summarization', description: 'Create concise document summaries', category: 'Documents' },
  { name: 'pdf_processing', description: 'Process and analyze PDF documents', category: 'Documents' },
  
  // Knowledge & Research
  { name: 'knowledge_retrieval', description: 'Search and retrieve information from knowledge base', category: 'Knowledge' },
  { name: 'semantic_search', description: 'Perform semantic search across documents', category: 'Knowledge' },
  { name: 'research_assistance', description: 'Assist with research and information gathering', category: 'Knowledge' },
  { name: 'information_synthesis', description: 'Synthesize information from multiple sources', category: 'Knowledge' },
  
  // HR & People
  { name: 'hr_policies', description: 'Knowledge of HR policies and procedures', category: 'HR' },
  { name: 'employee_onboarding', description: 'Guide new employee onboarding process', category: 'HR' },
  { name: 'leave_management', description: 'Handle leave requests and approvals', category: 'HR' },
  { name: 'performance_reviews', description: 'Assist with performance review processes', category: 'HR' },
  
  // Finance & Accounting
  { name: 'financial_analysis', description: 'Analyze financial data and reports', category: 'Finance' },
  { name: 'expense_management', description: 'Track and manage expenses', category: 'Finance' },
  { name: 'invoice_processing', description: 'Process and validate invoices', category: 'Finance' },
  { name: 'budget_planning', description: 'Assist with budget planning and tracking', category: 'Finance' },
  
  // Procurement & Vendor Management
  { name: 'vendor_management', description: 'Manage vendor relationships and communications', category: 'Procurement' },
  { name: 'purchase_order_processing', description: 'Create and process purchase orders', category: 'Procurement' },
  { name: 'supplier_evaluation', description: 'Evaluate and compare suppliers', category: 'Procurement' },
  { name: 'contract_management', description: 'Manage contracts and agreements', category: 'Procurement' },
  { name: 'procurement_workflow', description: 'Execute procurement workflows and approvals', category: 'Procurement' },
  
  // Customer Support
  { name: 'customer_support', description: 'Provide customer support and assistance', category: 'Support' },
  { name: 'issue_resolution', description: 'Resolve customer issues and complaints', category: 'Support' },
  { name: 'ticket_management', description: 'Manage support tickets', category: 'Support' },
  
  // Task & Project Management
  { name: 'task_management', description: 'Create and manage tasks', category: 'Productivity' },
  { name: 'project_coordination', description: 'Coordinate project activities', category: 'Productivity' },
  { name: 'deadline_tracking', description: 'Track and manage deadlines', category: 'Productivity' },
  
  // Data & Analytics
  { name: 'data_analysis', description: 'Analyze and interpret data', category: 'Analytics' },
  { name: 'report_generation', description: 'Generate reports and summaries', category: 'Analytics' },
  { name: 'trend_analysis', description: 'Identify trends and patterns', category: 'Analytics' },
  
  // Integration & Automation
  { name: 'api_integration', description: 'Integrate with external APIs', category: 'Integration' },
  { name: 'workflow_automation', description: 'Automate workflows and processes', category: 'Integration' },
  { name: 'data_synchronization', description: 'Synchronize data across systems', category: 'Integration' },
];

export const SkillsSelector: React.FC<SkillsSelectorProps> = ({ skills, onChange }) => {
  // Separate core skills from custom skills
  const coreSkills = skills.filter(skill => CORE_SKILL_NAMES.includes(skill.name));
  const customSkills = skills.filter(skill => !CORE_SKILL_NAMES.includes(skill.name));
  const [showSkillPicker, setShowSkillPicker] = React.useState(false);

  const addSkill = () => {
    setShowSkillPicker(true);
  };

  const addPredefinedSkill = (skillName: string) => {
    const skillDef = PREDEFINED_SKILLS.find(s => s.name === skillName);
    if (!skillDef) return;

    // Check if skill already exists
    if (skills.some(s => s.name === skillName)) {
      alert('This skill is already added!');
      return;
    }

    onChange([
      ...skills,
      { 
        name: skillName, 
        level: 3, // Default to level 3
        config: {
          description: skillDef.description,
          category: skillDef.category
        }
      },
    ]);
    setShowSkillPicker(false);
  };

  const addCustomSkill = () => {
    onChange([
      ...skills,
      { name: '', level: 1 },
    ]);
    setShowSkillPicker(false);
  };

  const removeSkill = (index: number) => {
    // Find the actual index in the full skills array
    const skill = customSkills[index];
    const actualIndex = skills.findIndex(s => s === skill);
    onChange(skills.filter((_, i) => i !== actualIndex));
  };

  const updateSkill = (index: number, updates: Partial<AgentSkill>) => {
    // Find the actual index in the full skills array
    const skill = customSkills[index];
    const actualIndex = skills.findIndex(s => s === skill);
    onChange(
      skills.map((s, i) =>
        i === actualIndex ? { ...s, ...updates } : s
      )
    );
  };

  const getSkillDisplayName = (skillName: string): string => {
    return skillName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Core Skills Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Core Intelligence Skills</h3>
          <Sparkles className="w-4 h-4 text-purple-400" />
        </div>
        <p className="text-sm text-white/60">
          These skills are automatically provided to all agents and enable natural language understanding and intelligent task completion.
        </p>
        
        <div className="space-y-2">
          {coreSkills.map((skill, index) => {
            const description = skill.config?.description;
            const descriptionText = typeof description === 'string' ? description : '';
            
            return (
              <div 
                key={index} 
                className="flex items-center gap-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {getSkillDisplayName(skill.name)}
                    </span>
                    <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                      Auto-attached
                    </span>
                  </div>
                  {descriptionText && (
                    <p className="text-xs text-white/50 mt-1">{descriptionText}</p>
                  )}
                </div>
              
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`p-1 ${
                      skill.level >= level ? 'text-purple-400' : 'text-white/20'
                    }`}
                  >
                    <Star className="w-4 h-4" fill={skill.level >= level ? 'currentColor' : 'none'} />
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Custom Skills Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Agent-Specific Skills</h3>
          <ModernButton
            onClick={addSkill}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Skill</span>
          </ModernButton>
        </div>

        {/* Skill Picker Modal */}
        {showSkillPicker && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/20 p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Choose Skills</h3>
                <button
                  onClick={() => setShowSkillPicker(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Group skills by category */}
              {Object.entries(
                PREDEFINED_SKILLS.reduce((acc, skill) => {
                  if (!acc[skill.category]) acc[skill.category] = [];
                  acc[skill.category].push(skill);
                  return acc;
                }, {} as Record<string, typeof PREDEFINED_SKILLS>)
              ).map(([category, categorySkills]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-lg font-semibold text-white/80 mb-3">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categorySkills.map((skill) => {
                      const isAdded = skills.some(s => s.name === skill.name);
                      return (
                        <button
                          key={skill.name}
                          onClick={() => addPredefinedSkill(skill.name)}
                          disabled={isAdded}
                          className={`p-4 rounded-xl text-left transition-all ${
                            isAdded
                              ? 'bg-green-500/20 border-2 border-green-500/50 cursor-not-allowed'
                              : 'bg-white/5 border-2 border-white/10 hover:border-white/30 hover:bg-white/10'
                          }`}
                        >
                          <div className="font-medium text-white mb-1">
                            {getSkillDisplayName(skill.name)}
                            {isAdded && (
                              <span className="ml-2 text-xs text-green-400">✓ Added</span>
                            )}
                          </div>
                          <div className="text-sm text-white/60">
                            {skill.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="border-t border-white/10 pt-4 mt-6">
                <ModernButton
                  onClick={addCustomSkill}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Custom Skill (Manual Entry)</span>
                </ModernButton>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {customSkills.map((skill, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex-1">
                <ModernInput
                  type="text"
                  value={skill.name}
                  onChange={(e) => updateSkill(index, { name: e.target.value })}
                  placeholder="Enter skill name (e.g., email_management)..."
                  className="bg-transparent border-white/20"
                />
              </div>
              
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => updateSkill(index, { level })}
                    className={`p-1 transition-colors ${
                      skill.level >= level ? 'text-yellow-400' : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    <Star className="w-4 h-4" fill={skill.level >= level ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>

              <ModernButton
                onClick={() => removeSkill(index)}
                variant="ghost"
                size="sm"
                className="text-white/40 hover:text-red-400"
              >
                <X className="w-5 h-5" />
              </ModernButton>
            </div>
          ))}
          
          {customSkills.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
              <p className="text-white/60 mb-4">No custom skills added yet</p>
              <p className="text-sm text-white/40 mb-4">
                Add specialized skills like email_management, financial_analysis, etc.
              </p>
              <ModernButton
                onClick={addSkill}
                variant="outline"
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Custom Skill</span>
              </ModernButton>
            </div>
          )}
        </div>
      </div>
      
      {/* 💡 Tool Suggestions based on skills */}
      {customSkills.length > 0 && (
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-2">💡 Tool Suggestions</h4>
              <p className="text-sm text-white/70 mb-3">
                Based on your skills, these tools can enhance your agent:
              </p>
              <div className="space-y-2">
                {getSuggestedTools(customSkills).map((suggestion, idx) => (
                  <div key={idx} className="text-xs text-white/60 bg-white/5 p-2 rounded">
                    <span className="text-cyan-400 font-medium">{suggestion.toolName}</span>
                    {' '}→ Provides: {suggestion.skills.join(', ')}
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/50 mt-3">
                Select tools in the <strong className="text-white/70">Tools</strong> section below to enable API integration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: Suggest tools based on skills
function getSuggestedTools(skills: AgentSkill[]): Array<{toolName: string; skills: string[]}> {
  const suggestions: Array<{toolName: string; skills: string[]}> = [];
  const skillNames = skills.map(s => s.name);
  
  // Email Tool suggestions
  const emailSkills = ['email_management', 'email_drafting', 'email_classification', 'email_summarization'];
  if (skillNames.some(s => emailSkills.includes(s))) {
    suggestions.push({
      toolName: 'Email Tool',
      skills: skillNames.filter(s => emailSkills.includes(s))
    });
  }
  
  // CRM Tool suggestions
  const crmSkills = ['crm_integration', 'lead_management', 'customer_management', 'sales_pipeline'];
  if (skillNames.some(s => crmSkills.includes(s))) {
    suggestions.push({
      toolName: 'CRM Tool (Salesforce)',
      skills: skillNames.filter(s => crmSkills.includes(s))
    });
  }
  
  // Banking API Tool suggestions
  const bankingSkills = ['account_inquiry_handling', 'transaction_dispute_resolution', 'card_services', 'loan_application_support', 'fraud_detection_support'];
  if (skillNames.some(s => bankingSkills.includes(s))) {
    suggestions.push({
      toolName: 'Banking API Tool',
      skills: skillNames.filter(s => bankingSkills.includes(s))
    });
  }
  
  // Zoho Tool suggestions
  const zohoSkills = ['invoice_processing', 'document_to_invoice', 'invoice_management'];
  if (skillNames.some(s => zohoSkills.includes(s))) {
    suggestions.push({
      toolName: 'Zoho Tool',
      skills: skillNames.filter(s => zohoSkills.includes(s))
    });
  }
  
  return suggestions.slice(0, 3); // Show top 3 suggestions
}