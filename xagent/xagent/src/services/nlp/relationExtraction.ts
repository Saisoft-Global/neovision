import openai from '../openai/client';
import type { KnowledgeNode } from '../../types/knowledge';

export async function extractRelations(nodes: KnowledgeNode[]) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'Identify relationships between the following entities. Return as JSON array with source, target, relationship type, and confidence score.',
      },
      {
        role: 'user',
        content: JSON.stringify(nodes.map(n => ({ id: n.id, label: n.label, type: n.type }))),
      },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content!).relations;
}