import React, { useState, useEffect } from 'react';
import { Plus, X, Wrench, CheckCircle, Info } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';
import { getAvailableTools } from '../../services/tools';

interface Tool {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  skillCount: number;
  skills: Array<{
    name: string;
    description: string;
    parameters: any[];
  }>;
}

interface ToolsSelectorProps {
  selectedToolIds: string[];
  onChange: (toolIds: string[]) => void;
}

export const ToolsSelector: React.FC<ToolsSelectorProps> = ({ selectedToolIds, onChange }) => {
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  useEffect(() => {
    // Load available tools
    try {
      const tools = getAvailableTools();
      setAvailableTools(tools);
    } catch (error) {
      console.error('Failed to load tools:', error);
      setAvailableTools([]);
    }
  }, []);

  const toggleTool = (toolId: string) => {
    if (selectedToolIds.includes(toolId)) {
      onChange(selectedToolIds.filter(id => id !== toolId));
    } else {
      onChange([...selectedToolIds, toolId]);
    }
  };

  const toggleExpand = (toolId: string) => {
    setExpandedToolId(expandedToolId === toolId ? null : toolId);
  };

  const getToolTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      email: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      crm: 'bg-green-500/10 border-green-500/30 text-green-400',
      calendar: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
      database: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
      custom: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
    };
    return colors[type] || colors.custom;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wrench className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Available Tools</h3>
      </div>

      <p className="text-sm text-white/60">
        Tools provide additional capabilities to your agent. Each tool contains multiple skills that can be executed via natural language.
      </p>

      {/* Selected Count */}
      {selectedToolIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <CheckCircle className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-cyan-300">
            {selectedToolIds.length} tool{selectedToolIds.length !== 1 ? 's' : ''} selected
            {' • '}
            {availableTools
              .filter(t => selectedToolIds.includes(t.id))
              .reduce((sum, t) => sum + t.skillCount, 0)}{' '}
            additional skills
          </span>
        </div>
      )}

      {/* Tools List */}
      <div className="space-y-3">
        {availableTools.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
            <Wrench className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 mb-2">No tools available</p>
            <p className="text-sm text-white/40">
              Tools will appear here once registered in the system
            </p>
          </div>
        ) : (
          availableTools.map((tool) => {
            const isSelected = selectedToolIds.includes(tool.id);
            const isExpanded = expandedToolId === tool.id;

            return (
              <div
                key={tool.id}
                className={`border rounded-xl transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Tool Header */}
                <div className="flex items-start gap-4 p-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTool(tool.id)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-white/30 hover:border-white/50'
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </button>

                  {/* Tool Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium">{tool.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded border ${getToolTypeColor(tool.type)}`}>
                        {tool.type}
                      </span>
                      {!tool.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-white/60 mb-2">{tool.description}</p>

                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span>{tool.skillCount} skill{tool.skillCount !== 1 ? 's' : ''}</span>
                      <button
                        onClick={() => toggleExpand(tool.id)}
                        className="flex items-center gap-1 hover:text-white/80 transition-colors"
                      >
                        <Info className="w-3 h-3" />
                        {isExpanded ? 'Hide' : 'Show'} skills
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Skills List */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/10 pt-3">
                    <div className="space-y-2">
                      {tool.skills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-white mb-1">
                                {skill.name}
                              </div>
                              <div className="text-xs text-white/60 mb-2">
                                {skill.description}
                              </div>
                              {skill.parameters.length > 0 && (
                                <div className="text-xs text-white/40">
                                  Parameters: {skill.parameters.map((p: any) => p.name).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Help Text */}
      {selectedToolIds.length > 0 && (
        <div className="p-4 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-white/70">
              <p className="mb-2">
                <strong className="text-white">Selected tools will be attached to your agent.</strong>
              </p>
              <p>
                The agent will be able to execute skills from these tools using natural language.
                For example: "Summarize this email and create a CRM lead if it's a sales inquiry."
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

