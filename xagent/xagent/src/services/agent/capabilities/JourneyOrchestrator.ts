/**
 * Journey Orchestrator
 * Tracks multi-turn conversations and orchestrates complete customer journeys
 * This is a core capability for ALL agents
 */

import { getSupabaseClient } from '../../../config/supabase';

export interface CustomerJourney {
  id: string;
  user_id: string;
  agent_id: string;
  agent_name: string;
  intent: string;
  current_stage: string;
  status: 'active' | 'completed' | 'abandoned';
  context: Record<string, any>;
  completed_steps: JourneyStep[];
  pending_steps: JourneyStep[];
  suggested_next_actions: SuggestedAction[];
  related_documents: DocumentReference[];
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface JourneyStep {
  id: string;
  description: string;
  action_type: 'question' | 'information' | 'action' | 'workflow';
  completed: boolean;
  completed_at?: Date;
  result?: any;
}

export interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  action_type: 'workflow' | 'form' | 'api_call' | 'navigation';
  can_automate: boolean;
  priority: 'low' | 'medium' | 'high';
  parameters?: Record<string, any>;
}

export interface DocumentReference {
  id: string;
  title: string;
  section?: string;
  page_number?: number;
  url?: string;
  excerpt: string;
  relevance_score: number;
  last_updated?: Date;
  doc_type: 'policy' | 'form' | 'guide' | 'faq' | 'external';
}

export class JourneyOrchestrator {
  private static instance: JourneyOrchestrator;
  private activeJourneys: Map<string, CustomerJourney> = new Map();
  private supabase;

  private constructor() {
    this.supabase = getSupabaseClient();
  }

  public static getInstance(): JourneyOrchestrator {
    if (!this.instance) {
      this.instance = new JourneyOrchestrator();
    }
    return this.instance;
  }

  /**
   * Start a new customer journey
   */
  async startJourney(
    userId: string,
    agentId: string,
    agentName: string,
    initialMessage: string
  ): Promise<CustomerJourney> {
    // Analyze intent from initial message
    const intent = await this.analyzeIntent(initialMessage);

    const journey: CustomerJourney = {
      id: crypto.randomUUID(),
      user_id: userId,
      agent_id: agentId,
      agent_name: agentName,
      intent: intent.primary_intent,
      current_stage: 'information_gathering',
      status: 'active',
      context: intent.extracted_entities || {},
      completed_steps: [],
      pending_steps: intent.suggested_steps || [],
      suggested_next_actions: [],
      related_documents: [],
      created_at: new Date(),
      updated_at: new Date()
    };

    // Store in memory and database
    this.activeJourneys.set(journey.id, journey);
    await this.saveJourney(journey);

    console.log(`🚀 Journey started: ${intent.primary_intent}`);

    return journey;
  }

  /**
   * Get active journey for user and agent
   */
  async getActiveJourney(userId: string, agentId: string): Promise<CustomerJourney | null> {
    // Check memory cache first
    for (const journey of this.activeJourneys.values()) {
      if (journey.user_id === userId && 
          journey.agent_id === agentId && 
          journey.status === 'active') {
        return journey;
      }
    }

    // Load from database
    try {
      const { data, error } = await this.supabase
        .from('customer_journeys')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      const journey = this.mapDatabaseJourney(data);
      this.activeJourneys.set(journey.id, journey);
      
      return journey;

    } catch (error) {
      return null;
    }
  }

  /**
   * Update journey with new step
   */
  async addJourneyStep(
    journeyId: string,
    step: Omit<JourneyStep, 'id' | 'completed' | 'completed_at'>
  ): Promise<void> {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) return;

    const newStep: JourneyStep = {
      id: crypto.randomUUID(),
      ...step,
      completed: false
    };

    journey.completed_steps.push(newStep);
    journey.updated_at = new Date();

    await this.saveJourney(journey);

