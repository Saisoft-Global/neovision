import type { ChatMessage, CompletionResponse } from '../types';
import { RasaClient } from './RasaClient';

export async function generateCompletion(
  messages: ChatMessage[]
): Promise<CompletionResponse> {
  const client = RasaClient.getInstance();
  
  try {
    // Get the last user message
    const userMessage = messages[messages.length - 1].content;
    
    // Send to Rasa
    const content = await client.sendMessage(userMessage);

    return {
      content,
      usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 }
    };
  } catch (error) {
    console.error('Rasa error:', error);
    throw error;
  }
}

export async function isRasaAvailable(): Promise<boolean> {
  return RasaClient.getInstance().isAvailable();
}