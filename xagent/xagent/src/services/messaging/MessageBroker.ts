import { EventBus } from '../events/EventBus';
import type { AgentMessage } from '../../types/messaging';

export class MessageBroker {
  private static instance: MessageBroker;
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): MessageBroker {
    if (!this.instance) {
      this.instance = new MessageBroker();
    }
    return this.instance;
  }

  async publish(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.eventBus.emit(message.topic, fullMessage);
  }

  subscribe(topic: string, callback: (message: AgentMessage) => void): void {
    this.eventBus.on(topic, callback);
  }

  unsubscribe(topic: string, callback: (message: AgentMessage) => void): void {
    this.eventBus.off(topic, callback);
  }
}