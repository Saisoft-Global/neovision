/**
 * Goal Persistence Manager
 * Enables agents to track and pursue long-term goals
 * Goals persist across sessions and agents work toward them proactively
 */

import { getSupabaseClient } from '../../../config/supabase';

export interface AgentGoal {
  id: string;
  agent_id: string;
  agent_name: string;
  user_id?: string;
  description: string;
  goal_type: 'task' | 'project' | 'learning' | 'optimization' | 'monitoring';
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;  // 0-100%
  milestones: Milestone[];
  created_at: Date;
  deadline?: Date;
  completed_at?: Date;
  metadata?: Record<string, any>;
}

export interface Milestone {
  id: string;
  description: string;
  completed: boolean;
  completed_at?: Date;
  required: boolean;
}

export interface GoalProgress {
  goal_id: string;
  timestamp: Date;
  progress: number;
  actions_taken: string[];
  notes?: string;
}

export class GoalManager {
  private static instance: GoalManager;
  private supabase;
  private activeGoals: Map<string, AgentGoal> = new Map();

  private constructor() {
    this.supabase = getSupabaseClient();
    this.initializeGoalManager();
  }

  public static getInstance(): GoalManager {
    if (!this.instance) {
      this.instance = new GoalManager();
    }
    return this.instance;
  }

  private async initializeGoalManager(): Promise<void> {
    console.log('🎯 Goal Manager initialized');
    await this.loadActiveGoals();
  }

  /**
   * Create a new goal for an agent
   */
  async createGoal(goal: Omit<AgentGoal, 'id' | 'created_at' | 'progress'>): Promise<AgentGoal> {
    const newGoal: AgentGoal = {
      id: crypto.randomUUID(),
      ...goal,
      progress: 0,
      created_at: new Date()
    };

    // Save to database
    await this.saveGoal(newGoal);

    // Add to active goals cache
    this.activeGoals.set(newGoal.id, newGoal);

    console.log(`✅ Created goal for ${newGoal.agent_name}: ${newGoal.description}`);

    return newGoal;
  }

  /**
   * Get all active goals for an agent
   */
  async getActiveGoals(agentId: string): Promise<AgentGoal[]> {
    const { data, error } = await this.supabase
      .from('agent_goals')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .order('priority', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(this.mapDatabaseGoal);
  }

  /**
   * Get goal by ID
   */
  async getGoal(goalId: string): Promise<AgentGoal | null> {
    // Check cache first
    if (this.activeGoals.has(goalId)) {
      return this.activeGoals.get(goalId)!;
    }

    // Load from database
    const { data, error } = await this.supabase
      .from('agent_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (error || !data) {
      return null;
    }

    const goal = this.mapDatabaseGoal(data);
    this.activeGoals.set(goal.id, goal);
    
    return goal;
  }

  /**
   * Update goal progress
   */
  async updateProgress(
    goalId: string,
    progress: number,
    actionsTaken: string[] = [],
    notes?: string
  ): Promise<void> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      console.warn(`Goal not found: ${goalId}`);
      return;
    }

    // Update progress
    goal.progress = Math.min(100, Math.max(0, progress));

    // Check if goal is complete
    if (goal.progress >= 100) {
      goal.status = 'completed';
      goal.completed_at = new Date();
    }

    // Save to database
    await this.supabase
      .from('agent_goals')
      .update({
        progress: goal.progress,
        status: goal.status,
        completed_at: goal.completed_at
      })
      .eq('id', goalId);

    // Record progress entry
    await this.recordProgress({
      goal_id: goalId,
      timestamp: new Date(),
      progress: goal.progress,
      actions_taken: actionsTaken,
      notes
    });

    // Update cache
    this.activeGoals.set(goalId, goal);

    console.log(`📈 Goal progress updated: ${goal.description} (${goal.progress}%)`);
    
    if (goal.status === 'completed') {
      console.log(`🎉 Goal completed: ${goal.description}`);
    }
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(goalId: string, milestoneId: string): Promise<void> {
    const goal = await this.getGoal(goalId);
    if (!goal) return;

    const milestone = goal.milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    milestone.completed = true;
    milestone.completed_at = new Date();

    // Calculate new progress based on completed milestones
    const completedMilestones = goal.milestones.filter(m => m.completed).length;
    const totalMilestones = goal.milestones.length;
    const newProgress = Math.floor((completedMilestones / totalMilestones) * 100);

    await this.updateProgress(
      goalId,
      newProgress,
      [`Completed milestone: ${milestone.description}`]
    );

    console.log(`✅ Milestone completed: ${milestone.description}`);
  }

  /**
   * Get goals approaching deadline
   */
  async getGoalsNearingDeadline(agentId: string, daysThreshold: number = 7): Promise<AgentGoal[]> {
    const now = new Date();
    const threshold = new Date(now.getTime() + (daysThreshold * 24 * 60 * 60 * 1000));

    const activeGoals = await this.getActiveGoals(agentId);
    
    return activeGoals.filter(goal => 
      goal.deadline && 
      new Date(goal.deadline) <= threshold &&
      new Date(goal.deadline) >= now
    );
  }

