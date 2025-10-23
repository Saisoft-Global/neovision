/**
 * Workforce Integration
 * Integrates hierarchical workforce system with existing agent framework
 */

import { BaseAgent } from '../agent/BaseAgent';
import { hierarchicalWorkforceManager, WorkforceLevel, TaskContext, EscalationDecision } from './HierarchicalWorkforceManager';
import { humanInTheLoopWorkflows, HumanInteractionType } from './HumanInTheLoopWorkflows';

export interface WorkforceAwareAgent extends BaseAgent {
  workforceLevel: WorkforceLevel;
  department: string;
  confidenceThreshold: number;
  maxComplexity: number;
  humanSupervisor?: string;
  aiSupervisor?: string;
}

export class WorkforceIntegration {
  private static instance: WorkforceIntegration;
  private registeredAgents: Map<string, WorkforceAwareAgent> = new Map();

  static getInstance(): WorkforceIntegration {
    if (!this.instance) {
      this.instance = new WorkforceIntegration();
    }
    return this.instance;
  }

  /**
   * Register an agent in the workforce system
   */
  registerAgent(agent: WorkforceAwareAgent): void {
    this.registeredAgents.set(agent.id, agent);
    
    // Register with hierarchical workforce manager
    hierarchicalWorkforceManager.registerAgent({
      id: agent.id,
      name: agent.name || agent.id,
      level: agent.workforceLevel,
      department: agent.department,
      capabilities: agent.capabilities?.map(c => c.name) || [],
      confidenceThreshold: agent.confidenceThreshold,
      maxComplexity: agent.maxComplexity,
      escalationRules: this.getDefaultEscalationRules(agent.workforceLevel),
      humanSupervisor: agent.humanSupervisor,
      aiSupervisor: agent.aiSupervisor
    });

    console.log(`👤 Registered agent ${agent.id} in workforce system as ${agent.workforceLevel}`);
  }

