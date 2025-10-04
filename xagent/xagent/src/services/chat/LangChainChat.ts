import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { LangChainService } from '../llm/LangChainService';
import type { Message } from '../../types/agent';

export class LangChainChat {
  private static instance: LangChainChat;
  private langChain: LangChainService;
  private conversations: Map<string, ConversationChain>;

  private constructor() {
    this.langChain = LangChainService.getInstance();
    this.conversations = new Map();
  }

  public static getInstance(): LangChainChat {
    if (!this.instance) {
      this.instance = new LangChainChat();
    }
    return this.instance;
  }

  async processMessage(message: string, sessionId: string): Promise<Message> {
    let conversation = this.conversations.get(sessionId);
    
    if (!conversation) {
      conversation = new ConversationChain({
        llm: this.langChain.getModel(),
        memory: new BufferMemory(),
      });
      this.conversations.set(sessionId, conversation);
    }

    const response = await conversation.call({ input: message });

    return {
      id: crypto.randomUUID(),
      content: response.response,
      senderId: 'assistant',
      timestamp: new Date(),
      type: 'text',
    };
  }

  clearConversation(sessionId: string): void {
    this.conversations.delete(sessionId);
  }
}