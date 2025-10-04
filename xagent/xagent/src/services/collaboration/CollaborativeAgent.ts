import { BaseAgent } from '../agent/BaseAgent';
import { MessageBroker } from '../messaging/MessageBroker';
import { SharedContext } from '../context/SharedContext';
import { CollaborationManager } from './CollaborationManager';
import type { AgentMessage } from '../../types/messaging';
import { Logger } from '../../utils/logging/Logger';

export class CollaborativeAgent extends BaseAgent {
  protected messageBroker: MessageBroker;
  protected sharedContext: SharedContext;
  protected collaborationManager: CollaborationManager;
  protected logger: Logger;

  constructor(id: string, config: any) {
    super(id, config);
    this.messageBroker = MessageBroker.getInstance();
    this.sharedContext = SharedContext.getInstance();
    this.collaborationManager = CollaborationManager.getInstance();
    this.logger = Logger.getInstance();
    this.initializeMessageHandling();
  }

  private initializeMessageHandling(): void {
    this.messageBroker.subscribe('task_delegation', this.handleTaskDelegation.bind(this));
    this.messageBroker.subscribe('knowledge_update', this.handleKnowledgeUpdate.bind(this));
    this.messageBroker.subscribe('collaboration_request', this.handleCollaborationRequest.bind(this));
  }

  protected async delegateTask(recipientId: string, task: any): Promise<void> {
    this.logger.info('Delegating task', 'agent', {
      agentId: this.id,
      recipientId,
      task,
    });

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
    this.logger.info('Sharing knowledge', 'agent', {
      agentId: this.id,
      knowledge,
    });

    await this.messageBroker.publish({
      senderId: this.id,
      topic: 'knowledge_update',
      type: 'notification',
      content: knowledge,
    });
  }

  protected async requestCollaboration(task: any, requiredSkills: string[]): Promise<void> {
    this.logger.info('Requesting collaboration', 'agent', {
      agentId: this.id,
      task,
      requiredSkills,
    });

    await this.messageBroker.publish({
      senderId: this.id,
      topic: 'collaboration_request',
      type: 'request',
      content: {
        task,
        requiredSkills,
      },
    });
  }

  private async handleTaskDelegation(message: AgentMessage): Promise<void> {
    if (message.recipientId === this.id) {
      this.logger.info('Received task delegation', 'agent', {
        agentId: this.id,
        task: message.content,
      });

      await this.execute(message.content.action, message.content.params);
    }
  }

  private async handleKnowledgeUpdate(message: AgentMessage): Promise<void> {
    this.logger.info('Received knowledge update', 'agent', {
      agentId: this.id,
      update: message.content,
    });

    await this.sharedContext.set(
      `knowledge_${message.content.type}`,
      message.content
    );
  }

  private async handleCollaborationRequest(message: AgentMessage): Promise<void> {
    const { task, requiredSkills } = message.content;
    
    // Check if agent has required skills
    const canHelp = requiredSkills.every(skill =>
      this.config.skills.some(s => s.name === skill)
    );

    if (canHelp) {
      this.logger.info('Accepting collaboration request', 'agent', {
        agentId: this.id,
        task,
      });

      await this.messageBroker.publish({
        senderId: this.id,
        recipientId: message.senderId,
        topic: 'collaboration_response',
        type: 'response',
        content: {
          accepted: true,
          skills: this.config.skills,
        },
      });
    }
  }
}