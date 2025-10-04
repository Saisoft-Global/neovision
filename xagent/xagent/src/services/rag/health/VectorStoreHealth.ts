import { getVectorStore, getPineconeError } from '../../pinecone/client';
import type { HealthCheck } from '../../../types/health';

export class VectorStoreHealth {
  async checkHealth(): Promise<HealthCheck> {
    try {
      const vectorStore = await getVectorStore();
      if (!vectorStore) {
        const error = getPineconeError();
        return {
          status: 'error',
          message: error || 'Vector store not available',
          details: { error },
        };
      }

      const stats = await vectorStore.describeIndexStats();
      
      return {
        status: 'healthy',
        message: 'Vector store is operational',
        details: {
          vectorCount: stats.totalVectorCount,
          dimension: stats.dimension,
          indexFullness: stats.indexFullness,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Vector store health check failed',
        details: { error },
      };
    }
  }
}