/**
 * Groq Provider
 * Ultra-fast inference with LPU technology
 */

import { LLMConfig } from '../../../types/agent-framework';
import type { LLMMessage, LLMProvider } from '../LLMRouter';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class GroqProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    this.baseUrl = `${BACKEND_URL}/api/groq`; // ⚡ USE BACKEND PROXY!
  }

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured. Set VITE_GROQ_API_KEY');
    }

    // ⚡ USE BACKEND PROXY TO AVOID CORS
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // ✅ API key is handled by backend proxy
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
      throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
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
        'llama-3.3-70b-versatile',  // ✅ Llama 3.3 70B (Oct 2024 - very fast!)
        'llama-3.1-8b-instant',     // ✅ Llama 3.1 8B (Oct 2024 - ultra fast!)
      ],
      defaultModel: 'llama-3.3-70b-versatile' // ✅ UPDATED MODEL
    };
  }
}

