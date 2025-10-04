import { MessageProcessor } from './processors/MessageProcessor';
import type { Message } from '../../types/agent';
import { supabase } from '../../config/supabase';

export class ChatService {
  private static instance: ChatService;
  private messageProcessor: MessageProcessor;

  private constructor() {
    this.messageProcessor = new MessageProcessor();
  }

  public static getInstance(): ChatService {
    if (!this.instance) {
      this.instance = new ChatService();
    }
    return this.instance;
  }

  async processMessage(message: string, context: any = {}): Promise<string> {
    return this.messageProcessor.processMessage(message, context);
  }

  async saveMessage(message: Message): Promise<void> {
    if (!supabase) {
      console.warn('Supabase not configured, message will not be saved');
      return;
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        content: message.content,
        sender_id: message.senderId,
        type: message.type,
        timestamp: message.timestamp,
      });

    if (error) throw error;
  }
}