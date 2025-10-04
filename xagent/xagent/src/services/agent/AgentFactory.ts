import { createClient } from '@supabase/supabase-js';
import type { AgentConfig } from '../../types/agent-framework';
import { BaseAgent } from './BaseAgent';
import { EmailAgent } from './agents/EmailAgent';
import { MeetingAgent } from './agents/MeetingAgent';
import { KnowledgeAgent } from './agents/KnowledgeAgent';
import { TaskAgent } from './agents/TaskAgent';

export class AgentFactory {
  private static instance: AgentFactory;
  private supabase;
  private agentCache: Map<string, BaseAgent>;

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    this.agentCache = new Map();
  }

  public static getInstance(): AgentFactory {
    if (!this.instance) {
      this.instance = new AgentFactory();
    }
    return this.instance;
  }

  async createAgent(type: string, config: AgentConfig): Promise<BaseAgent> {
    const id = crypto.randomUUID();
    const agent = this.instantiateAgent(id, type, config);
    
    await this.storeAgent({
      id,
      type,
      config,
      status: 'active',
    });

    this.agentCache.set(id, agent);
    return agent;
  }

  async getAgent(id: string): Promise<BaseAgent> {
    if (this.agentCache.has(id)) {
      return this.agentCache.get(id)!;
    }

    const { data: agentData, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const agent = this.instantiateAgent(
      agentData.id,
      agentData.type,
      agentData.config
    );

    this.agentCache.set(id, agent);
    return agent;
  }

  private instantiateAgent(id: string, type: string, config: AgentConfig): BaseAgent {
    switch (type) {
      case 'email':
        return new EmailAgent(id, config);
      case 'meeting':
        return new MeetingAgent(id, config);
      case 'knowledge':
        return new KnowledgeAgent(id, config);
      case 'task':
        return new TaskAgent(id, config);
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  private async storeAgent(data: Record<string, any>): Promise<void> {
    const { error } = await this.supabase
      .from('agents')
      .insert(data);

    if (error) throw error;
  }
}