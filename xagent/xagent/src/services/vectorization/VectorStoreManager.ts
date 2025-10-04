import { getVectorStore } from '../pinecone/client';
import type { Document } from '../../types/document';
import { EventEmitter } from '../../utils/events/EventEmitter';

export class VectorStoreManager {
  private static instance: VectorStoreManager;
  private eventEmitter: EventEmitter;
  private initialized: boolean = false;
  private error: string | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): VectorStoreManager {
    if (!this.instance) {
      this.instance = new VectorStoreManager();
    }
    return this.instance;
  }

  async similaritySearch(
    query: string,
    options: { 
      filter?: Record<string, unknown>;
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<Document[]> {
    try {
      const vectorStore = await getVectorStore();
      if (!vectorStore) {
        throw new Error('Vector store not available');
      }

      const results = await vectorStore.query({
        vector: query,
        topK: options.topK || 5,
        filter: options.filter,
        includeMetadata: true,
      });

      return results.matches
        .filter(doc => doc.score >= (options.threshold || 0.7))
        .map(doc => ({
          id: doc.id,
          title: doc.metadata.title,
          content: doc.metadata.content,
          doc_type: doc.metadata.doc_type,
          metadata: doc.metadata,
          status: 'completed',
        }));
    } catch (error) {
      console.error('Vector search error:', error);
      throw error;
    }
  }

  async deleteVectors(documentId: string): Promise<void> {
    const vectorStore = await getVectorStore();
    if (!vectorStore) {
      throw new Error('Vector store not available');
    }

    await vectorStore.delete({
      filter: { documentId },
    });
  }

  async updateVectors(document: Document): Promise<void> {
    await this.deleteVectors(document.id);
    const vectorStore = await getVectorStore();
    
    if (!vectorStore || !document.embeddings) {
      throw new Error('Vector store not available or document missing embeddings');
    }

    await vectorStore.upsert([{
      id: document.id,
      values: document.embeddings,
      metadata: {
        documentId: document.id,
        content: document.content,
        title: document.title,
        doc_type: document.doc_type,
        ...document.metadata,
      },
    }]);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getError(): string | null {
    return this.error;
  }

  onInitialized(callback: () => void): void {
    if (this.initialized) {
      callback();
    }
    this.eventEmitter.on('initialized', callback);
  }

  onError(callback: (error: string) => void): void {
    if (this.error) {
      callback(this.error);
    }
    this.eventEmitter.on('error', callback);
  }
}