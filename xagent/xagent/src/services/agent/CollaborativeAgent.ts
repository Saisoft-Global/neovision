import { BaseAgent } from './BaseAgent';
import { MessageBroker } from '../messaging/MessageBroker';
import { SharedContext } from '../context/SharedContext';
import type { AgentMessage } from '../../types/messaging';

export class CollaborativeAgent extends BaseAgent {
  protected messageBroker: MessageBroker;
  protected sharedContext: SharedContext;

  constructor(id: string, config: any) {
    super(id, config);
    this.messageBroker = MessageBroker.getInstance();
    this.sharedContext = SharedContext.getInstance();
    this.initializeMessageHandling();
  }

  private initializeMessageHandling(): void {
    this.messageBroker.subscribe('task_delegation', this.handleTaskDelegation.bind(this));
    this.messageBroker.subscribe('knowledge_update', this.handleKnowledgeUpdate.bind(this));
  }

  protected async delegateTask(recipientId: string, task: any): Promise<void> {
    await this.messageBroker.publish({
      senderId: this.id,
      recipientId,
      topic: 'task_delegation',
      type: 'task',
      content: task,
      priority: task.priority,
    });
  }

  protected async shareKnowledge(knowledge: any): Promise<void> {
    await this.messageBroker.publish({
      senderId: this.id,
      topic: 'knowledge_update',
      type: 'notification',
      content: knowledge,
    });
  }

  private async handleTaskDelegation(message: AgentMessage): Promise<void> {
    if (message.recipientId === this.id) {
      await this.execute(message.content.action, message.content.params);
    }
  }

  private async handleKnowledgeUpdate(message: AgentMessage): Promise<void> {
    await this.sharedContext.set(
      `knowledge_${message.content.type}`,
      message.content
    );
  }
}