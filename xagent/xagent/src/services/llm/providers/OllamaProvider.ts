/**
 * Ollama Provider
 * Local LLM deployment - free and private
 */

import { LLMConfig } from '../../../types/agent-framework';
import type { LLMMessage, LLMProvider } from '../LLMRouter';

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          options: {
            temperature: config.temperature ?? 0.7,
            num_predict: config.maxTokens,
            top_p: config.topP
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || '';

    } catch (error) {
      console.error('Ollama error:', error);
      throw new Error(`Ollama is not running. Start it with: ollama serve`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  getModelInfo() {
    return {
      models: [
        'llama3',              // Meta's Llama 3
        'llama3:70b',          // Larger version
        'mistral',             // Mistral 7B
        'mixtral',             // Mixtral 8x7B
        'phi3',                // Microsoft Phi-3
        'codellama',           // Code-specialized
        'gemma'                // Google Gemma
      ],
      defaultModel: 'llama3'
    };
  }
}

