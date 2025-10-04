import { LangChain } from 'langchain';
import openai from '../openai/client';

export async function extractEntities(text: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'Extract named entities and concepts from the following text. Return as JSON array with entity text and type.',
      },
      { role: 'user', content: text },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content!).entities;
}