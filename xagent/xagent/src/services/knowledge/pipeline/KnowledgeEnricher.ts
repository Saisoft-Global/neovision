import { createChatCompletion } from '../../openai/chat';
import type { Document } from '../../../types/document';

export class KnowledgeEnricher {
  async enrichDocument(document: Document): Promise<Document> {
    try {
      // Extract key concepts and metadata
      const concepts = await this.extractConcepts(document.content);
      const metadata = await this.generateMetadata(document.content);

      return {
        ...document,
        metadata: {
          ...document.metadata,
          concepts,
          ...metadata,
          enrichedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Knowledge enrichment error:', error);
      throw error;
    }
  }

  private async extractConcepts(content: string): Promise<string[]> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Extract key concepts from the following text. Return as JSON array.',
      },
      { role: 'user', content }
    ]);

    return JSON.parse(response?.choices[0]?.message?.content || '[]');
  }

  private async generateMetadata(content: string): Promise<Record<string, unknown>> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Generate metadata for the following text. Include summary, topics, and complexity level.',
      },
      { role: 'user', content }
    ]);

    return JSON.parse(response?.choices[0]?.message?.content || '{}');
  }
}