import { EventEmitter } from '../events/EventEmitter';
import { MessageBroker } from '../messaging/MessageBroker';
import { SharedContext } from '../context/SharedContext';
import type { Agent, AgentMessage } from '../../types/agent';
import { Logger } from '../../utils/logging/Logger';

export class CollaborationManager {
  private static instance: CollaborationManager;
  private eventEmitter: EventEmitter;
  private messageBroker: MessageBroker;
  private sharedContext: SharedContext;
  private logger: Logger;
  private activeCollaborations: Map<string, Set<string>>;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.messageBroker = MessageBroker.getInstance();
    this.sharedContext = SharedContext.getInstance();
    this.logger = Logger.getInstance();
    this.activeCollaborations = new Map();
    this.initializeMessageHandling();
  }

  public static getInstance(): CollaborationManager {
    if (!this.instance) {
      this.instance = new CollaborationManager();
    }
    return this.instance;
  }

  private initializeMessageHandling(): void {
    this.messageBroker.subscribe('task_delegation', this.handleTaskDelegation.bind(this));
    this.messageBroker.subscribe('knowledge_update', this.handleKnowledgeUpdate.bind(this));
    this.messageBroker.subscribe('collaboration_request', this.handleCollaborationRequest.bind(this));
  }

  async startCollaboration(agents: Agent[], taskId: string): Promise<void> {
    try {
      // Create collaboration channel
      const channelId = `collab_${taskId}`;
      const participants = new Set(agents.map(a => a.id));
      this.activeCollaborations.set(channelId, participants);

      // Share initial context
      await this.shareContext(channelId, agents);

      // Enable agent communication
      this.setupCommunication(channelId, agents);

      // Monitor collaboration
      this.monitorProgress(channelId);

      this.logger.info('Started collaboration', 'collaboration', {
        channelId,
        participants: Array.from(participants),
      });

      this.eventEmitter.emit('collaborationStarted', { channelId, agents });
    } catch (error) {
      this.logger.error('Failed to start collaboration', 'collaboration', { error });
      throw error;
    }
  }

  private async shareContext(channelId: string, agents: Agent[]): Promise<void> {
    const context = await this.sharedContext.get(channelId);
    agents.forEach(agent => {
      this.messageBroker.publish({
        senderId: 'system',
        recipientId: agent.id,
        topic: 'context_update',
        type: 'notification',
        content: context,
      });
    });
  }

  private setupCommunication(channelId: string, agents: Agent[]): void {
    agents.forEach(agent => {
      this.messageBroker.subscribe(`${channelId}_${agent.id}`, (message: AgentMessage) => {
        this.handleAgentMessage(message, agents);
      });
    });
  }

  private async handleAgentMessage(message: AgentMessage, agents: Agent[]): Promise<void> {
    // Route message to appropriate agents
    const relevantAgents = this.findRelevantAgents(message, agents);
    
    relevantAgents.forEach(agent => {
      this.messageBroker.publish({
        ...message,
        recipientId: agent.id,
      });
    });

    this.eventEmitter.emit('messageSent', { message, recipients: relevantAgents });
  }

  private findRelevantAgents(message: AgentMessage, agents: Agent[]): Agent[] {
    // Determine which agents should receive the message based on content and expertise
    return agents.filter(agent => 
      agent.expertise.some(domain => 
        message.content.toString().toLowerCase().includes(domain.toLowerCase())
      )
    );
  }

  private monitorProgress(channelId: string): void {
    this.messageBroker.subscribe(`${channelId}_progress`, (update: any) => {
      // Monitor collaboration progress and intervene if needed
      if (update.status === 'blocked') {
        this.handleCollaborationBlockage(channelId, update);
      }
    });
  }

  private async handleCollaborationBlockage(channelId: string, update: any): Promise<void> {
    this.logger.warning('Collaboration blockage detected', 'collaboration', update);

    // Implement resolution strategies
    const resolution = await this.resolveBlockage(update);
    
    this.messageBroker.publish({
      senderId: 'system',
      topic: `${channelId}_resolution`,
      type: 'notification',
      content: resolution,
    });
  }

  private async resolveBlockage(update: any): Promise<any> {
    // Implement blockage resolution logic
    return {
      type: 'resolution',
      action: 'redistribute_task',
      details: update,
    };
  }

  private async handleTaskDelegation(message: AgentMessage): Promise<void> {
    const { channelId } = message.metadata || {};
    if (!channelId || !this.activeCollaborations.has(channelId)) return;

    this.logger.info('Task delegation received', 'collaboration', {
      channelId,
      task: message.content,
    });

    // Handle task delegation between agents
    this.eventEmitter.emit('taskDelegated', message);
  }

  private async handleKnowledgeUpdate(message: AgentMessage): Promise<void> {
    // Update shared knowledge base
    await this.sharedContext.set(
      `knowledge_${message.metadata?.type}`,
      message.content
    );

    this.eventEmitter.emit('knowledgeUpdated', message);
  }

  private async handleCollaborationRequest(message: AgentMessage): Promise<void> {
    // Handle new collaboration requests
    this.eventEmitter.emit('collaborationRequested', message);
  }

  endCollaboration(channelId: string): void {
    if (this.activeCollaborations.has(channelId)) {
      this.activeCollaborations.delete(channelId);
      this.eventEmitter.emit('collaborationEnded', { channelId });
      this.logger.info('Ended collaboration', 'collaboration', { channelId });
    }
  }

  onCollaborationStarted(callback: (data: { channelId: string; agents: Agent[] }) => void): void {
    this.eventEmitter.on('collaborationStarted', callback);
  }

  onCollaborationEnded(callback: (data: { channelId: string }) => void): void {
    this.eventEmitter.on('collaborationEnded', callback);
  }

  onMessageSent(callback: (data: { message: AgentMessage; recipients: Agent[] }) => void): void {
    this.eventEmitter.on('messageSent', callback);
  }

  onTaskDelegated(callback: (message: AgentMessage) => void): void {
    this.eventEmitter.on('taskDelegated', callback);
  }

  onKnowledgeUpdated(callback: (message: AgentMessage) => void): void {
    this.eventEmitter.on('knowledgeUpdated', callback);
  }

  onCollaborationRequested(callback: (message: AgentMessage) => void): void {
    this.eventEmitter.on('collaborationRequested', callback);
  }
}