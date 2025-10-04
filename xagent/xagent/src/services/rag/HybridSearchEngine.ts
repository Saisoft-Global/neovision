import { vectorStore } from '../pinecone/client';
import { generateEmbeddings } from '../openai/embeddings';
import type { SearchResult } from '../../types/search';

export class HybridSearchEngine {
  async search(query: string): Promise<SearchResult[]> {
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(query),
      this.keywordSearch(query),
    ]);

    return this.mergeResults(vectorResults, keywordResults);
  }

  private async vectorSearch(query: string) {
    const embeddings = await generateEmbeddings(query);
    return vectorStore.query({
      vector: embeddings,
      topK: 5,
      includeMetadata: true,
    });
  }

  private async keywordSearch(query: string) {
    const keywords = this.extractKeywords(query);
    return vectorStore.query({
      filter: {
        $or: keywords.map(keyword => ({
          content: { $contains: keyword },
        })),
      },
      topK: 5,
      includeMetadata: true,
    });
  }

  private mergeResults(vectorResults: any[], keywordResults: any[]): SearchResult[] {
    const merged = new Map<string, SearchResult>();

    // Process vector search results
    vectorResults.forEach((result, index) => {
      merged.set(result.id, {
        id: result.id,
        content: result.metadata.content,
        score: this.calculateVectorScore(result.score, index),
        metadata: result.metadata,
      });
    });

    // Merge keyword search results
    keywordResults.forEach((result, index) => {
      if (merged.has(result.id)) {
        // Combine scores if document appears in both results
        const existing = merged.get(result.id)!;
        existing.score = this.combineScores(
          existing.score,
          this.calculateKeywordScore(result.score, index)
        );
      } else {
        merged.set(result.id, {
          id: result.id,
          content: result.metadata.content,
          score: this.calculateKeywordScore(result.score, index),
          metadata: result.metadata,
        });
      }
    });

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score);
  }

  private extractKeywords(query: string): string[] {
    // Remove common stop words and split into keywords
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at']);
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => !stopWords.has(word));
  }

  private calculateVectorScore(score: number, position: number): number {
    // Apply position penalty to favor earlier results
    const positionPenalty = 1 - (position * 0.1);
    return score * positionPenalty;
  }

  private calculateKeywordScore(score: number, position: number): number {
    // Keywords get slightly lower base weight than vector matches
    const baseWeight = 0.8;
    const positionPenalty = 1 - (position * 0.1);
    return score * baseWeight * positionPenalty;
  }

  private combineScores(vectorScore: number, keywordScore: number): number {
    // Weighted average favoring vector similarity
    const vectorWeight = 0.7;
    const keywordWeight = 0.3;
    return (vectorScore * vectorWeight) + (keywordScore * keywordWeight);
  }
}