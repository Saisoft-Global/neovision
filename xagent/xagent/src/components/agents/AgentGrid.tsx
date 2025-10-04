import React from 'react';
import { AgentCard } from './AgentCard';
import { useAgentStore } from '../../store/agentStore';
import type { Agent } from '../../types/agent';

const DEMO_AGENTS = [
  {
    id: '1',
    name: 'HR Assistant',
    type: 'hr',
    description: 'Expert in employee relations, HR policies, and recruitment',
    expertise: ['Employee Relations', 'HR Policies', 'Recruitment', 'Benefits'],
    isAvailable: true,
    personality: {
      friendliness: 0.9,
      formality: 0.7,
      proactiveness: 0.8,
      detail_orientation: 0.9
    }
  },
  {
    id: '2',
    name: 'Finance Advisor',
    type: 'finance',
    description: 'Specialist in financial analysis and planning',
    expertise: ['Financial Analysis', 'Investment', 'Risk Management', 'Tax Planning'],
    isAvailable: true,
    personality: {
      friendliness: 0.6,
      formality: 0.9,
      proactiveness: 0.7,
      detail_orientation: 1.0
    }
  },
  {
    id: '3',
    name: 'Technical Expert',
    type: 'technical',
    description: 'Software and system architecture specialist',
    expertise: ['Software Development', 'System Architecture', 'Cloud Infrastructure'],
    isAvailable: true,
    personality: {
      friendliness: 0.7,
      formality: 0.8,
      proactiveness: 0.8,
      detail_orientation: 0.9
    }
  }
];

export const AgentGrid: React.FC = () => {
  const { selectAgent, selectedAgent, clearMessages } = useAgentStore();

  const handleSelectAgent = (agent: Agent) => {
    clearMessages();
    selectAgent(agent);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Available Agents</h2>
        <span className="text-sm text-gray-500">
          Select an agent to start a specialized conversation
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {DEMO_AGENTS.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onSelect={handleSelectAgent}
            isSelected={selectedAgent?.id === agent.id}
          />
        ))}
      </div>
    </div>
  );
};