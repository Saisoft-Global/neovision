import { VectorStoreManager } from './VectorStoreManager';
import { generateEmbeddings } from '../openai/embeddings';
import { isServiceConfigured } from '../../config/environment';
import type { Document } from '../../types/document';
import type { SearchResult } from '../../types/search';

export class VectorSearchService {
  private static instance: VectorSearchService;
  private vectorStore: VectorStoreManager;

  private constructor() {
    this.vectorStore = VectorStoreManager.getInstance();
  }

  public static getInstance(): VectorSearchService {
    if (!this.instance) {
      this.instance = new VectorSearchService();
    }
    return this.instance;
  }

  async indexDocument(document: Document): Promise<void> {
    if (!isServiceConfigured('openai')) {
      console.warn('OpenAI not configured - skipping vector indexing');
      return;
    }

    try {
      // Generate embeddings if not already present
      const embeddings = document.embeddings || await generateEmbeddings(document.content);

      // Store in vector database
      await this.vectorStore.updateVectors({
        ...document,
        embeddings,
      });
    } catch (error) {
      console.error('Vector indexing error:', error);
      throw error;
    }
  }

  async searchSimilarDocuments(
    query: string,
    options: {
      filter?: Record<string, unknown>;
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    if (!isServiceConfigured('openai')) {
      throw new Error('OpenAI API key required for semantic search');
    }

    try {
      // Generate query embeddings
      const queryEmbeddings = await generateEmbeddings(query);

      // Perform similarity search
      const results = await this.vectorStore.similaritySearch(
        queryEmbeddings,
        options
      );

      // Transform and filter results
      return results
        .filter(doc => doc.score >= (options.threshold || 0.7))
        .map(doc => ({
          id: doc.id,
          content: doc.content,
          score: doc.score,
          metadata: doc.metadata,
          type: 'document',
          source: 'vector_search',
          timestamp: new Date(doc.metadata.uploadedAt),
        }));
    } catch (error) {
      console.error('Vector search error:', error);
      throw error;
    }
  }
}