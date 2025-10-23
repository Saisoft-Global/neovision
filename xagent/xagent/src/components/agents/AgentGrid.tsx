import React, { useEffect, useState } from 'react';
import { AgentCard } from './AgentCard';
import { useAgentStore } from '../../store/agentStore';
import type { Agent } from '../../types/agent';
import { getSupabaseClient } from '../../config/supabase';
import { Loader2 } from 'lucide-react';

export const AgentGrid: React.FC = () => {
  const { selectAgent, selectedAgent, clearMessages } = useAgentStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = getSupabaseClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to view agents');
        setLoading(false);
        return;
      }

      // Fetch agents from the organization
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          name,
          type,
          description,
          status,
          created_at,
          organization_id,
          visibility
        `)
        .eq('organization_id', '21fcd301-2aa4-4600-a8f8-7f95263f550b') // XAgent Workspace
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error('Error loading agents:', agentsError);
        setError('Failed to load agents');
        setLoading(false);
        return;
      }

      // Fetch personality traits and skills for each agent
      const enrichedAgents = await Promise.all(
        (agentsData || []).map(async (agent) => {
          // Get personality traits
          const { data: traits } = await supabase
            .from('agent_personality_traits')
            .select('trait_name, trait_value')
            .eq('agent_id', agent.id);

          // Get skills
          const { data: skills } = await supabase
            .from('agent_skills')
            .select('skill_name, skill_level')
            .eq('agent_id', agent.id);

          // Build personality object
          const personality: any = {
            friendliness: 0.7,
            formality: 0.7,
            proactiveness: 0.7,
            detail_orientation: 0.7
          };

          if (traits) {
            traits.forEach((trait) => {
              personality[trait.trait_name] = trait.trait_value;
            });
          }

          // Build expertise array from skills
          const expertise = (skills || []).map(s => 
            s.skill_name.split('_').map((word: string) => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
          );

          return {
            id: agent.id,
            name: agent.name,
            type: agent.type,
            description: agent.description || `AI Agent specialized in ${agent.type}`,
            expertise: expertise.length > 0 ? expertise : [agent.type],
            isAvailable: agent.status === 'active',
            personality
          } as Agent;
        })
      );

      console.log(`✅ Loaded ${enrichedAgents.length} agents from database`);
      setAgents(enrichedAgents);
      setLoading(false);
    } catch (err) {
      console.error('Error loading agents:', err);
      setError('Failed to load agents');
      setLoading(false);
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    clearMessages();
    selectAgent(agent);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading agents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadAgents}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-600 mb-4">No agents found. Create your first agent!</p>
        <a
          href="/agent-builder"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Agent
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Your AI Agents</h2>
          <p className="text-sm text-gray-500 mt-1">
            {agents.length} {agents.length === 1 ? 'agent' : 'agents'} available
          </p>
        </div>
        <a
          href="/agent-builder"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Create New Agent
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {agents.map((agent) => (
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