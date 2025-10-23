/**
 * Anthropic Claude Provider
 * Excellent for writing, content creation, and long-context tasks
 */

import { LLMConfig } from '../../../types/agent-framework';
import type { LLMMessage, LLMProvider } from '../LLMRouter';

export class ClaudeProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured. Set VITE_ANTHROPIC_API_KEY');
    }

    // Claude uses slightly different message format
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        system: systemMessage?.content || '',
        messages: chatMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens || 4096,
        top_p: config.topP
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  getModelInfo() {
    return {
      models: [
        'claude-3-opus-20240229',      // Most powerful, best for writing
        'claude-3-sonnet-20240229',    // Balanced
        'claude-3-haiku-20240307',     // Fast & cheap
        'claude-2.1',                  // Previous generation
        'claude-instant-1.2'           // Very fast
      ],
      defaultModel: 'claude-3-opus-20240229'
    };
  }
}

