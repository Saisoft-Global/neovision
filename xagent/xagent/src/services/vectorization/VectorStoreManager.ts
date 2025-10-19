import { getVectorStore } from '../pinecone/client';
import type { Document } from '../../types/document';
import { EventEmitter } from '../../utils/events/EventEmitter';

export class VectorStoreManager {
  private static instance: VectorStoreManager;
  private eventEmitter: EventEmitter;
  private initialized: boolean = false;
  private error: string | null = null;
  private currentOrganizationId: string | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): VectorStoreManager {
    if (!this.instance) {
      this.instance = new VectorStoreManager();
    }
    return this.instance;
  }

  /**
   * Set organization context for multi-tenancy
   */
  setOrganizationContext(organizationId: string | null): void {
    this.currentOrganizationId = organizationId;
    console.log(`🏢 VectorStoreManager organization context set: ${organizationId || 'none'}`);
  }

  /**
   * Get current organization context
   */
  getOrganizationContext(): string | null {
    return this.currentOrganizationId;
  }

  async similaritySearch(
    query: string | number[],
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

      // Build filter with organization context
      const filter: Record<string, any> = { ...options.filter };
      if (this.currentOrganizationId) {
        filter.organization_id = { $eq: this.currentOrganizationId };
        console.log(`🔒 Enforcing organization filter in vector search: ${this.currentOrganizationId}`);
      }

      const results = await vectorStore.query({
        vector: Array.isArray(query) ? query : (query as any),
        topK: options.topK || 5,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        includeMetadata: true,
      });

      return results.matches
        .filter((doc: any) => doc.score >= (options.threshold || 0.7))
        .map((doc: any) => ({
          id: doc.id,
          title: doc.metadata?.title || 'Untitled',
          content: doc.metadata?.content || '',
          doc_type: doc.metadata?.doc_type || 'unknown',
          metadata: doc.metadata || {},
          status: 'completed',
          score: doc.score,
        })) as Document[];
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
        content: document.content.substring(0, 1000), // Truncate to avoid size limits
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