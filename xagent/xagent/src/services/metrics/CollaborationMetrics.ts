import { createClient } from '@supabase/supabase-js';
import type { AgentMessage } from '../../types/messaging';

export class CollaborationMetrics {
  private static instance: CollaborationMetrics;
  private supabase;

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  public static getInstance(): CollaborationMetrics {
    if (!this.instance) {
      this.instance = new CollaborationMetrics();
    }
    return this.instance;
  }

  async trackInteraction(message: AgentMessage): Promise<void> {
    const { error } = await this.supabase
      .from('agent_interactions')
      .insert({
        sender_id: message.senderId,
        recipient_id: message.recipientId,
        topic: message.topic,
        type: message.type,
        timestamp: message.timestamp,
      });

    if (error) throw error;
  }

  async getCollaborationEfficiency(agentIds: string[]): Promise<number> {
    const { data, error } = await this.supabase
      .from('agent_interactions')
      .select('*')
      .in('sender_id', agentIds)
      .in('recipient_id', agentIds);

    if (error) throw error;

    const successfulInteractions = data.filter(
      interaction => interaction.status === 'completed'
    ).length;

    return successfulInteractions / data.length;
  }
}