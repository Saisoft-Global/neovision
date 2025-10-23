import Groq from 'groq-sdk';
import type { ChatMessage, CompletionResponse } from '../types';
import { isServiceConfigured } from '../../../config/environment';

function getClient(): Groq {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  return new Groq({ apiKey });
}

export async function createChatCompletion(
  messages: ChatMessage[],
  model: string = 'llama-3.3-70b-versatile', // ✅ UPDATED: Oct 2024
  temperature: number = 0.7
): Promise<CompletionResponse> {
  if (!isServiceConfigured('groq')) {
    throw new Error('Groq is not configured. Please set VITE_GROQ_API_KEY.');
  }

  const client = getClient();
  const response = await client.chat.completions.create({
    model,
    temperature,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  });

  const content = response.choices?.[0]?.message?.content || '';
  return {
    content,
    usage: {
      totalTokens: response.usage?.total_tokens || 0,
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0
    }
  };
}

export async function generateCompletion(
  messages: ChatMessage[],
  model?: string,
  temperature?: number
) {
  return createChatCompletion(messages, model, temperature);
}