    console.log(`📝 Journey step added: ${step.description}`);
  }

  /**
   * Complete a journey step
   */
  async completeJourneyStep(journeyId: string, stepId: string, result?: any): Promise<void> {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) return;

    const step = journey.completed_steps.find(s => s.id === stepId);
    if (step) {
      step.completed = true;
      step.completed_at = new Date();
      step.result = result;
    }

    // Remove from pending if exists
    journey.pending_steps = journey.pending_steps.filter(s => s.id !== stepId);
    journey.updated_at = new Date();

    await this.saveJourney(journey);

    console.log(`✅ Journey step completed: ${step?.description}`);
  }

  /**
   * Add suggested next actions
   */
  async suggestNextActions(
    journeyId: string,
    actions: SuggestedAction[]
  ): Promise<void> {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) return;

    journey.suggested_next_actions = actions;
    journey.updated_at = new Date();

    await this.saveJourney(journey);

    console.log(`💡 Added ${actions.length} suggested actions`);
  }

  /**
   * Add related documents to journey
   */
  async addRelatedDocuments(
    journeyId: string,
    documents: DocumentReference[]
  ): Promise<void> {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) return;

    // Deduplicate and merge
    const existingIds = new Set(journey.related_documents.map(d => d.id));
    const newDocs = documents.filter(d => !existingIds.has(d.id));

    journey.related_documents.push(...newDocs);
    journey.updated_at = new Date();

    await this.saveJourney(journey);

    console.log(`📚 Added ${newDocs.length} related documents`);
  }

  /**
   * Complete journey
   */
  async completeJourney(journeyId: string): Promise<void> {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) return;

    journey.status = 'completed';
    journey.completed_at = new Date();
    journey.updated_at = new Date();

    await this.saveJourney(journey);

    console.log(`🎉 Journey completed: ${journey.intent}`);

    // Remove from active cache
    this.activeJourneys.delete(journeyId);
  }

  /**
   * Abandon journey (user stopped responding)
   */
  async abandonJourney(journeyId: string): Promise<void> {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) return;

    journey.status = 'abandoned';
    journey.updated_at = new Date();

    await this.saveJourney(journey);

    this.activeJourneys.delete(journeyId);
  }

  /**
   * Get journey history for user
   */
  async getJourneyHistory(userId: string, limit: number = 10): Promise<CustomerJourney[]> {
    const { data, error } = await this.supabase
      .from('customer_journeys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(this.mapDatabaseJourney);
  }

  /**
   * Analyze intent from message
   */
  private async analyzeIntent(message: string): Promise<any> {
    // Simple keyword-based intent detection for now
    // In production, use LLM for accurate intent analysis
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('leave') || lowerMessage.includes('vacation')) {
      return {
        primary_intent: 'leave_request',
        confidence: 0.8,
        extracted_entities: {},
        suggested_steps: [
          { description: 'Explain leave policy', action_type: 'information' },
          { description: 'Check leave balance', action_type: 'action' },
          { description: 'Submit leave request', action_type: 'workflow' }
        ]
      };
    }

    if (lowerMessage.includes('refund') || lowerMessage.includes('return')) {
      return {
        primary_intent: 'refund_request',
        confidence: 0.8,
        extracted_entities: {},
        suggested_steps: [
          { description: 'Explain refund policy', action_type: 'information' },
          { description: 'Initiate refund', action_type: 'workflow' }
        ]
      };
    }

    return {
      primary_intent: 'general_inquiry',
      confidence: 0.5,
      extracted_entities: {},
      suggested_steps: []
    };
  }

  /**
   * Save journey to database
   */
  private async saveJourney(journey: CustomerJourney): Promise<void> {
    try {
      await this.supabase
        .from('customer_journeys')
        .upsert({
          id: journey.id,
          user_id: journey.user_id,
          agent_id: journey.agent_id,
          agent_name: journey.agent_name,
          intent: journey.intent,
          current_stage: journey.current_stage,
          status: journey.status,
          context: journey.context,
          completed_steps: journey.completed_steps,
          pending_steps: journey.pending_steps,
          suggested_next_actions: journey.suggested_next_actions,
          related_documents: journey.related_documents,
          created_at: journey.created_at,
          updated_at: journey.updated_at,
          completed_at: journey.completed_at
        });

    } catch (error) {
      console.warn('Could not save journey to database:', error);
      // Continue - journey works in-memory
    }
  }

  /**
   * Map database record to CustomerJourney
   */
  private mapDatabaseJourney(data: any): CustomerJourney {
    return {
      id: data.id,
      user_id: data.user_id,
      agent_id: data.agent_id,
      agent_name: data.agent_name,
      intent: data.intent,
      current_stage: data.current_stage,
      status: data.status,
      context: data.context || {},
      completed_steps: data.completed_steps || [],
      pending_steps: data.pending_steps || [],
      suggested_next_actions: data.suggested_next_actions || [],
      related_documents: data.related_documents || [],
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }
}


