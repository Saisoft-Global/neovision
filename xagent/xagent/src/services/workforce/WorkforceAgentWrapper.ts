/**
 * Workforce Agent Wrapper
 * Wraps existing agents to integrate with hierarchical workforce system
 */

import { BaseAgent } from '../agent/BaseAgent';
import { workforceIntegration, WorkforceAwareAgent } from './WorkforceIntegration';
import { WorkforceLevel } from './HierarchicalWorkforceManager';
import type { AgentConfig } from '../../types/agent-framework';

/**
 * Wrapper class that makes any existing agent workforce-aware
 */
export class WorkforceAgentWrapper extends BaseAgent implements WorkforceAwareAgent {
  public workforceLevel: WorkforceLevel;
  public department: string;
  public confidenceThreshold: number;
  public maxComplexity: number;
  public humanSupervisor?: string;
  public aiSupervisor?: string;

  private wrappedAgent: BaseAgent;

  constructor(
    agent: BaseAgent,
    workforceConfig: {
      level: WorkforceLevel;
      department: string;
      confidenceThreshold: number;
      maxComplexity: number;
      humanSupervisor?: string;
      aiSupervisor?: string;
    }
  ) {
    // Initialize with the wrapped agent's config
    super(agent.id, agent.config);
    
    this.wrappedAgent = agent;
    this.workforceLevel = workforceConfig.level;
    this.department = workforceConfig.department;
    this.confidenceThreshold = workforceConfig.confidenceThreshold;
    this.maxComplexity = workforceConfig.maxComplexity;
    this.humanSupervisor = workforceConfig.humanSupervisor;
    this.aiSupervisor = workforceConfig.aiSupervisor;

    // Register with workforce system
    workforceIntegration.registerAgent(this);
  }

  /**
   * Process message with workforce-aware escalation
   */
  async processMessage(message: any, context: any = {}): Promise<any> {
    // Use workforce integration to process with escalation
    const result = await workforceIntegration.processTaskWithWorkforce(
      this.id,
      {
        id: `task-${Date.now()}`,
        type: message.type || 'general',
        description: message.content || message.message || 'Task processing',
        ...message
      },
      context
    );

    if (result.escalated) {
      // Task was escalated, return escalation info
      return {
        escalated: true,
        reason: result.escalationReason,
        humanInteractionId: result.humanInteractionId,
        transferredTo: result.result?.transferredTo
      };
    }

    // Task can be handled by this agent, process normally
    return await this.wrappedAgent.processMessage(message, context);
  }

  /**
   * Delegate all other methods to wrapped agent
   */
  async initialize(): Promise<void> {
    return this.wrappedAgent.initialize();
  }

  async buildSystemPrompt(context: AgentContext): Promise<string> {
    return this.wrappedAgent.buildSystemPrompt(context);
  }

  async buildBasicSystemPrompt(): Promise<string> {
    return this.wrappedAgent.buildBasicSystemPrompt();
  }

  // Delegate all other BaseAgent methods
  get name(): string {
    return this.wrappedAgent.name || this.id;
  }

  get capabilities(): any[] {
    return this.wrappedAgent.capabilities || [];
  }

  get config(): AgentConfig {
    return this.wrappedAgent.config;
  }

  get id(): string {
    return this.wrappedAgent.id;
  }

  // Add workforce-specific methods
  getWorkforceInfo() {
    return {
      id: this.id,
      name: this.name,
      level: this.workforceLevel,
      department: this.department,
      confidenceThreshold: this.confidenceThreshold,
      maxComplexity: this.maxComplexity,
      humanSupervisor: this.humanSupervisor,
      aiSupervisor: this.aiSupervisor,
      capabilities: this.capabilities
    };
  }

  /**
   * Update workforce configuration
   */
  updateWorkforceConfig(config: Partial<{
    level: WorkforceLevel;
    department: string;
    confidenceThreshold: number;
    maxComplexity: number;
    humanSupervisor?: string;
    aiSupervisor?: string;
  }>) {
    if (config.level) this.workforceLevel = config.level;
    if (config.department) this.department = config.department;
    if (config.confidenceThreshold) this.confidenceThreshold = config.confidenceThreshold;
    if (config.maxComplexity) this.maxComplexity = config.maxComplexity;
    if (config.humanSupervisor !== undefined) this.humanSupervisor = config.humanSupervisor;
    if (config.aiSupervisor !== undefined) this.aiSupervisor = config.aiSupervisor;

    // Re-register with updated config
    workforceIntegration.registerAgent(this);
  }
}

