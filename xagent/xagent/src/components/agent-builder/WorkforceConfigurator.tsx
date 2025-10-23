import React from 'react';
import { Zap, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { ModernCard } from '../ui/ModernCard';
import type { AgentConfig } from '../../types/agent-framework';

interface WorkforceConfiguratorProps {
  config: AgentConfig;
  updateConfig: (updates: Partial<AgentConfig>) => void;
}

export const WorkforceConfigurator: React.FC<WorkforceConfiguratorProps> = ({
  config,
  updateConfig
}) => {
  const workforce = config.workforce;

  const toggleWorkforce = (enabled: boolean) => {
    if (enabled) {
      updateConfig({
        workforce: {
          level: 'worker',
          department: 'Customer Service',
          confidenceThreshold: 0.8,
          maxComplexity: 4,
          aiSupervisor: 'ai-customer-service-manager'
        }
      });
    } else {
      updateConfig({ workforce: undefined });
    }
  };

  const updateWorkforce = (updates: Partial<NonNullable<AgentConfig['workforce']>>) => {
    if (!workforce) return;
    
    updateConfig({
      workforce: {
        ...workforce,
        ...updates
      }
    });
  };

  return (
    <ModernCard className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Zap className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Workforce Capabilities</h3>
            <p className="text-sm text-white/60">
              Enable hierarchical workflows and intelligent escalation
            </p>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-white">Enable Workforce Features</p>
              <p className="text-sm text-white/60">
                Add escalation, hierarchy, and human oversight
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!workforce}
              onChange={(e) => toggleWorkforce(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Workforce Configuration */}
        {workforce && (
          <div className="space-y-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="text-md font-medium text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Workforce Configuration
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Workforce Level */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Workforce Level
                </label>
                <select
                  value={workforce.level}
                  onChange={(e) => updateWorkforce({ level: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="worker">Worker - Handles routine tasks</option>
                  <option value="manager">Manager - Handles complex tasks</option>
                  <option value="director">Director - Handles strategic tasks</option>
                </select>
                <p className="text-xs text-white/60 mt-1">
                  Determines the complexity of tasks this agent can handle
                </p>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Department
                </label>
                <select
                  value={workforce.department}
                  onChange={(e) => updateWorkforce({ department: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="Customer Service">Customer Service</option>
                  <option value="Operations">Operations</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="IT Support">IT Support</option>
                </select>
                <p className="text-xs text-white/60 mt-1">
                  Organizational department for this agent
                </p>
              </div>

              {/* Confidence Threshold */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Confidence Threshold: {workforce.confidenceThreshold || 0.8}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={workforce.confidenceThreshold || 0.8}
                  onChange={(e) => updateWorkforce({ confidenceThreshold: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-white/60 mt-1">
                  Escalate if confidence below this threshold
                </p>
              </div>

              {/* Max Complexity */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Max Complexity: {workforce.maxComplexity || 4}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={workforce.maxComplexity || 4}
                  onChange={(e) => updateWorkforce({ maxComplexity: parseInt(e.target.value) })}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-white/60 mt-1">
                  Escalate if task complexity exceeds this level
                </p>
              </div>

              {/* AI Supervisor */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  AI Supervisor
                </label>
                <input
                  type="text"
                  value={workforce.aiSupervisor || ''}
                  onChange={(e) => updateWorkforce({ aiSupervisor: e.target.value })}
                  placeholder="ai-customer-service-manager"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <p className="text-xs text-white/60 mt-1">
                  ID of the AI agent that supervises this agent
                </p>
              </div>

              {/* Human Supervisor */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Human Supervisor
                </label>
                <input
                  type="text"
                  value={workforce.humanSupervisor || ''}
                  onChange={(e) => updateWorkforce({ humanSupervisor: e.target.value })}
                  placeholder="human-customer-service-manager"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <p className="text-xs text-white/60 mt-1">
                  ID of the human supervisor for this agent
                </p>
              </div>
            </div>

            {/* Escalation Flow Info */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-400 mb-2">Escalation Flow</h5>
                  <div className="text-sm text-white/80 space-y-1">
                    <p>• <strong>Low Confidence:</strong> Escalate when confidence &lt; {workforce.confidenceThreshold || 0.8}</p>
                    <p>• <strong>High Complexity:</strong> Escalate when complexity &gt; {workforce.maxComplexity || 4}</p>
                    <p>• <strong>AI Supervisor:</strong> {workforce.aiSupervisor || 'Not specified'}</p>
                    <p>• <strong>Human Supervisor:</strong> {workforce.humanSupervisor || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernCard>
  );
};



