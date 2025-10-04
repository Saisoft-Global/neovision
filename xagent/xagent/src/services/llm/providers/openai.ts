import OpenAI from 'openai';
import type { ChatMessage, CompletionResponse } from '../types';
import { isServiceConfigured } from '../../../config/environment';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!isServiceConfigured('openai')) {
      throw new Error('OpenAI is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
    }
    client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      organization: import.meta.env.VITE_OPENAI_ORG_ID,
      dangerouslyAllowBrowser: true,
    });
  }
  return client;
}

export async function createChatCompletion(
  messages: ChatMessage[],
  model: string = 'gpt-4-turbo-preview',
  temperature: number = 0.7
): Promise<CompletionResponse> {
  try {
    const response = await getClient().chat.completions.create({
      model,
      messages,
      temperature,
    });

    return {
      content: response.choices[0].message.content || '',
      usage: {
        totalTokens: response.usage?.total_tokens || 0,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
      },
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate completion with OpenAI');
  }
}

export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const response = await getClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embeddings error:', error);
    throw new Error('Failed to generate embeddings with OpenAI');
  }
}