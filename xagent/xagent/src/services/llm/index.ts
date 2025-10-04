import type { ChatMessage, CompletionResponse, LLMConfig } from './types';
import { defaultConfig } from './config';
import * as openai from './providers/openai';
import * as ollama from './providers/ollama';

export async function generateCompletion(
  messages: ChatMessage[],
  config: Partial<LLMConfig> = {}
): Promise<CompletionResponse> {
  const finalConfig = { ...defaultConfig, ...config };

  switch (finalConfig.provider) {
    case 'openai':
      return openai.generateCompletion(
        messages,
        finalConfig.model,
        finalConfig.temperature,
        finalConfig.maxTokens
      );
    case 'ollama':
      return ollama.generateCompletion(
        messages,
        finalConfig.model,
        finalConfig.temperature
      );
    default:
      throw new Error(`Unsupported LLM provider: ${finalConfig.provider}`);
  }
}

export async function generateEmbeddings(
  text: string,
  provider: 'openai' | 'ollama' = defaultConfig.provider
): Promise<number[]> {
  switch (provider) {
    case 'openai':
      return openai.generateEmbeddings(text);
    case 'ollama':
      return ollama.generateEmbeddings(text);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}