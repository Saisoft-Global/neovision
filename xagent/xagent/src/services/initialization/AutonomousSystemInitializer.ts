/**
 * Autonomous System Initializer
 * Initializes and wires all autonomous agents on system startup
 */

import { AutonomousScheduler } from '../agent/autonomous/AutonomousScheduler';
import { AgentEventBus } from '../events/AgentEventBus';
import { GoalManager } from '../agent/goals/GoalManager';
import { CustomerSupportAgent } from '../agent/agents/CustomerSupportAgent';
import { ProductivityAIAgent } from '../agent/agents/ProductivityAIAgent';
import { EmailAgent } from '../agents/EmailAgent';

export class AutonomousSystemInitializer {
  private static instance: AutonomousSystemInitializer;
  private scheduler: AutonomousScheduler;
  private eventBus: AgentEventBus;
  private goalManager: GoalManager;
  private initialized: boolean = false;

  private constructor() {
    this.scheduler = AutonomousScheduler.getInstance();
    this.eventBus = AgentEventBus.getInstance();
    this.goalManager = GoalManager.getInstance();
  }

  public static getInstance(): AutonomousSystemInitializer {
    if (!this.instance) {
      this.instance = new AutonomousSystemInitializer();
    }
    return this.instance;
  }

  /**
   * Initialize the autonomous agent system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ Autonomous system already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Autonomous Agent System...');

      // Initialize core systems
      console.log('📡 Event Bus initialized');
      console.log('🎯 Goal Manager initialized');
      console.log('⏰ Autonomous Scheduler initialized');

      this.initialized = true;

      console.log('✅ Autonomous Agent System initialized successfully!');
      console.log('');
      console.log('📋 Available agents for autonomous operation:');
      console.log('   1. Customer Support AI Teller');
      console.log('   2. Productivity AI Agent');
      console.log('   3. Email AI Agent');
      console.log('');
      console.log('💡 Use startAutonomousAgent() to activate agents');

    } catch (error) {
      console.error('❌ Failed to initialize autonomous system:', error);
      throw error;
    }
  }

  /**
   * Start an agent in autonomous mode
   */
  async startAutonomousAgent(
    agentType: 'customer-support' | 'productivity' | 'email',
    userId?: string,
    config?: {
      interval_ms?: number;
      schedule_type?: 'interval' | 'cron' | 'continuous';
    }
  ): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    let agent: any;
    let agentName: string;

    // Create the appropriate agent
    switch (agentType) {
      case 'customer-support':
        agent = new CustomerSupportAgent(
          crypto.randomUUID(),
          {
            name: 'Customer Support AI Teller',
            personality: { friendliness: 0.9, formality: 0.8, proactiveness: 0.95, detail_orientation: 0.9 },
            skills: [
              { name: 'ticket_classification', level: 5 },
              { name: 'customer_communication', level: 5 },
              { name: 'problem_solving', level: 5 }
            ],
            knowledge_bases: [],
            llm_config: { provider: 'openai', model: 'gpt-4-turbo-preview', temperature: 0.7 }
          }
        );
        agentName = 'Customer Support AI Teller';
        break;

      case 'productivity':
        agent = new ProductivityAIAgent(crypto.randomUUID(), {} as any);
        if (userId) {
          agent.setUserId(userId);
        }
        agentName = 'Productivity AI Agent';
        break;

      case 'email':
        agent = new EmailAgent();
        agentName = 'Email AI Agent';
        break;

      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Subscribe to relevant events
    this.subscribeAgentToEvents(agent, agentType);

    // Start in autonomous mode
    const scheduleId = await this.scheduler.startAutonomous(agent, {
      schedule_type: config?.schedule_type || 'interval',
      interval_ms: config?.interval_ms || 1800000, // Default: 30 minutes
      enabled: true
    });

    console.log(`✅ ${agentName} started in autonomous mode`);
    console.log(`   Schedule ID: ${scheduleId}`);
    console.log(`   Interval: ${(config?.interval_ms || 1800000) / 60000} minutes`);

    return scheduleId;
  }

  /**
   * Subscribe agent to relevant events
   */
  private subscribeAgentToEvents(agent: any, agentType: string): void {
    switch (agentType) {
      case 'customer-support':
        agent.subscribeToEvent('ticket.created');
        agent.subscribeToEvent('ticket.urgent');
        agent.subscribeToEvent('customer.feedback');
        console.log('📌 Customer Support Agent subscribed to support events');
        break;

      case 'productivity':
        agent.subscribeToEvent('email.received');
        agent.subscribeToEvent('meeting.scheduled');
        agent.subscribeToEvent('task.created');
        agent.subscribeToEvent('deadline.approaching');
        console.log('📌 Productivity Agent subscribed to productivity events');
        break;

      case 'email':
        agent.subscribeToEvent('email.received');
        agent.subscribeToEvent('email.urgent');
        console.log('📌 Email Agent subscribed to email events');
        break;
    }
  }

  /**
   * Stop an autonomous agent
   */
  async stopAutonomousAgent(scheduleId: string): Promise<void> {
    await this.scheduler.stopAutonomous(scheduleId);
    console.log(`⏹️ Autonomous agent stopped: ${scheduleId}`);
  }

  /**
   * Get active schedules
   */
  async getActiveSchedules(): Promise<any[]> {
    return await this.scheduler.getActiveSchedules();
  }

  /**
   * Emit a system event
   */
  async emitEvent(event: {
    type: string;
    source: string;
    data: any;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    await this.eventBus.emit({
      type: event.type,
      source: event.source,
      data: event.data,
      priority: event.priority || 'medium'
    });
  }

  /**
   * Create a goal for an agent
   */
  async createGoal(goal: {
    agent_id: string;
    agent_name: string;
    user_id?: string;
    description: string;
    goal_type: 'task' | 'project' | 'learning' | 'optimization' | 'monitoring';
    priority: 'low' | 'medium' | 'high' | 'critical';
    deadline?: Date;
    milestones?: Array<{ description: string; required: boolean }>;
  }): Promise<any> {
    const milestones = (goal.milestones || []).map(m => ({
      id: crypto.randomUUID(),
      description: m.description,
      completed: false,
      required: m.required
    }));

    return await this.goalManager.createGoal({
      agent_id: goal.agent_id,
      agent_name: goal.agent_name,
      user_id: goal.user_id,
      description: goal.description,
      goal_type: goal.goal_type,
      status: 'active',
      priority: goal.priority,
      milestones,
      deadline: goal.deadline
    });
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    initialized: boolean;
    activeSchedules: number;
    eventBusActive: boolean;
    goalManagerActive: boolean;
  } {
    return {
      initialized: this.initialized,
      activeSchedules: this.scheduler.getActiveSchedules().length || 0,
      eventBusActive: true,
      goalManagerActive: true
    };
  }

  /**
   * Shutdown the autonomous system
   */
  shutdown(): void {
    console.log('🛑 Shutting down Autonomous Agent System...');
    
    this.scheduler.shutdown();
    this.eventBus.shutdown();
    
    this.initialized = false;
    
    console.log('✅ Autonomous system shutdown complete');
  }
}

// Export singleton instance for easy access
export const autonomousSystem = AutonomousSystemInitializer.getInstance();


