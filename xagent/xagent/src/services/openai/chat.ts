import { handleOpenAIError } from './errors';
import type { ChatMessage } from '../llm/types';
import { isServiceConfigured } from '../../config/environment';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function createChatCompletion(
  messages: ChatMessage[],
  model: string = 'gpt-4-turbo-preview',
  temperature: number = 0.7,
  maxTokens?: number
) {
  if (!isServiceConfigured('openai')) {
    throw new Error('OpenAI API key not configured. Please check your environment variables.');
  }

  try {
    // Use backend proxy to avoid CORS
    const response = await fetch(`${BACKEND_URL}/api/openai/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'OpenAI API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('OpenAI chat completion error:', error);
    handleOpenAIError(error);
  }
}
