/**
 * Google Gemini Provider
 * Excellent for multimodal tasks, multilingual support
 */

import { LLMConfig } from '../../../types/agent-framework';
import type { LLMMessage, LLMProvider } from '../LLMRouter';

export class GeminiProvider implements LLMProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
  }

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Google API key not configured. Set VITE_GOOGLE_API_KEY');
    }

    // Gemini uses different message format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    // Add system message to first user message if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage && contents.length > 0) {
      contents[0].parts[0].text = `${systemMessage.content}\n\n${contents[0].parts[0].text}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: config.temperature ?? 0.7,
            maxOutputTokens: config.maxTokens,
            topP: config.topP
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  getModelInfo() {
    return {
      models: [
        'gemini-1.5-pro',          // Most powerful
        'gemini-1.5-flash',        // Fast & efficient
        'gemini-pro',              // Previous generation
        'gemini-pro-vision'        // Multimodal
      ],
      defaultModel: 'gemini-1.5-pro'
    };
  }
}

