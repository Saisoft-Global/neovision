import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { isServiceConfigured } from '../../config/environment';
import { EventEmitter } from '../../utils/events/EventEmitter';

export class LangChainService {
  private static instance: LangChainService;
  private model: ChatOpenAI | null = null;
  private eventEmitter: EventEmitter;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.initialize();
  }

  public static getInstance(): LangChainService {
    if (!this.instance) {
      this.instance = new LangChainService();
    }
    return this.instance;
  }

  private initialize(): void {
    if (isServiceConfigured('openai')) {
      this.model = new ChatOpenAI({
        openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
        modelName: 'gpt-4-turbo-preview',
        temperature: 0.7,
      });
      this.eventEmitter.emit('initialized');
    } else {
      this.eventEmitter.emit('error', 'OpenAI API key not configured');
    }
  }

  async createChain(template: string) {
    if (!this.model) {
      throw new Error('LLM not initialized - OpenAI API key required');
    }

    const prompt = PromptTemplate.fromTemplate(template);
    return RunnableSequence.from([
      prompt,
      this.model,
      new StringOutputParser()
    ]);
  }

  getModel(): ChatOpenAI {
    if (!this.model) {
      throw new Error('LLM not initialized - OpenAI API key required');
    }
    return this.model;
  }

  onInitialized(callback: () => void): void {
    this.eventEmitter.on('initialized', callback);
  }

  onError(callback: (error: string) => void): void {
    this.eventEmitter.on('error', callback);
  }
}