  /**
   * Get goals by priority
   */
  async getGoalsByPriority(
    agentId: string,
    priority: AgentGoal['priority']
  ): Promise<AgentGoal[]> {
    const { data, error } = await this.supabase
      .from('agent_goals')
      .select('*')
      .eq('agent_id', agentId)
      .eq('priority', priority)
      .eq('status', 'active');

    if (error || !data) {
      return [];
    }

    return data.map(this.mapDatabaseGoal);
  }

  /**
   * Pause a goal
   */
  async pauseGoal(goalId: string, reason?: string): Promise<void> {
    await this.supabase
      .from('agent_goals')
      .update({
        status: 'paused',
        metadata: { pause_reason: reason }
      })
      .eq('id', goalId);

    const goal = this.activeGoals.get(goalId);
    if (goal) {
      goal.status = 'paused';
      this.activeGoals.set(goalId, goal);
    }

    console.log(`⏸️ Goal paused: ${goalId}`);
  }

  /**
   * Resume a paused goal
   */
  async resumeGoal(goalId: string): Promise<void> {
    await this.supabase
      .from('agent_goals')
      .update({ status: 'active' })
      .eq('id', goalId);

    const goal = this.activeGoals.get(goalId);
    if (goal) {
      goal.status = 'active';
      this.activeGoals.set(goalId, goal);
    }

    console.log(`▶️ Goal resumed: ${goalId}`);
  }

  /**
   * Abandon a goal
   */
  async abandonGoal(goalId: string, reason?: string): Promise<void> {
    await this.supabase
      .from('agent_goals')
      .update({
        status: 'abandoned',
        metadata: { abandon_reason: reason }
      })
      .eq('id', goalId);

    this.activeGoals.delete(goalId);

    console.log(`🚫 Goal abandoned: ${goalId}`);
  }

  /**
   * Get goal progress history
   */
  async getProgressHistory(goalId: string): Promise<GoalProgress[]> {
    const { data, error } = await this.supabase
      .from('goal_progress')
      .select('*')
      .eq('goal_id', goalId)
      .order('timestamp', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(p => ({
      goal_id: p.goal_id,
      timestamp: new Date(p.timestamp),
      progress: p.progress,
      actions_taken: p.actions_taken || [],
      notes: p.notes
    }));
  }

  /**
   * Get all goals for user across all agents
   */
  async getUserGoals(userId: string): Promise<AgentGoal[]> {
    const { data, error } = await this.supabase
      .from('agent_goals')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'paused'])
      .order('priority', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(this.mapDatabaseGoal);
  }

  /**
   * Private: Save goal to database
   */
  private async saveGoal(goal: AgentGoal): Promise<void> {
    try {
      await this.supabase
        .from('agent_goals')
        .upsert({
          id: goal.id,
          agent_id: goal.agent_id,
          agent_name: goal.agent_name,
          user_id: goal.user_id,
          description: goal.description,
          goal_type: goal.goal_type,
          status: goal.status,
          priority: goal.priority,
          progress: goal.progress,
          milestones: goal.milestones,
          created_at: goal.created_at,
          deadline: goal.deadline,
          completed_at: goal.completed_at,
          metadata: goal.metadata
        });

    } catch (error) {
      console.error('Error saving goal:', error);
    }
  }

  /**
   * Private: Record progress entry
   */
  private async recordProgress(progress: GoalProgress): Promise<void> {
    try {
      await this.supabase
        .from('goal_progress')
        .insert({
          goal_id: progress.goal_id,
          timestamp: progress.timestamp,
          progress: progress.progress,
          actions_taken: progress.actions_taken,
          notes: progress.notes
        });

    } catch (error) {
      console.error('Error recording progress:', error);
    }
  }

  /**
   * Private: Load active goals into cache
   */
  private async loadActiveGoals(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('agent_goals')
        .select('*')
        .eq('status', 'active')
        .limit(1000);

      if (error || !data) return;

      data.forEach(g => {
        const goal = this.mapDatabaseGoal(g);
        this.activeGoals.set(goal.id, goal);
      });

      console.log(`📋 Loaded ${this.activeGoals.size} active goals`);

    } catch (error) {
      console.error('Error loading active goals:', error);
    }
  }

  /**
   * Private: Map database record to AgentGoal
   */
  private mapDatabaseGoal(data: any): AgentGoal {
    return {
      id: data.id,
      agent_id: data.agent_id,
      agent_name: data.agent_name,
      user_id: data.user_id,
      description: data.description,
      goal_type: data.goal_type,
      status: data.status,
      priority: data.priority,
      progress: data.progress,
      milestones: data.milestones || [],
      created_at: new Date(data.created_at),
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      metadata: data.metadata
    };
  }

  /**
   * Get summary statistics
   */
  async getStatistics(agentId: string): Promise<{
    total: number;
    active: number;
    completed: number;
    avgProgress: number;
  }> {
    const { data, error } = await this.supabase
      .from('agent_goals')
      .select('status, progress')
      .eq('agent_id', agentId);

    if (error || !data) {
      return { total: 0, active: 0, completed: 0, avgProgress: 0 };
    }

    const total = data.length;
    const active = data.filter(g => g.status === 'active').length;
    const completed = data.filter(g => g.status === 'completed').length;
    const avgProgress = total > 0 
      ? data.reduce((sum, g) => sum + g.progress, 0) / total 
      : 0;

    return { total, active, completed, avgProgress };
  }
}


