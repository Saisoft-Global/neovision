import type { ChatMessage, CompletionResponse } from '../types';
import { isServiceConfigured } from '../../../config/environment';

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';

export async function generateCompletion(
  messages: ChatMessage[],
  model: string = 'llama2',
  temperature: number = 0.7
): Promise<CompletionResponse> {
  if (!isServiceConfigured('ollama')) {
    throw new Error('Ollama is not configured. Please set VITE_OLLAMA_BASE_URL in your environment variables.');
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        options: { temperature },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.message?.content || '',
      usage: {
        totalTokens: data.total_tokens || 0,
        promptTokens: data.prompt_tokens || 0,
        completionTokens: data.completion_tokens || 0,
      },
    };
  } catch (error) {
    console.error('Ollama API error:', error);
    throw new Error('Failed to generate completion with Ollama');
  }
}