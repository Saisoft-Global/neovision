import OpenAI from 'openai';
import { getOpenAIConfig } from './config';
import { isServiceConfigured } from '../../config/environment';

class OpenAIClient {
  private static instance: OpenAI | null = null;
  private static initializationError: string | null = null;
  private static initializationPromise: Promise<OpenAI | null> | null = null;

  public static async getInstance(): Promise<OpenAI | null> {
    if (this.initializationError) {
      console.warn('OpenAI initialization failed:', this.initializationError);
      return null;
    }

    if (this.instance) {
      return this.instance;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initialize();
    return this.initializationPromise;
  }

  private static async initialize(): Promise<OpenAI | null> {
    try {
      if (!isServiceConfigured('openai')) {
        this.initializationError = 'OpenAI is not configured. Please check your environment variables.';
        return null;
      }

      const config = getOpenAIConfig();
      
      // Create client with minimal configuration first
      this.instance = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organization,
        dangerouslyAllowBrowser: true
      });

      // Test the configuration with a simple API call
      await this.instance.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'test',
        encoding_format: 'float',
      });

      this.initializationError = null;
      this.initializationPromise = null;
      return this.instance;
    } catch (error) {
      this.initializationError = error instanceof Error ? error.message : 'Failed to initialize OpenAI client';
      console.error('OpenAI client initialization error:', error);
      this.instance = null;
      this.initializationPromise = null;
      return null;
    }
  }

  public static getInitializationError(): string | null {
    return this.initializationError;
  }

  public static reset(): void {
    this.instance = null;
    this.initializationError = null;
    this.initializationPromise = null;
  }
}

export default OpenAIClient;