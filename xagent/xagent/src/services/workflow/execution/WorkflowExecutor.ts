import { EventBus } from '../../events/EventBus';
import type { Workflow, WorkflowNode } from '../../../types/workflow';
import { OrchestratorAgent } from '../../orchestrator/OrchestratorAgent';
import { ConditionEvaluator } from '../condition/ConditionEvaluator';

export class WorkflowExecutor {
  private orchestrator: OrchestratorAgent;
  private conditionEvaluator: ConditionEvaluator;
  private eventBus: EventBus;

  constructor() {
    this.orchestrator = OrchestratorAgent.getInstance();
    this.conditionEvaluator = new ConditionEvaluator();
    this.eventBus = EventBus.getInstance();
  }

  async execute(workflow: Workflow, context: Record<string, unknown> = {}): Promise<void> {
    try {
      const executionOrder = this.determineExecutionOrder(workflow);
      const results = new Map<string, unknown>();

      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find(n => n.id === nodeId)!;
        const nodeContext = this.buildNodeContext(node, results, context);

        // Evaluate conditions if present
        if (node.conditions?.length) {
          const shouldExecute = await this.conditionEvaluator.evaluate(
            node.conditions,
            nodeContext
          );
          if (!shouldExecute) continue;
        }

        const result = await this.executeNode(node, nodeContext);
        results.set(nodeId, result);

        this.eventBus.emit('nodeCompleted', { nodeId, result });
      }

      this.eventBus.emit('workflowCompleted', { workflowId: workflow.id, results });
    } catch (error) {
      this.eventBus.emit('workflowError', { 
        workflowId: workflow.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private determineExecutionOrder(workflow: Workflow): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const outgoing = workflow.connections.filter(c => c.from === nodeId);
      for (const connection of outgoing) {
        visit(connection.to);
      }

      order.unshift(nodeId);
    };

    const startNodes = this.findStartNodes(workflow);
    for (const nodeId of startNodes) {
      visit(nodeId);
    }

    return order;
  }

  private findStartNodes(workflow: Workflow): string[] {
    const hasIncoming = new Set(workflow.connections.map(c => c.to));
    return workflow.nodes
      .filter(node => !hasIncoming.has(node.id))
      .map(node => node.id);
  }

  private async executeNode(
    node: WorkflowNode,
    context: Record<string, unknown>
  ): Promise<unknown> {
    this.eventBus.emit('nodeStarted', { nodeId: node.id });

    const result = await this.orchestrator.processRequest({
      type: this.determineAgentType(node),
      action: node.action,
      payload: {
        ...node.parameters,
        context,
      },
    });

    return result.data;
  }

  private buildNodeContext(
    node: WorkflowNode,
    results: Map<string, unknown>,
    globalContext: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      ...globalContext,
      nodeResults: Object.fromEntries(results.entries()),
      currentNode: {
        id: node.id,
        label: node.label,
        parameters: node.parameters,
      },
    };
  }

  private determineAgentType(node: WorkflowNode): string {
    const actionTypeMap: Record<string, string> = {
      collect_information: 'knowledge',
      create_accounts: 'system',
      send_email: 'email',
      schedule_meeting: 'meeting',
      process_document: 'document',
    };

    return actionTypeMap[node.action] || 'default';
  }
}