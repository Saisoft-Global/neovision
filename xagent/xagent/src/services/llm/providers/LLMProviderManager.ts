import { createChatCompletion as openAIChat } from './openai';
import { generateCompletion as ollamaChat } from './ollama';
import { createChatCompletion as groqChat } from './groq';
import { generateCompletion as rasaChat } from './rasa';
import { isRasaAvailable } from './rasa';
import { isServiceConfigured } from '../../../config/environment';
import type { ChatMessage, CompletionResponse, LLMProvider } from '../types';
import { Logger } from '../../../utils/logging/Logger';
import { ErrorHandler } from '../../../utils/errors/ErrorHandler';

export class LLMProviderManager {
  private static instance: LLMProviderManager;
  private fallbackOrder: LLMProvider[] = ['openai', 'groq', 'ollama', 'rasa'];
  private availableProviders: Set<LLMProvider>;
  private isRasaAvailable: boolean = false;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  private constructor() {
    this.availableProviders = new Set();
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    try {
      // Check OpenAI, Groq and Ollama configuration
      if (isServiceConfigured('openai')) {
        this.availableProviders.add('openai');
        this.logger.info('OpenAI provider initialized', 'llm');
      }
      if (isServiceConfigured('groq')) {
        this.availableProviders.add('groq' as LLMProvider);
        this.logger.info('Groq provider initialized', 'llm');
      }
      
      if (isServiceConfigured('ollama')) {
        this.availableProviders.add('ollama');
        this.logger.info('Ollama provider initialized', 'llm');
      }

      // Check Rasa availability
      try {
        this.isRasaAvailable = await isRasaAvailable();
        if (this.isRasaAvailable) {
          this.availableProviders.add('rasa');
          this.logger.info('Rasa provider initialized', 'llm');
        }
      } catch (error) {
        this.logger.warning('Rasa server is not available', 'llm');
      }

      if (this.availableProviders.size === 0) {
        this.logger.warning('No LLM providers are configured', 'llm');
      }
    } catch (error) {
      this.errorHandler.handleError(error, 'llm_initialization');
    }
  }

  public static getInstance(): LLMProviderManager {
    if (!this.instance) {
      this.instance = new LLMProviderManager();
    }
    return this.instance;
  }

  async generateResponse(
    messages: ChatMessage[],
    preferredProvider?: LLMProvider,
    config: { model?: string; temperature?: number } = {}
  ): Promise<CompletionResponse> {
    if (this.availableProviders.size === 0) {
      throw new Error(
        'No LLM providers are available. Please configure OpenAI API key, set up Ollama, or ensure Rasa server is running.'
      );
    }

    // Try preferred provider first if available, then fall back
    const providers = preferredProvider && this.availableProviders.has(preferredProvider)
      ? [preferredProvider, ...this.fallbackOrder.filter(p => p !== preferredProvider)]
      : this.fallbackOrder;

    const availableProviders = providers.filter(p => this.availableProviders.has(p));
    let lastError: Error | null = null;

    for (const provider of availableProviders) {
      try {
        this.logger.info('Attempting to generate response', 'llm', {
          provider,
          model: config.model,
        });

        let response: CompletionResponse;
        switch (provider) {
          case 'openai':
            response = await openAIChat(messages, config.model, config.temperature);
            break;
          case 'ollama':
            response = await ollamaChat(messages, config.model, config.temperature);
            break;
          case 'groq':
            response = await groqChat(messages, config.model, config.temperature);
            break;
          case 'rasa':
            response = await rasaChat(messages);
            break;
          default:
            continue;
        }

        this.logger.info('Response generated successfully', 'llm', { provider });
        return response;
      } catch (error) {
        this.logger.error(`Error with ${provider}`, 'llm', { error });
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    this.errorHandler.handleError(lastError, 'llm_generation');
    throw new Error(
      lastError?.message || 
      'All available LLM providers failed. Please check your configuration.'
    );
  }

  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.availableProviders);
  }

  isProviderAvailable(provider: LLMProvider): boolean {
    return this.availableProviders.has(provider);
  }

  getDefaultProvider(): LLMProvider | null {
    return this.availableProviders.size > 0 
      ? Array.from(this.availableProviders)[0]
      : null;
  }
}