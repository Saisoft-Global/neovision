import type { Workflow, WorkflowNode } from '../../../types/workflow';
import { EventEmitter } from 'events';
import { HttpRequestExecutor } from '../nodes/executors/HttpRequestExecutor';
import { DatabaseExecutor } from '../nodes/executors/DatabaseExecutor';

export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private eventEmitter: EventEmitter;
  private nodeExecutors: Map<string, any>;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.nodeExecutors = new Map();
    this.registerNodeExecutors();
  }

  public static getInstance(): WorkflowEngine {
    if (!this.instance) {
      this.instance = new WorkflowEngine();
    }
    return this.instance;
  }

  private registerNodeExecutors() {
    this.nodeExecutors.set('httpRequest', new HttpRequestExecutor());
    this.nodeExecutors.set('database', new DatabaseExecutor());
    // Register other node executors
  }

  async executeWorkflow(workflow: Workflow, initialData?: Record<string, unknown>): Promise<unknown> {
    const context = new Map<string, unknown>();
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        context.set(key, value);
      });
    }

    // Find start nodes (nodes with no incoming connections)
    const startNodes = this.findStartNodes(workflow);
    
    // Execute workflow starting from each start node
    const results = await Promise.all(
      startNodes.map(node => this.executeNode(node, workflow, context))
    );

    return results;
  }

  private async executeNode(
    node: WorkflowNode,
    workflow: Workflow,
    context: Map<string, unknown>
  ): Promise<unknown> {
    try {
      // Emit node start event
      this.eventEmitter.emit('nodeStart', { nodeId: node.id });

      // Get node executor
      const executor = this.nodeExecutors.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // Execute node
      const result = await executor.execute({
        ...node,
        parameters: this.resolveParameters(node.parameters, context),
      });

      // Store result in context
      context.set(node.id, result);

      // Emit node complete event
      this.eventEmitter.emit('nodeComplete', { nodeId: node.id, result });

      // Find and execute next nodes
      const nextNodes = this.findNextNodes(node, workflow);
      await Promise.all(
        nextNodes.map(nextNode => this.executeNode(nextNode, workflow, context))
      );

      return result;
    } catch (error) {
      this.eventEmitter.emit('nodeError', { nodeId: node.id, error });
      throw error;
    }
  }

  private findStartNodes(workflow: Workflow): WorkflowNode[] {
    const hasIncoming = new Set(workflow.connections.map(c => c.to));
    return workflow.nodes.filter(node => !hasIncoming.has(node.id));
  }

  private findNextNodes(node: WorkflowNode, workflow: Workflow): WorkflowNode[] {
    const connections = workflow.connections.filter(c => c.from === node.id);
    return connections.map(conn => 
      workflow.nodes.find(n => n.id === conn.to)!
    );
  }

  private resolveParameters(
    parameters: Record<string, unknown>,
    context: Map<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Handle variable references
        const contextKey = value.slice(1);
        resolved[key] = context.get(contextKey);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve nested objects
        resolved[key] = this.resolveParameters(value as Record<string, unknown>, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  onNodeStart(callback: (data: { nodeId: string }) => void): void {
    this.eventEmitter.on('nodeStart', callback);
  }

  onNodeComplete(callback: (data: { nodeId: string; result: unknown }) => void): void {
    this.eventEmitter.on('nodeComplete', callback);
  }

  onNodeError(callback: (data: { nodeId: string; error: Error }) => void): void {
    this.eventEmitter.on('nodeError', callback);
  }
}