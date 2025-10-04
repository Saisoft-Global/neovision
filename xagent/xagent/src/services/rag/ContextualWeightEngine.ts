import type { Document } from '../../types/document';
import { createChatCompletion } from '../openai/chat';

export class ContextualWeightEngine {
  async weightDocuments(
    query: string,
    documents: Document[]
  ): Promise<Array<Document & { weight: number }>> {
    const relevanceScores = await this.calculateRelevanceScores(query, documents);
    const recencyScores = this.calculateRecencyScores(documents);
    const authorityScores = this.calculateAuthorityScores(documents);
    
    return documents.map((doc, index) => ({
      ...doc,
      weight: this.combineScores(
        relevanceScores[index],
        recencyScores[index],
        authorityScores[index]
      ),
    }));
  }

  private async calculateRelevanceScores(
    query: string,
    documents: Document[]
  ): Promise<number[]> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Rate the relevance of each document to the query on a scale of 0-1.',
      },
      {
        role: 'user',
        content: `Query: ${query}\n\nDocuments:\n${documents.map(d => d.content).join('\n\n')}`,
      },
    ]);

    return JSON.parse(response?.choices[0]?.message?.content || '[]');
  }

  private calculateRecencyScores(documents: Document[]): number[] {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    return documents.map(doc => {
      const age = now - doc.metadata.uploadedAt.getTime();
      return Math.max(0, 1 - age / maxAge);
    });
  }

  private calculateAuthorityScores(documents: Document[]): number[] {
    return documents.map(doc => {
      // Implement authority scoring based on metadata
      // Example factors: verified source, citation count, author reputation
      return 0.5; // Default score
    });
  }

  private combineScores(
    relevance: number,
    recency: number,
    authority: number
  ): number {
    const weights = {
      relevance: 0.6,
      recency: 0.2,
      authority: 0.2,
    };

    return (
      relevance * weights.relevance +
      recency * weights.recency +
      authority * weights.authority
    );
  }
}