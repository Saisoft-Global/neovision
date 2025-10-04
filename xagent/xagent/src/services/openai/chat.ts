import { handleOpenAIError } from './errors';
import OpenAIClient from './client';
import type { ChatMessage } from '../llm/types';
import { isServiceConfigured } from '../../config/environment';

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
    const client = await OpenAIClient.getInstance();
    if (!client) {
      throw new Error('OpenAI client not available');
    }

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return response;
  } catch (error) {
    handleOpenAIError(error);
  }
}