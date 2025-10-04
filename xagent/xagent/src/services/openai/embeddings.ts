import { handleOpenAIError } from './errors';
import OpenAIClient from './client';

export async function generateEmbeddings(text: string): Promise<number[]> {
  const client = await OpenAIClient.getInstance();
  if (!client) {
    throw new Error('OpenAI client not available. Please check your configuration.');
  }

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    if (error?.error?.code === 'insufficient_quota') {
      console.error('OpenAI API quota exceeded:', error);
      throw new Error('OpenAI API quota exceeded. Please check your billing details.');
    }
    handleOpenAIError(error);
    throw error;
  }
}