  /**
   * Process task with workforce-aware escalation
   */
  async processTaskWithWorkforce(
    agentId: string,
    task: any,
    context: any = {}
  ): Promise<{
    success: boolean;
    result?: any;
    escalated: boolean;
    escalationReason?: string;
    humanInteractionId?: string;
  }> {
    const agent = this.registeredAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not registered in workforce system`);
    }

    // Create task context
    const taskContext: TaskContext = {
      id: task.id || `task-${Date.now()}`,
      type: task.type || 'general',
      complexity: this.assessTaskComplexity(task, context),
      confidence: await this.assessAgentConfidence(agent, task, context),
      department: agent.department,
      priority: task.priority || 'medium',
      requiresApproval: this.requiresApproval(task, context),
      budget: task.budget,
      riskLevel: this.assessRiskLevel(task, context),
      deadline: task.deadline,
      stakeholders: task.stakeholders || [],
      metadata: { ...task, ...context }
    };

    // Check if escalation is needed
    const escalationDecision = await hierarchicalWorkforceManager.shouldEscalate(
      taskContext,
      agentId
    );

    if (escalationDecision.shouldEscalate) {
      console.log(`⬆️ Escalating task ${taskContext.id}: ${escalationDecision.reasoning}`);
      
      // Execute escalation
      const escalationResult = await hierarchicalWorkforceManager.executeEscalation(
        taskContext,
        escalationDecision,
        agentId
      );

      if (escalationResult.humanNotification) {
        // Create human interaction
        const humanInteraction = await humanInTheLoopWorkflows.createHumanInteraction(
          taskContext,
          agentId,
          escalationResult.humanNotification.userId,
          this.getInteractionTypeForReason(escalationDecision.reason),
          taskContext.priority
        );

        return {
          success: false,
          escalated: true,
          escalationReason: escalationDecision.reasoning,
          humanInteractionId: humanInteraction.id
        };
      } else if (escalationResult.targetAgentId) {
        // Transfer to AI agent
        return {
          success: false,
          escalated: true,
          escalationReason: `Transferred to ${escalationResult.targetAgentId}`,
          result: { transferredTo: escalationResult.targetAgentId }
        };
      }
    }

    // Process task normally
    try {
      const result = await agent.processMessage(task, context);
      
      return {
        success: true,
        result,
        escalated: false
      };
    } catch (error) {
      console.error(`❌ Error processing task ${taskContext.id}:`, error);
      
      // Check if error requires human intervention
      if (this.requiresHumanIntervention(error, taskContext)) {
        const humanInteraction = await humanInTheLoopWorkflows.createHumanInteraction(
          taskContext,
          agentId,
          agent.humanSupervisor || 'default-supervisor',
          HumanInteractionType.INTERVENTION,
          'high'
        );

        return {
          success: false,
          escalated: true,
          escalationReason: 'Error requires human intervention',
          humanInteractionId: humanInteraction.id
        };
      }

      throw error;
    }
  }

  /**
   * Handle human response and continue processing
   */
  async handleHumanResponse(
    humanInteractionId: string,
    humanResponse: {
      decision: 'approve' | 'reject' | 'modify' | 'escalate';
      feedback: string;
      modifications?: any;
    }
  ): Promise<{
    success: boolean;
    nextAction: string;
    shouldContinue: boolean;
    newTaskContext?: any;
  }> {
    const response = await humanInTheLoopWorkflows.processHumanResponse(
      humanInteractionId,
      humanResponse
    );

    if (response.success) {
      switch (humanResponse.decision) {
        case 'approve':
          return {
            success: true,
            nextAction: 'Continue with original task execution',
            shouldContinue: true
          };
        
        case 'reject':
          return {
            success: false,
            nextAction: 'Cancel task and notify stakeholders',
            shouldContinue: false
          };
        
        case 'modify':
          return {
            success: true,
            nextAction: 'Apply modifications and re-execute',
            shouldContinue: true,
            newTaskContext: humanResponse.modifications
          };
        
        case 'escalate':
          return {
            success: false,
            nextAction: 'Escalate to next level in hierarchy',
            shouldContinue: false
          };
      }
    }

    return {
      success: false,
      nextAction: 'Handle error in human response processing',
      shouldContinue: false
    };
  }

  /**
   * Get workforce statistics
   */
  getWorkforceStats(): {
    totalAgents: number;
    agentsByLevel: Record<string, number>;
    agentsByDepartment: Record<string, number>;
    escalationStats: any;
    interactionStats: any;
  } {
    const agents = Array.from(this.registeredAgents.values());
    
    const stats = {
      totalAgents: agents.length,
      agentsByLevel: {} as Record<string, number>,
      agentsByDepartment: {} as Record<string, number>,
      escalationStats: hierarchicalWorkforceManager.getEscalationStats(),
      interactionStats: humanInTheLoopWorkflows.getInteractionStats()
    };

    agents.forEach(agent => {
      // Count by level
      stats.agentsByLevel[agent.workforceLevel] = 
        (stats.agentsByLevel[agent.workforceLevel] || 0) + 1;
      
      // Count by department
      stats.agentsByDepartment[agent.department] = 
        (stats.agentsByDepartment[agent.department] || 0) + 1;
    });

    return stats;
  }

  /**
   * Assess task complexity (1-10 scale)
   */
  private assessTaskComplexity(task: any, context: any): number {
    let complexity = 1;

    // Base complexity from task type
    if (task.type?.includes('strategic')) complexity += 3;
    if (task.type?.includes('analysis')) complexity += 2;
    if (task.type?.includes('coordination')) complexity += 2;
    if (task.type?.includes('decision')) complexity += 2;

    // Add complexity based on context
    if (context.stakeholders?.length > 5) complexity += 1;
    if (context.requiresApproval) complexity += 1;
    if (context.budget > 10000) complexity += 2;
    if (context.deadline && this.isUrgent(context.deadline)) complexity += 1;

    return Math.min(complexity, 10);
  }

  /**
   * Assess agent confidence for task
   */
  private async assessAgentConfidence(
    agent: WorkforceAwareAgent,
    task: any,
    context: any
  ): Promise<number> {
    let confidence = 0.8; // Base confidence

    // Adjust based on agent capabilities
    const hasRequiredCapability = agent.capabilities?.some(cap => 
      task.type?.toLowerCase().includes(cap.name.toLowerCase())
    );
    
    if (hasRequiredCapability) confidence += 0.1;
    else confidence -= 0.2;

    // Adjust based on task complexity vs agent level
    const taskComplexity = this.assessTaskComplexity(task, context);
    const agentMaxComplexity = agent.maxComplexity;
    
    if (taskComplexity <= agentMaxComplexity) confidence += 0.1;
    else confidence -= 0.3;

    // Adjust based on context familiarity
    if (context.department === agent.department) confidence += 0.1;
    if (context.priority === 'critical') confidence -= 0.1;

    return Math.max(0, Math.min(confidence, 1));
  }

  /**
   * Check if task requires approval
   */
  private requiresApproval(task: any, context: any): boolean {
    return (
      task.requiresApproval ||
      context.requiresApproval ||
      task.priority === 'critical' ||
      (task.budget && task.budget > 5000) ||
      task.type?.includes('approval') ||
      task.type?.includes('decision')
    );
  }

  /**
   * Assess risk level
   */
  private assessRiskLevel(task: any, context: any): 'low' | 'medium' | 'high' {
    if (task.priority === 'critical') return 'high';
    if (task.budget && task.budget > 10000) return 'high';
    if (task.type?.includes('financial') || task.type?.includes('legal')) return 'high';
    if (task.type?.includes('policy') || task.type?.includes('compliance')) return 'medium';
    return 'low';
  }

  /**
   * Check if error requires human intervention
   */
  private requiresHumanIntervention(error: any, taskContext: TaskContext): boolean {
    // Check error type and context
    if (error.message?.includes('unauthorized')) return true;
    if (error.message?.includes('forbidden')) return true;
    if (taskContext.priority === 'critical') return true;
    if (taskContext.riskLevel === 'high') return true;
    
    return false;
  }

  /**
   * Get default escalation rules for agent level
   */
  private getDefaultEscalationRules(level: WorkforceLevel): any[] {
    // Return appropriate escalation rules based on level
    // This would be more sophisticated in a real implementation
    return [];
  }

  /**
   * Get interaction type for escalation reason
   */
  private getInteractionTypeForReason(reason: string): HumanInteractionType {
    if (reason.includes('confidence')) return HumanInteractionType.REVIEW;
    if (reason.includes('complexity')) return HumanInteractionType.ESCALATION;
    if (reason.includes('approval')) return HumanInteractionType.APPROVAL;
    if (reason.includes('strategic')) return HumanInteractionType.ESCALATION;
    if (reason.includes('creative')) return HumanInteractionType.COLLABORATION;
    return HumanInteractionType.REVIEW;
  }

  /**
   * Check if deadline is urgent
   */
  private isUrgent(deadline: Date): boolean {
    const now = new Date();
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDeadline < 24;
  }
}

// Export singleton instance
export const workforceIntegration = WorkforceIntegration.getInstance();


