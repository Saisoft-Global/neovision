export type LLMProvider = 'openai' | 'ollama' | 'rasa';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResponse {
  content: string;
  usage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMError extends Error {
  provider: LLMProvider;
  code?: string;
}