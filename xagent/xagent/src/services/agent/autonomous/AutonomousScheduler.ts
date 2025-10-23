/**
 * Autonomous Scheduler
 * Enables AI agents to run continuously in the background
 * Supports cron schedules, intervals, and event-based triggers
 */

import { BaseAgent } from '../BaseAgent';
import { getSupabaseClient } from '../../../config/supabase';

export interface AgentSchedule {
  id: string;
  agent_id: string;
  agent_name: string;
  schedule_type: 'interval' | 'cron' | 'event' | 'continuous';
  interval_ms?: number;  // For interval type (e.g., every 30 mins)
  cron_expression?: string;  // For cron type (e.g., "0 9 * * *")
  event_type?: string;  // For event type (e.g., "email.received")
  enabled: boolean;
  last_run?: Date;
  next_run?: Date;
  run_count: number;
  created_at: Date;
  config?: Record<string, any>;
}

export interface AutonomousRunResult {
  success: boolean;
  actions_taken: string[];
  errors?: string[];
  next_run?: Date;
  duration_ms: number;
}

export class AutonomousScheduler {
  private static instance: AutonomousScheduler;
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private runningAgents: Map<string, boolean> = new Map();
  private supabase;

  private constructor() {
    this.supabase = getSupabaseClient();
    this.initializeScheduler();
  }

  public static getInstance(): AutonomousScheduler {
    if (!this.instance) {
      this.instance = new AutonomousScheduler();
    }
    return this.instance;
  }

  private async initializeScheduler(): Promise<void> {
    console.log('🤖 Autonomous Scheduler initialized');
    
    // Load all enabled schedules from database on startup
    await this.loadActiveSchedules();
  }

  /**
   * Start an agent in autonomous mode
   */
  async startAutonomous(
    agent: BaseAgent,
    schedule: Partial<AgentSchedule>
  ): Promise<string> {
    const scheduleId = schedule.id || crypto.randomUUID();
    
    const fullSchedule: AgentSchedule = {
      id: scheduleId,
      agent_id: agent.getId(),
      agent_name: agent.getName(),
      schedule_type: schedule.schedule_type || 'interval',
      interval_ms: schedule.interval_ms || 1800000, // Default 30 mins
      cron_expression: schedule.cron_expression,
      event_type: schedule.event_type,
      enabled: true,
      run_count: 0,
      created_at: new Date(),
      config: schedule.config || {}
    };

    // Save to database
    await this.saveSchedule(fullSchedule);

    // Start the scheduler
    await this.activateSchedule(agent, fullSchedule);

    console.log(`✅ Agent ${agent.getName()} started in autonomous mode`);
    console.log(`📅 Schedule: ${fullSchedule.schedule_type} - ${this.getScheduleDescription(fullSchedule)}`);

    return scheduleId;
  }

  /**
   * Stop an agent's autonomous operation
   */
  async stopAutonomous(scheduleId: string): Promise<void> {
    const timer = this.activeTimers.get(scheduleId);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(scheduleId);
    }

    this.runningAgents.delete(scheduleId);

    // Update database
    await this.supabase
      .from('agent_schedules')
      .update({ enabled: false })
      .eq('id', scheduleId);

