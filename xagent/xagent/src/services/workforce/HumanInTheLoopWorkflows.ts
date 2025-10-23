/**
 * Human-in-the-Loop Workflow Patterns
 * Defines how humans interact with AI agents in the hierarchical workforce
 */

export enum HumanInteractionType {
  APPROVAL = 'approval',           // Human approval required
  REVIEW = 'review',               // Human review and feedback
  ESCALATION = 'escalation',       // Escalation to human
  COLLABORATION = 'collaboration', // Human-AI collaboration
  OVERSIGHT = 'oversight',         // Human oversight and monitoring
  TRAINING = 'training',           // Human training AI
  INTERVENTION = 'intervention'    // Human intervention in errors
}

export interface HumanInteraction {
  id: string;
  type: HumanInteractionType;
  taskId: string;
  agentId: string;
  humanId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  context: {
    taskDescription: string;
    agentReasoning: string;
    confidence: number;
    complexity: number;
    riskLevel: 'low' | 'medium' | 'high';
    estimatedTime: number; // minutes
    deadline?: Date;
  };
  humanResponse?: {
    decision: 'approve' | 'reject' | 'modify' | 'escalate';
    feedback: string;
    modifications?: any;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowPattern {
  id: string;
  name: string;
  description: string;
  triggerConditions: string[];
  humanInteractionType: HumanInteractionType;
  escalationPath: string[];
  autoApprovalRules?: string[];
  timeoutMinutes: number;
  retryAttempts: number;
}

export class HumanInTheLoopWorkflows {
  private static instance: HumanInTheLoopWorkflows;
  private interactions: Map<string, HumanInteraction> = new Map();
  private workflowPatterns: Map<string, WorkflowPattern> = new Map();

  static getInstance(): HumanInTheLoopWorkflows {
    if (!this.instance) {
      this.instance = new HumanInTheLoopWorkflows();
    }
    return this.instance;
  }

  /**
   * Initialize standard workflow patterns
   */
  initializeWorkflowPatterns(): void {
    const patterns: WorkflowPattern[] = [
      {
        id: 'budget-approval',
        name: 'Budget Approval Workflow',
        description: 'Human approval required for budget decisions above threshold',
        triggerConditions: [
          'task.budget > 5000',
          'task.type === "budget_decision"',
          'task.riskLevel === "high"'
        ],
        humanInteractionType: HumanInteractionType.APPROVAL,
        escalationPath: ['manager', 'director', 'ceo'],
        autoApprovalRules: [
          'task.budget < 1000 && task.riskLevel === "low"'
        ],
        timeoutMinutes: 60,
        retryAttempts: 2
      },
      {
        id: 'policy-violation',
        name: 'Policy Violation Review',
        description: 'Human review required for potential policy violations',
        triggerConditions: [
          'task.riskLevel === "high"',
          'task.type.includes("policy")',
          'agent.confidence < 0.8'
        ],
        humanInteractionType: HumanInteractionType.REVIEW,
        escalationPath: ['hr-manager', 'hr-director', 'legal'],
        timeoutMinutes: 30,
        retryAttempts: 1
      },
      {
        id: 'strategic-decision',
        name: 'Strategic Decision Making',
        description: 'Human decision required for strategic initiatives',
        triggerConditions: [
          'task.type.includes("strategic")',
          'task.complexity > 7',
          'task.priority === "critical"'
        ],
        humanInteractionType: HumanInteractionType.ESCALATION,
        escalationPath: ['director', 'ceo', 'board'],
        timeoutMinutes: 120,
        retryAttempts: 1
      },
      {
        id: 'creative-solution',
        name: 'Creative Problem Solving',
        description: 'Human-AI collaboration for creative solutions',
        triggerConditions: [
          'task.type.includes("creative")',
          'task.type.includes("innovation")',
          'agent.confidence < 0.6'
        ],
        humanInteractionType: HumanInteractionType.COLLABORATION,
        escalationPath: ['specialist', 'manager', 'director'],
        timeoutMinutes: 90,
        retryAttempts: 2
      },
      {
        id: 'error-intervention',
        name: 'Error Recovery Intervention',
        description: 'Human intervention for error recovery',
        triggerConditions: [
          'task.status === "error"',
          'retryAttempts > 2',
          'agent.confidence < 0.5'
        ],
        humanInteractionType: HumanInteractionType.INTERVENTION,
        escalationPath: ['specialist', 'manager'],
        timeoutMinutes: 45,
        retryAttempts: 1
      },
      {
        id: 'quality-oversight',
        name: 'Quality Assurance Oversight',
        description: 'Human oversight for quality assurance',
        triggerConditions: [
          'task.type.includes("quality")',
          'task.priority === "high"',
          'random() < 0.1' // 10% random sampling
        ],
        humanInteractionType: HumanInteractionType.OVERSIGHT,
        escalationPath: ['qa-specialist', 'qa-manager'],
        timeoutMinutes: 30,
        retryAttempts: 1
      }
    ];

    patterns.forEach(pattern => {
      this.workflowPatterns.set(pattern.id, pattern);
    });

    console.log(`🔄 Initialized ${patterns.length} human-in-the-loop workflow patterns`);
  }

  /**
   * Create human interaction request
   */
  async createHumanInteraction(
    taskContext: any,
    agentId: string,
    humanId: string,
    interactionType: HumanInteractionType,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<HumanInteraction> {
    const interaction: HumanInteraction = {
      id: `human-interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: interactionType,
      taskId: taskContext.id,
      agentId,
      humanId,
      priority,
      status: 'pending',
      context: {
        taskDescription: taskContext.description || taskContext.type,
        agentReasoning: taskContext.reasoning || 'No reasoning provided',
        confidence: taskContext.confidence || 0.5,
        complexity: taskContext.complexity || 5,
        riskLevel: taskContext.riskLevel || 'medium',
        estimatedTime: this.estimateInteractionTime(interactionType, taskContext),
        deadline: this.calculateDeadline(priority, interactionType)
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.interactions.set(interaction.id, interaction);

    // Send notification to human
    await this.notifyHuman(interaction);

    console.log(`👤 Created human interaction: ${interactionType} for task ${taskContext.id}`);
    return interaction;
  }

  /**
   * Process human response
   */
  async processHumanResponse(
    interactionId: string,
    humanResponse: {
      decision: 'approve' | 'reject' | 'modify' | 'escalate';
      feedback: string;
      modifications?: any;
    }
  ): Promise<{
    success: boolean;
    nextAction: string;
    shouldEscalate: boolean;
  }> {
    const interaction = this.interactions.get(interactionId);
    if (!interaction) {
      throw new Error(`Interaction ${interactionId} not found`);
    }

    interaction.humanResponse = {
      ...humanResponse,
      timestamp: new Date()
    };
    interaction.status = 'completed';
    interaction.updatedAt = new Date();

    // Determine next action based on human response
    let nextAction = '';
    let shouldEscalate = false;

    switch (humanResponse.decision) {
      case 'approve':
        nextAction = 'Execute task as planned';
        break;
      case 'reject':
        nextAction = 'Cancel task and notify stakeholders';
        break;
      case 'modify':
        nextAction = 'Apply modifications and re-execute';
        shouldEscalate = false;
        break;
      case 'escalate':
        nextAction = 'Escalate to next level in hierarchy';
        shouldEscalate = true;
        break;
    }

    console.log(`👤 Human response processed: ${humanResponse.decision} for interaction ${interactionId}`);
    
    return {
      success: true,
      nextAction,
      shouldEscalate
    };
  }

  /**
   * Get pending interactions for a human
   */
  getPendingInteractions(humanId: string): HumanInteraction[] {
    return Array.from(this.interactions.values())
      .filter(interaction => 
        interaction.humanId === humanId && 
        interaction.status === 'pending'
      )
      .sort((a, b) => {
        // Sort by priority and deadline
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by deadline
        if (a.context.deadline && b.context.deadline) {
          return a.context.deadline.getTime() - b.context.deadline.getTime();
        }
        
        return 0;
      });
  }

  /**
   * Check for timeout interactions
   */
  checkTimeoutInteractions(): HumanInteraction[] {
    const now = new Date();
    const timeoutInteractions: HumanInteraction[] = [];

    this.interactions.forEach(interaction => {
      if (interaction.status === 'pending') {
        const timeoutMinutes = this.getTimeoutMinutes(interaction.type);
        const timeoutTime = new Date(interaction.createdAt.getTime() + timeoutMinutes * 60000);
        
        if (now > timeoutTime) {
          timeoutInteractions.push(interaction);
        }
      }
    });

    return timeoutInteractions;
  }

  /**
   * Handle timeout interactions
   */
  async handleTimeoutInteractions(): Promise<void> {
    const timeoutInteractions = this.checkTimeoutInteractions();
    
    for (const interaction of timeoutInteractions) {
      console.log(`⏰ Handling timeout for interaction ${interaction.id}`);
      
      // Auto-escalate or apply default action based on pattern
      const pattern = this.workflowPatterns.get(this.getPatternForInteraction(interaction));
      if (pattern && pattern.retryAttempts > 0) {
        // Retry with escalation
        await this.escalateInteraction(interaction, 'timeout');
      } else {
        // Apply default action (usually reject or escalate)
        interaction.status = 'completed';
        interaction.humanResponse = {
          decision: 'escalate',
          feedback: 'Auto-escalated due to timeout',
          timestamp: new Date()
        };
      }
    }
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats(): {
    totalInteractions: number;
    pendingInteractions: number;
    completedInteractions: number;
    averageResponseTime: number;
    interactionsByType: Record<string, number>;
    interactionsByPriority: Record<string, number>;
  } {
    const interactions = Array.from(this.interactions.values());
    
    const stats = {
      totalInteractions: interactions.length,
      pendingInteractions: interactions.filter(i => i.status === 'pending').length,
      completedInteractions: interactions.filter(i => i.status === 'completed').length,
      averageResponseTime: 0,
      interactionsByType: {} as Record<string, number>,
      interactionsByPriority: {} as Record<string, number>
    };

    let totalResponseTime = 0;
    let completedCount = 0;

    interactions.forEach(interaction => {
      // Count by type
      stats.interactionsByType[interaction.type] = 
        (stats.interactionsByType[interaction.type] || 0) + 1;
      
      // Count by priority
      stats.interactionsByPriority[interaction.priority] = 
        (stats.interactionsByPriority[interaction.priority] || 0) + 1;
      
      // Calculate response time for completed interactions
      if (interaction.status === 'completed' && interaction.humanResponse) {
        const responseTime = interaction.humanResponse.timestamp.getTime() - 
                           interaction.createdAt.getTime();
        totalResponseTime += responseTime;
        completedCount++;
      }
    });

    stats.averageResponseTime = completedCount > 0 ? 
      Math.round(totalResponseTime / completedCount / 60000) : 0; // in minutes

    return stats;
  }

  /**
   * Estimate interaction time based on type and context
   */
  private estimateInteractionTime(
    interactionType: HumanInteractionType,
    taskContext: any
  ): number {
    const baseTimes = {
      [HumanInteractionType.APPROVAL]: 5,
      [HumanInteractionType.REVIEW]: 15,
      [HumanInteractionType.ESCALATION]: 30,
      [HumanInteractionType.COLLABORATION]: 45,
      [HumanInteractionType.OVERSIGHT]: 10,
      [HumanInteractionType.TRAINING]: 60,
      [HumanInteractionType.INTERVENTION]: 20
    };

    const complexityMultiplier = 1 + (taskContext.complexity - 1) * 0.1;
    return Math.round(baseTimes[interactionType] * complexityMultiplier);
  }

  /**
   * Calculate deadline based on priority and interaction type
   */
  private calculateDeadline(
    priority: string,
    interactionType: HumanInteractionType
  ): Date {
    const priorityHours = {
      'critical': 1,
      'high': 4,
      'medium': 8,
      'low': 24
    };

    const hours = priorityHours[priority] || 8;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  /**
   * Get timeout minutes for interaction type
   */
  private getTimeoutMinutes(interactionType: HumanInteractionType): number {
    const timeouts = {
      [HumanInteractionType.APPROVAL]: 60,
      [HumanInteractionType.REVIEW]: 30,
      [HumanInteractionType.ESCALATION]: 120,
      [HumanInteractionType.COLLABORATION]: 90,
      [HumanInteractionType.OVERSIGHT]: 30,
      [HumanInteractionType.TRAINING]: 120,
      [HumanInteractionType.INTERVENTION]: 45
    };

    return timeouts[interactionType] || 60;
  }

  /**
   * Notify human about interaction
   */
  private async notifyHuman(interaction: HumanInteraction): Promise<void> {
    // This would integrate with your notification system
    console.log(`📧 Notifying human ${interaction.humanId} about ${interaction.type} interaction`);
    
    // In real implementation, this would:
    // 1. Send email/Slack notification
    // 2. Create calendar reminder
    // 3. Update dashboard
    // 4. Send mobile push notification
  }

  /**
   * Escalate interaction
   */
  private async escalateInteraction(
    interaction: HumanInteraction,
    reason: string
  ): Promise<void> {
    console.log(`⬆️ Escalating interaction ${interaction.id} due to ${reason}`);
    
    // In real implementation, this would:
    // 1. Find next human in escalation path
    // 2. Create new interaction for next human
    // 3. Update original interaction status
    // 4. Send notifications
  }

  /**
   * Get pattern for interaction
   */
  private getPatternForInteraction(interaction: HumanInteraction): string {
    // Simple pattern matching - can be enhanced
    if (interaction.type === HumanInteractionType.APPROVAL) return 'budget-approval';
    if (interaction.type === HumanInteractionType.REVIEW) return 'policy-violation';
    if (interaction.type === HumanInteractionType.ESCALATION) return 'strategic-decision';
    return 'budget-approval'; // default
  }
}

// Export singleton instance
export const humanInTheLoopWorkflows = HumanInTheLoopWorkflows.getInstance();


