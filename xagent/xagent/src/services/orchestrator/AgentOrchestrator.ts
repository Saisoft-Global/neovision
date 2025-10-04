import { EventBus } from '../events/EventBus';
import type { Agent, AgentMessage, Task } from '../../types/agent';
import { AgentRegistry } from './AgentRegistry';
import { TaskPrioritizer } from './TaskPrioritizer';
import { KnowledgeService } from '../knowledge/KnowledgeService';

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private registry: AgentRegistry;
  private prioritizer: TaskPrioritizer;
  private eventBus: EventBus;
  private knowledgeService: KnowledgeService;

  private constructor() {
    this.registry = new AgentRegistry();
    this.prioritizer = new TaskPrioritizer();
    this.eventBus = EventBus.getInstance();
    this.knowledgeService = KnowledgeService.getInstance();
  }

  public static getInstance(): AgentOrchestrator {
    if (!this.instance) {
      this.instance = new AgentOrchestrator();
    }
    return this.instance;
  }

  // ... rest of the implementation remains the same, but use eventBus instead of eventEmitter

  onTaskCompleted(callback: (data: any) => void): void {
    this.eventBus.on('taskCompleted', callback);
  }
}