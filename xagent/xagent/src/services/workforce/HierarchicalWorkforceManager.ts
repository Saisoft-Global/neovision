/**
 * Hierarchical AI Workforce Manager
 * Manages AI agents at different organizational levels with intelligent escalation
 */

export enum WorkforceLevel {
  WORKER = 'worker',           // Task execution, routine operations
  MANAGER = 'manager',         // Team coordination, decision making
  DIRECTOR = 'director',       // High-level coordination, complex workflows
  HUMAN = 'human'              // Strategic decisions, creative problem solving
}

export enum EscalationReason {
  CONFIDENCE_THRESHOLD = 'confidence_threshold',     // AI confidence too low
  COMPLEXITY_EXCEEDED = 'complexity_exceeded',       // Task too complex for AI
  POLICY_VIOLATION = 'policy_violation',             // Potential policy breach
  RESOURCE_LIMIT = 'resource_limit',                 // Resource constraints
  HUMAN_PREFERENCE = 'human_preference',             // User requested human
  ERROR_RECOVERY = 'error_recovery',                 // Error needs human intervention
  STRATEGIC_DECISION = 'strategic_decision',         // Strategic decision required
  CREATIVE_SOLUTION = 'creative_solution'            // Creative problem solving needed
}

export interface WorkforceAgent {
  id: string;
  name: string;
  level: WorkforceLevel;
  department: string;
  capabilities: string[];
  confidenceThreshold: number;  // When to escalate (0-1)
  maxComplexity: number;        // Maximum task complexity (1-10)
  escalationRules: EscalationRule[];
  humanSupervisor?: string;     // Human supervisor ID
  aiSupervisor?: string;        // AI supervisor ID
}

export interface EscalationRule {
  condition: string;            // Condition to trigger escalation
  reason: EscalationReason;
  targetLevel: WorkforceLevel;  // Where to escalate
  targetAgent?: string;         // Specific agent to escalate to
  humanRequired: boolean;       // Whether human intervention is required
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoApprove: boolean;         // Can be auto-approved by AI supervisor
}

export interface TaskContext {
  id: string;
  type: string;
  complexity: number;           // 1-10 scale
  confidence: number;           // 0-1 scale
  department: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  budget?: number;
  riskLevel: 'low' | 'medium' | 'high';
  deadline?: Date;
  stakeholders: string[];
  metadata: Record<string, any>;
}

export interface EscalationDecision {
  shouldEscalate: boolean;
  reason: EscalationReason;
  targetLevel: WorkforceLevel;
  targetAgent?: string;
  humanRequired: boolean;
  confidence: number;
  reasoning: string;
  estimatedResolutionTime?: number; // minutes
}

export class HierarchicalWorkforceManager {
  private static instance: HierarchicalWorkforceManager;
  private agents: Map<string, WorkforceAgent> = new Map();
  private escalationHistory: Array<{
    taskId: string;
    fromAgent: string;
    toLevel: WorkforceLevel;
    reason: EscalationReason;
    timestamp: Date;
    resolved: boolean;
  }> = [];

  static getInstance(): HierarchicalWorkforceManager {
    if (!this.instance) {
      this.instance = new HierarchicalWorkforceManager();
    }
    return this.instance;
  }

