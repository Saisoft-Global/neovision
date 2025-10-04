import { EventBus } from '../events/EventBus';
import type { AgentRequest, AgentResponse } from '../../types/agent';
import { determineIntent } from './intentAnalyzer';
import { createWorkflow } from './workflowGenerator';
import { prioritizeActions } from './actionPrioritizer';
import { isServiceConfigured } from '../../config/environment';
import { AgentFactory } from '../agent/AgentFactory';
import { KnowledgeAgent } from '../agents/KnowledgeAgent';
import { EmailAgent } from '../agents/EmailAgent';
import { MeetingAgent } from '../agents/MeetingAgent';
import { TaskAgent } from '../agents/TaskAgent';

export class OrchestratorAgent {
  private static instance: OrchestratorAgent | null = null;
  private eventBus: EventBus;
  private agentFactory: AgentFactory;
  private agentCache: Map<string, any>;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.agentFactory = AgentFactory.getInstance();
    this.agentCache = new Map();
  }

  public static getInstance(): OrchestratorAgent {
    if (!this.instance) {
      this.instance = new OrchestratorAgent();
    }
    return this.instance;
  }

  public async processRequest(input: unknown): Promise<AgentResponse> {
    try {
      // Check if OpenAI is configured
      if (!isServiceConfigured('openai')) {
        return {
          success: false,
          data: null,
          error: 'OpenAI API key not configured. Please check your environment variables.'
        };
      }

      // Determine intent and create workflow
      const intent = await determineIntent(input);
      const workflow = await createWorkflow(intent, input);
      const prioritizedActions = prioritizeActions(workflow);

      // Execute workflow
      const results = await this.executeWorkflow(prioritizedActions);
      
      this.eventBus.emit('requestProcessed', { 
        success: true, 
        results 
      });

      return {
        success: true,
        data: results[results.length - 1] // Return last result as response
      };
    } catch (error) {
      // Handle OpenAI specific errors
      if (error?.name === 'OpenAIError') {
        const message = this.handleOpenAIError(error);
        this.eventBus.emit('processingError', { error: message });
        return {
          success: false,
          data: null,
          error: message
        };
      }

      // Handle other errors
      console.error('Orchestrator error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.eventBus.emit('processingError', { error: message });
      
      return {
        success: false,
        data: null,
        error: message
      };
    }
  }

  private async executeWorkflow(actions: AgentRequest[]): Promise<unknown[]> {
    const results = [];
    const context = {};

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, context);
        results.push(result);
        Object.assign(context, { [action.type]: result });
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
        throw error;
      }
    }

    return results;
  }

  private async executeAction(
    action: AgentRequest, 
    context: Record<string, unknown>
  ): Promise<unknown> {
    const agent = await this.getAgentForAction(action.type);
    if (!agent) {
      throw new Error(`No agent found for action type: ${action.type}`);
    }

    return agent.execute(action.action, {
      ...action.payload,
      context
    });
  }

  private async getAgentForAction(type: string): Promise<any> {
    // Check cache first
    if (this.agentCache.has(type)) {
      return this.agentCache.get(type);
    }

    // Create new agent instance
    let agent;
    const config = {
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.6,
        detail_orientation: 0.9,
      },
      skills: [],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      },
    };

    switch (type) {
      case 'knowledge':
        agent = new KnowledgeAgent(crypto.randomUUID(), config);
        break;
      case 'email':
        agent = new EmailAgent(crypto.randomUUID(), config);
        break;
      case 'meeting':
        agent = new MeetingAgent(crypto.randomUUID(), config);
        break;
      case 'task':
        agent = new TaskAgent(crypto.randomUUID(), config);
        break;
      default:
        // Try to get agent from factory
        agent = await this.agentFactory.getAgent(type);
        if (!agent) {
          throw new Error(`Unsupported agent type: ${type}`);
        }
    }

    // Cache the agent instance
    this.agentCache.set(type, agent);
    return agent;
  }

  private handleOpenAIError(error: any): string {
    if (error.status === 429) {
      return 'Rate limit exceeded. Please try again in a moment.';
    }
    if (error.status === 401) {
      return 'OpenAI API key is invalid. Please check your configuration.';
    }
    if (error.status === 503) {
      return 'OpenAI service is temporarily unavailable. Please try again later.';
    }
    return 'An error occurred while processing your request. Please try again.';
  }

  onRequestProcessed(callback: (data: { success: boolean; results: unknown[] }) => void): void {
    this.eventBus.on('requestProcessed', callback);
  }

  onProcessingError(callback: (data: { error: string }) => void): void {
    this.eventBus.on('processingError', callback);
  }
}