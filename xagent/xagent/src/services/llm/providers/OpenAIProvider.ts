/**
 * OpenAI Provider - Uses backend proxy to avoid CORS
 * Supports GPT-3.5, GPT-4, and other OpenAI models
 */

import { LLMConfig } from '../../../types/agent-framework';
import type { LLMMessage, LLMProvider } from '../LLMRouter';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY');
    }

    // Use backend proxy to avoid CORS
    const response = await fetch(`${BACKEND_URL}/api/openai/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`OpenAI API error: ${error.detail || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  getSupportedModels(): string[] {
    return [
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];
  }
}