/**
 * Factory function to create workforce-aware agents
 */
export function createWorkforceAgent(
  agent: BaseAgent,
  workforceConfig: {
    level: WorkforceLevel;
    department: string;
    confidenceThreshold?: number;
    maxComplexity?: number;
    humanSupervisor?: string;
    aiSupervisor?: string;
  }
): WorkforceAgentWrapper {
  // Set defaults based on level
  const defaults = getDefaultsForLevel(workforceConfig.level);
  
  const config = {
    confidenceThreshold: defaults.confidenceThreshold,
    maxComplexity: defaults.maxComplexity,
    ...workforceConfig
  };

  return new WorkforceAgentWrapper(agent, config);
}

/**
 * Get default configuration for workforce level
 */
function getDefaultsForLevel(level: WorkforceLevel): {
  confidenceThreshold: number;
  maxComplexity: number;
} {
  switch (level) {
    case WorkforceLevel.WORKER:
      return {
        confidenceThreshold: 0.7,
        maxComplexity: 3
      };
    case WorkforceLevel.MANAGER:
      return {
        confidenceThreshold: 0.8,
        maxComplexity: 6
      };
    case WorkforceLevel.DIRECTOR:
      return {
        confidenceThreshold: 0.9,
        maxComplexity: 8
      };
    case WorkforceLevel.HUMAN:
      return {
        confidenceThreshold: 0.95,
        maxComplexity: 10
      };
    default:
      return {
        confidenceThreshold: 0.8,
        maxComplexity: 5
      };
  }
}

/**
 * Pre-configured workforce agents for common scenarios
 */
export const WORKFORCE_AGENT_CONFIGS = {
  // Customer Service Department
  customerSupportWorker: {
    level: WorkforceLevel.WORKER,
    department: 'Customer Service',
    confidenceThreshold: 0.7,
    maxComplexity: 3,
    aiSupervisor: 'ai-customer-support-manager'
  },
  customerSupportManager: {
    level: WorkforceLevel.MANAGER,
    department: 'Customer Service',
    confidenceThreshold: 0.8,
    maxComplexity: 6,
    aiSupervisor: 'ai-customer-director',
    humanSupervisor: 'human-customer-director'
  },
  customerDirector: {
    level: WorkforceLevel.DIRECTOR,
    department: 'Customer Service',
    confidenceThreshold: 0.9,
    maxComplexity: 8,
    humanSupervisor: 'human-customer-director'
  },

  // Operations Department
  operationsWorker: {
    level: WorkforceLevel.WORKER,
    department: 'Operations',
    confidenceThreshold: 0.8,
    maxComplexity: 2,
    aiSupervisor: 'ai-operations-manager'
  },
  operationsManager: {
    level: WorkforceLevel.MANAGER,
    department: 'Operations',
    confidenceThreshold: 0.8,
    maxComplexity: 6,
    aiSupervisor: 'ai-operations-director',
    humanSupervisor: 'human-operations-director'
  },
  operationsDirector: {
    level: WorkforceLevel.DIRECTOR,
    department: 'Operations',
    confidenceThreshold: 0.9,
    maxComplexity: 8,
    humanSupervisor: 'human-operations-director'
  },

  // HR Department
  hrManager: {
    level: WorkforceLevel.MANAGER,
    department: 'Human Resources',
    confidenceThreshold: 0.75,
    maxComplexity: 7,
    aiSupervisor: 'ai-hr-director',
    humanSupervisor: 'human-hr-director'
  },
  hrDirector: {
    level: WorkforceLevel.DIRECTOR,
    department: 'Human Resources',
    confidenceThreshold: 0.85,
    maxComplexity: 8,
    humanSupervisor: 'human-hr-director'
  },

  // Finance Department
  financeManager: {
    level: WorkforceLevel.MANAGER,
    department: 'Finance',
    confidenceThreshold: 0.85,
    maxComplexity: 6,
    aiSupervisor: 'ai-finance-director',
    humanSupervisor: 'human-finance-director'
  },
  financeDirector: {
    level: WorkforceLevel.DIRECTOR,
    department: 'Finance',
    confidenceThreshold: 0.9,
    maxComplexity: 8,
    humanSupervisor: 'human-finance-director'
  }
};


