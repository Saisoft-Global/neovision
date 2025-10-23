/**
 * Mistral AI Provider
 * Excellent for research, analysis, and reasoning tasks
 */

import { LLMConfig } from '../../../types/agent-framework';
import type { LLMMessage, LLMProvider } from '../LLMRouter';

export class MistralProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_MISTRAL_API_KEY || '';
    this.baseUrl = 'https://api.mistral.ai/v1';
  }

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Mistral API key not configured. Set VITE_MISTRAL_API_KEY');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
        top_p: config.topP
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mistral API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  getModelInfo() {
    return {
      models: [
        'mistral-large-latest',    // Best for reasoning & analysis
        'mistral-medium-latest',   // Good balance
        'mistral-small-latest',    // Fast & cheap
        'open-mistral-7b',         // Free tier
        'open-mixtral-8x7b',       // Open source
        'open-mixtral-8x22b'       // Most powerful open
      ],
      defaultModel: 'mistral-large-latest'
    };
  }
}