  /**
   * Register an AI agent in the workforce hierarchy
   */
  registerAgent(agent: WorkforceAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`👤 Registered ${agent.level} agent: ${agent.name} in ${agent.department}`);
  }

  /**
   * Determine if a task should be escalated and to whom
   */
  async shouldEscalate(
    taskContext: TaskContext,
    currentAgentId: string
  ): Promise<EscalationDecision> {
    const currentAgent = this.agents.get(currentAgentId);
    if (!currentAgent) {
      throw new Error(`Agent ${currentAgentId} not found`);
    }

    // Check escalation rules
    for (const rule of currentAgent.escalationRules) {
      if (await this.evaluateEscalationCondition(rule.condition, taskContext, currentAgent)) {
        return {
          shouldEscalate: true,
          reason: rule.reason,
          targetLevel: rule.targetLevel,
          targetAgent: rule.targetAgent,
          humanRequired: rule.humanRequired,
          confidence: 0.9,
          reasoning: `Escalation triggered by rule: ${rule.condition}`,
          estimatedResolutionTime: this.estimateResolutionTime(rule.targetLevel, taskContext)
        };
      }
    }

    // Check confidence threshold
    if (taskContext.confidence < currentAgent.confidenceThreshold) {
      return {
        shouldEscalate: true,
        reason: EscalationReason.CONFIDENCE_THRESHOLD,
        targetLevel: this.getNextLevel(currentAgent.level),
        humanRequired: this.isHumanLevelRequired(currentAgent.level, taskContext),
        confidence: 0.8,
        reasoning: `Confidence ${taskContext.confidence} below threshold ${currentAgent.confidenceThreshold}`,
        estimatedResolutionTime: this.estimateResolutionTime(this.getNextLevel(currentAgent.level), taskContext)
      };
    }

    // Check complexity threshold
    if (taskContext.complexity > currentAgent.maxComplexity) {
      return {
        shouldEscalate: true,
        reason: EscalationReason.COMPLEXITY_EXCEEDED,
        targetLevel: this.getNextLevel(currentAgent.level),
        humanRequired: this.isHumanLevelRequired(currentAgent.level, taskContext),
        confidence: 0.85,
        reasoning: `Complexity ${taskContext.complexity} exceeds agent limit ${currentAgent.maxComplexity}`,
        estimatedResolutionTime: this.estimateResolutionTime(this.getNextLevel(currentAgent.level), taskContext)
      };
    }

    // Check if human approval required
    if (taskContext.requiresApproval && this.requiresHumanApproval(taskContext)) {
      return {
        shouldEscalate: true,
        reason: EscalationReason.STRATEGIC_DECISION,
        targetLevel: WorkforceLevel.HUMAN,
        humanRequired: true,
        confidence: 0.95,
        reasoning: `Task requires human approval due to: ${this.getApprovalReason(taskContext)}`,
        estimatedResolutionTime: this.estimateResolutionTime(WorkforceLevel.HUMAN, taskContext)
      };
    }

    return {
      shouldEscalate: false,
      reason: EscalationReason.CONFIDENCE_THRESHOLD, // Default, won't be used
      targetLevel: currentAgent.level,
      humanRequired: false,
      confidence: 0.9,
      reasoning: 'Task can be handled by current agent level'
    };
  }

  /**
   * Execute escalation process
   */
  async executeEscalation(
    taskContext: TaskContext,
    escalationDecision: EscalationDecision,
    currentAgentId: string
  ): Promise<{
    escalated: boolean;
    targetAgentId?: string;
    humanNotification?: {
      userId: string;
      message: string;
      priority: string;
      estimatedTime: number;
    };
  }> {
    if (!escalationDecision.shouldEscalate) {
      return { escalated: false };
    }

    // Record escalation
    this.escalationHistory.push({
      taskId: taskContext.id,
      fromAgent: currentAgentId,
      toLevel: escalationDecision.targetLevel,
      reason: escalationDecision.reason,
      timestamp: new Date(),
      resolved: false
    });

    // Find target agent
    const targetAgent = await this.findTargetAgent(
      escalationDecision.targetLevel,
      taskContext.department,
      escalationDecision.targetAgent
    );

    if (escalationDecision.humanRequired) {
      // Notify human supervisor
      const humanNotification = await this.notifyHumanSupervisor(
        taskContext,
        escalationDecision,
        targetAgent
      );

      return {
        escalated: true,
        humanNotification
      };
    } else if (targetAgent) {
      // Transfer to AI agent
      await this.transferToAIAgent(taskContext, targetAgent, escalationDecision);
      
      return {
        escalated: true,
        targetAgentId: targetAgent.id
      };
    }

    return { escalated: false };
  }

  /**
   * Get the next level in the hierarchy
   */
  private getNextLevel(currentLevel: WorkforceLevel): WorkforceLevel {
    switch (currentLevel) {
      case WorkforceLevel.WORKER:
        return WorkforceLevel.MANAGER;
      case WorkforceLevel.MANAGER:
        return WorkforceLevel.DIRECTOR;
      case WorkforceLevel.DIRECTOR:
        return WorkforceLevel.HUMAN;
      case WorkforceLevel.HUMAN:
        return WorkforceLevel.HUMAN; // Already at top
      default:
        return WorkforceLevel.HUMAN;
    }
  }

  /**
   * Check if human level is required based on context
   */
  private isHumanLevelRequired(currentLevel: WorkforceLevel, taskContext: TaskContext): boolean {
    // Always require human for critical tasks
    if (taskContext.priority === 'critical') return true;
    
    // Require human for high-risk tasks
    if (taskContext.riskLevel === 'high') return true;
    
    // Require human for high-budget decisions
    if (taskContext.budget && taskContext.budget > 10000) return true;
    
    // Require human for strategic decisions
    if (taskContext.type.includes('strategic') || taskContext.type.includes('policy')) return true;
    
    // If already at director level, escalate to human
    if (currentLevel === WorkforceLevel.DIRECTOR) return true;
    
    return false;
  }

  /**
   * Check if task requires human approval
   */
  private requiresHumanApproval(taskContext: TaskContext): boolean {
    return (
      taskContext.requiresApproval ||
      taskContext.priority === 'critical' ||
      taskContext.riskLevel === 'high' ||
      (taskContext.budget && taskContext.budget > 5000) ||
      taskContext.type.includes('approval') ||
      taskContext.type.includes('decision')
    );
  }

  /**
   * Get reason for requiring approval
   */
  private getApprovalReason(taskContext: TaskContext): string {
    if (taskContext.priority === 'critical') return 'critical priority';
    if (taskContext.riskLevel === 'high') return 'high risk level';
    if (taskContext.budget && taskContext.budget > 5000) return 'high budget amount';
    if (taskContext.type.includes('approval')) return 'approval type task';
    return 'task marked as requiring approval';
  }

  /**
   * Evaluate escalation condition
   */
  private async evaluateEscalationCondition(
    condition: string,
    taskContext: TaskContext,
    agent: WorkforceAgent
  ): Promise<boolean> {
    // Simple condition evaluation - can be enhanced with more complex logic
    try {
      // Replace variables in condition
      let evaluatedCondition = condition
        .replace(/\{task\.complexity\}/g, taskContext.complexity.toString())
        .replace(/\{task\.confidence\}/g, taskContext.confidence.toString())
        .replace(/\{task\.priority\}/g, `'${taskContext.priority}'`)
        .replace(/\{task\.riskLevel\}/g, `'${taskContext.riskLevel}'`)
        .replace(/\{agent\.maxComplexity\}/g, agent.maxComplexity.toString())
        .replace(/\{agent\.confidenceThreshold\}/g, agent.confidenceThreshold.toString());

      // Evaluate the condition
      return eval(evaluatedCondition);
    } catch (error) {
      console.error('Error evaluating escalation condition:', error);
      return false;
    }
  }

  /**
   * Find target agent for escalation
   */
  private async findTargetAgent(
    targetLevel: WorkforceLevel,
    department: string,
    specificAgentId?: string
  ): Promise<WorkforceAgent | null> {
    if (specificAgentId) {
      return this.agents.get(specificAgentId) || null;
    }

    // Find best agent at target level in same department
    for (const agent of this.agents.values()) {
      if (agent.level === targetLevel && agent.department === department) {
        return agent;
      }
    }

    // If no agent in same department, find any agent at target level
    for (const agent of this.agents.values()) {
      if (agent.level === targetLevel) {
        return agent;
      }
    }

    return null;
  }

  /**
   * Notify human supervisor
   */
  private async notifyHumanSupervisor(
    taskContext: TaskContext,
    escalationDecision: EscalationDecision,
    targetAgent?: WorkforceAgent | null
  ): Promise<{
    userId: string;
    message: string;
    priority: string;
    estimatedTime: number;
  }> {
    // This would integrate with your notification system
    const message = `🚨 ESCALATION REQUIRED

Task: ${taskContext.type}
Priority: ${taskContext.priority}
Reason: ${escalationReasonToString(escalationDecision.reason)}
Complexity: ${taskContext.complexity}/10
Confidence: ${Math.round(taskContext.confidence * 100)}%

${escalationDecision.reasoning}

Estimated Resolution Time: ${escalationDecision.estimatedResolutionTime} minutes

Please review and take action.`;

    return {
      userId: targetAgent?.humanSupervisor || 'default-supervisor',
      message,
      priority: taskContext.priority,
      estimatedTime: escalationDecision.estimatedResolutionTime || 30
    };
  }

  /**
   * Transfer task to AI agent
   */
  private async transferToAIAgent(
    taskContext: TaskContext,
    targetAgent: WorkforceAgent,
    escalationDecision: EscalationDecision
  ): Promise<void> {
    console.log(`🔄 Transferring task ${taskContext.id} from ${escalationDecision.targetLevel} to ${targetAgent.name}`);
    
    // This would integrate with your task management system
    // For now, just log the transfer
    console.log(`Task transferred to ${targetAgent.name} (${targetAgent.level})`);
  }

  /**
   * Estimate resolution time based on level and context
   */
  private estimateResolutionTime(level: WorkforceLevel, taskContext: TaskContext): number {
    const baseTime = {
      [WorkforceLevel.WORKER]: 5,
      [WorkforceLevel.MANAGER]: 15,
      [WorkforceLevel.DIRECTOR]: 30,
      [WorkforceLevel.HUMAN]: 60
    };

    const complexityMultiplier = 1 + (taskContext.complexity - 1) * 0.2;
    const priorityMultiplier = {
      'low': 1.5,
      'medium': 1.0,
      'high': 0.7,
      'critical': 0.5
    };

    return Math.round(
      baseTime[level] * 
      complexityMultiplier * 
      priorityMultiplier[taskContext.priority]
    );
  }

  /**
   * Get escalation statistics
   */
  getEscalationStats(): {
    totalEscalations: number;
    escalationsByReason: Record<string, number>;
    escalationsByLevel: Record<string, number>;
    averageResolutionTime: number;
    unresolvedEscalations: number;
  } {
    const stats = {
      totalEscalations: this.escalationHistory.length,
      escalationsByReason: {} as Record<string, number>,
      escalationsByLevel: {} as Record<string, number>,
      averageResolutionTime: 0,
      unresolvedEscalations: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    this.escalationHistory.forEach(escalation => {
      // Count by reason
      stats.escalationsByReason[escalation.reason] = 
        (stats.escalationsByReason[escalation.reason] || 0) + 1;
      
      // Count by level
      stats.escalationsByLevel[escalation.toLevel] = 
        (stats.escalationsByLevel[escalation.toLevel] || 0) + 1;
      
      // Count unresolved
      if (!escalation.resolved) {
        stats.unresolvedEscalations++;
      } else {
        resolvedCount++;
        // Estimate resolution time (in real implementation, this would be actual time)
        totalResolutionTime += 30; // Default 30 minutes
      }
    });

    stats.averageResolutionTime = resolvedCount > 0 ? 
      Math.round(totalResolutionTime / resolvedCount) : 0;

    return stats;
  }
}

// Helper function
function escalationReasonToString(reason: EscalationReason): string {
  const reasonMap = {
    [EscalationReason.CONFIDENCE_THRESHOLD]: 'Low confidence',
    [EscalationReason.COMPLEXITY_EXCEEDED]: 'Complexity exceeded',
    [EscalationReason.POLICY_VIOLATION]: 'Policy violation',
    [EscalationReason.RESOURCE_LIMIT]: 'Resource limit',
    [EscalationReason.HUMAN_PREFERENCE]: 'Human preference',
    [EscalationReason.ERROR_RECOVERY]: 'Error recovery',
    [EscalationReason.STRATEGIC_DECISION]: 'Strategic decision',
    [EscalationReason.CREATIVE_SOLUTION]: 'Creative solution needed'
  };
  return reasonMap[reason] || 'Unknown reason';
}

// Export singleton instance
export const hierarchicalWorkforceManager = HierarchicalWorkforceManager.getInstance();