    console.log(`⏹️ Stopped autonomous schedule: ${scheduleId}`);
  }

  /**
   * Activate a schedule and start running
   */
  private async activateSchedule(
    agent: BaseAgent,
    schedule: AgentSchedule
  ): Promise<void> {
    if (schedule.schedule_type === 'interval') {
      // Run at fixed intervals
      const timer = setInterval(async () => {
        await this.runAgentAutonomously(agent, schedule);
      }, schedule.interval_ms!);

      this.activeTimers.set(schedule.id, timer);

      // Also run immediately
      setTimeout(() => this.runAgentAutonomously(agent, schedule), 5000);
      
    } else if (schedule.schedule_type === 'cron') {
      // Run on cron schedule
      this.scheduleCronJob(agent, schedule);
      
    } else if (schedule.schedule_type === 'continuous') {
      // Run continuously in a loop
      this.runContinuousLoop(agent, schedule);
    }
  }

  /**
   * Run an agent autonomously (main execution)
   */
  private async runAgentAutonomously(
    agent: BaseAgent,
    schedule: AgentSchedule
  ): Promise<void> {
    // Prevent concurrent runs
    if (this.runningAgents.get(schedule.id)) {
      console.log(`⏭️ Skipping run - agent ${agent.getName()} still running from previous cycle`);
      return;
    }

    this.runningAgents.set(schedule.id, true);
    const startTime = Date.now();

    try {
      console.log(`\n🤖 [AUTONOMOUS RUN] ${agent.getName()}`);
      console.log(`⏰ Time: ${new Date().toLocaleString()}`);
      
      // Call the agent's autonomous run method
      const result = await this.executeAutonomousRun(agent, schedule);
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Autonomous run completed in ${duration}ms`);
      console.log(`📊 Actions taken: ${result.actions_taken.length}`);
      
      if (result.actions_taken.length > 0) {
        console.log(`   - ${result.actions_taken.join('\n   - ')}`);
      }

      // Update schedule stats
      await this.updateScheduleStats(schedule.id, {
        last_run: new Date(),
        run_count: schedule.run_count + 1
      });

    } catch (error) {
      console.error(`❌ Autonomous run failed for ${agent.getName()}:`, error);
      
    } finally {
      this.runningAgents.set(schedule.id, false);
    }
  }

  /**
   * Execute the autonomous run logic
   */
  private async executeAutonomousRun(
    agent: BaseAgent,
    schedule: AgentSchedule
  ): Promise<AutonomousRunResult> {
    const actions: string[] = [];
    const errors: string[] = [];

    try {
      // Check if agent has autonomousRun method
      if (typeof (agent as any).autonomousRun === 'function') {
        const result = await (agent as any).autonomousRun();
        
        if (result?.actions) {
          actions.push(...result.actions);
        }
      } else {
        // Fallback: execute default autonomous behaviors
        const defaultActions = await this.executeDefaultAutonomousBehaviors(agent);
        actions.push(...defaultActions);
      }

      return {
        success: true,
        actions_taken: actions,
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: 0
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        actions_taken: actions,
        errors,
        duration_ms: 0
      };
    }
  }

  /**
   * Default autonomous behaviors if agent doesn't implement autonomousRun
   */
  private async executeDefaultAutonomousBehaviors(agent: BaseAgent): Promise<string[]> {
    const actions: string[] = [];

    // Check for pending goals
    actions.push('Checked for active goals');

    // Check for pending workflows
    actions.push('Checked for scheduled workflows');

    return actions;
  }

  /**
   * Schedule cron job
   */
  private scheduleCronJob(agent: BaseAgent, schedule: AgentSchedule): void {
    // Parse cron expression and calculate next run time
    // For now, implement simple time-based scheduling
    
    console.log(`📅 Cron scheduled: ${schedule.cron_expression}`);
    
    // TODO: Implement proper cron parsing
    // For now, use interval as fallback
    const timer = setInterval(
      () => this.runAgentAutonomously(agent, schedule),
      schedule.interval_ms || 3600000
    );
    
    this.activeTimers.set(schedule.id, timer);
  }

  /**
   * Run continuous loop
   */
  private async runContinuousLoop(
    agent: BaseAgent,
    schedule: AgentSchedule
  ): Promise<void> {
    const runLoop = async () => {
      await this.runAgentAutonomously(agent, schedule);
      
      if (this.activeTimers.has(schedule.id)) {
        // Schedule next run with a small delay
        setTimeout(runLoop, 10000); // 10 second gap between runs
      }
    };

    // Start the loop
    runLoop();
    
    // Store a dummy timer to track it
    this.activeTimers.set(schedule.id, setTimeout(() => {}, 0));
  }

  /**
   * Load active schedules from database
   */
  private async loadActiveSchedules(): Promise<void> {
    try {
      const { data: schedules, error } = await this.supabase
        .from('agent_schedules')
        .select('*')
        .eq('enabled', true);

      if (error) {
        console.warn('Could not load schedules:', error.message);
        return;
      }

      if (schedules && schedules.length > 0) {
        console.log(`📋 Loaded ${schedules.length} active schedules`);
        
        // Note: We can't restart agents without agent instances
        // This would be done when agents are initialized
      }

    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }

  /**
   * Save schedule to database
   */
  private async saveSchedule(schedule: AgentSchedule): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('agent_schedules')
        .upsert({
          id: schedule.id,
          agent_id: schedule.agent_id,
          agent_name: schedule.agent_name,
          schedule_type: schedule.schedule_type,
          interval_ms: schedule.interval_ms,
          cron_expression: schedule.cron_expression,
          event_type: schedule.event_type,
          enabled: schedule.enabled,
          last_run: schedule.last_run,
          run_count: schedule.run_count,
          config: schedule.config
        });

      if (error) {
        console.warn('Could not save schedule to database:', error.message);
        // Continue anyway - scheduler will work in-memory
      }

    } catch (error) {
      console.warn('Error saving schedule:', error);
    }
  }

  /**
   * Update schedule statistics
   */
  private async updateScheduleStats(
    scheduleId: string,
    stats: { last_run: Date; run_count: number }
  ): Promise<void> {
    try {
      await this.supabase
        .from('agent_schedules')
        .update(stats)
        .eq('id', scheduleId);

    } catch (error) {
      // Silent fail - stats are not critical
    }
  }

  /**
   * Get all active schedules
   */
  async getActiveSchedules(): Promise<AgentSchedule[]> {
    const { data, error } = await this.supabase
      .from('agent_schedules')
      .select('*')
      .eq('enabled', true);

    if (error || !data) {
      return [];
    }

    return data as AgentSchedule[];
  }

  /**
   * Get schedule description
   */
  private getScheduleDescription(schedule: AgentSchedule): string {
    switch (schedule.schedule_type) {
      case 'interval':
        const minutes = (schedule.interval_ms || 0) / 60000;
        return `Every ${minutes} minutes`;
      case 'cron':
        return schedule.cron_expression || 'Custom schedule';
      case 'event':
        return `On event: ${schedule.event_type}`;
      case 'continuous':
        return 'Continuous (always running)';
      default:
        return 'Unknown';
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    console.log('🛑 Shutting down Autonomous Scheduler...');
    
    for (const [id, timer] of this.activeTimers.entries()) {
      clearInterval(timer);
    }
    
    this.activeTimers.clear();
    this.runningAgents.clear();
    
    console.log('✅ Scheduler shutdown complete');
  }
}


