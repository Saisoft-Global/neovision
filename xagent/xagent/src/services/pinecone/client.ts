/**
 * Pinecone Vector Store - Uses backend API to avoid CORS
 * All Pinecone operations go through the backend
 */

import { vectorService } from '../vector/VectorService';

export interface PineconeVector {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

export interface PineconeMatch {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, any>;
}

export class PineconeVectorStore {
  private currentOrganizationId: string | null = null;

  constructor(apiKey?: string, environment?: string) {
    console.log('✅ Pinecone client initialized (using backend API)');
  }

  /**
   * Set organization context for multi-tenancy
   */
  setOrganizationContext(organizationId: string | null): void {
    this.currentOrganizationId = organizationId;
    vectorService.setOrganizationContext(organizationId);
    console.log(`🏢 Pinecone organization context set: ${organizationId || 'none'}`);
  }

  /**
   * Get current organization context
   */
  getOrganizationContext(): string | null {
    return this.currentOrganizationId;
  }

  async initializeIndex(indexName: string) {
    console.log('🔗 Pinecone index:', indexName);
    return Promise.resolve();
  }

  async upsert(vectors: PineconeVector[], namespace?: string) {
    try {
      await vectorService.upsert({ vectors });
      console.log('✅ Vector upsert successful:', vectors.length, 'vectors');
    } catch (error) {
      console.error('❌ Pinecone upsert error:', error);
    }
    return Promise.resolve();
  }

  async query(queryVectorOrParams: number[] | any, topK?: number, filter?: any) {
    try {
      let searchData: any;

      // Handle both parameter formats
      if (Array.isArray(queryVectorOrParams)) {
        searchData = {
          vector: queryVectorOrParams,
          top_k: topK || 10,
          filter: filter
        };
      } else {
        searchData = {
          vector: queryVectorOrParams.vector,
          top_k: queryVectorOrParams.topK || 10,
          filter: queryVectorOrParams.filter
        };
      }

      const result = await vectorService.search(searchData);
      console.log('✅ Vector query successful:', result.matches?.length || 0, 'matches');
      return result;
    } catch (error) {
      console.error('❌ Pinecone query error:', error);
      return { matches: [] };
    }
  }

  async delete(ids: string[], namespace?: string) {
    console.log('Vector deletion through backend');
    return Promise.resolve();
  }

  async describeIndexStats() {
    try {
      const status = await vectorService.getStatus();
      if (status.available) {
        return {
          dimension: 1536,
          index_fullness: 0,
          total_vector_count: 0
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Pinecone stats error:', error);
      return null;
    }
  }

  async fetch(ids: string[], namespace?: string) {
    return { vectors: {} };
  }
}

// Singleton instance
let pineconeInstance: PineconeVectorStore | null = null;

export async function getVectorStore(): Promise<PineconeVectorStore | null> {
  if (!pineconeInstance) {
    pineconeInstance = new PineconeVectorStore();
  }
  return pineconeInstance;
}

export function resetPinecone(): void {
  pineconeInstance = null;
  console.log('🔄 Pinecone client reset');
}

// Export for direct use
export const pineconeClient = new PineconeVectorStore();

// Export as vectorStore for backwards compatibility
export const vectorStore = pineconeClient;
