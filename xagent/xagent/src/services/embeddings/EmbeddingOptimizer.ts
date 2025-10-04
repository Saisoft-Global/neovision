import { generateEmbeddings } from '../openai/embeddings';
import { getVectorStore } from '../pinecone/client';
import type { Document } from '../../types/document';

export class EmbeddingOptimizer {
  private static instance: EmbeddingOptimizer;
  private refreshInterval: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {
    this.startRefreshCycle();
  }

  public static getInstance(): EmbeddingOptimizer {
    if (!this.instance) {
      this.instance = new EmbeddingOptimizer();
    }
    return this.instance;
  }

  private startRefreshCycle(): void {
    setInterval(() => {
      this.refreshEmbeddings();
    }, this.refreshInterval);
  }

  private async refreshEmbeddings(): Promise<void> {
    const documents = await this.getDocumentsForRefresh();
    
    for (const doc of documents) {
      try {
        const newEmbeddings = await generateEmbeddings(doc.content);
        await this.updateDocumentEmbeddings(doc.id, newEmbeddings);
      } catch (error) {
        console.error(`Failed to refresh embeddings for document ${doc.id}:`, error);
      }
    }
  }

  private async getDocumentsForRefresh(): Promise<Document[]> {
    const cutoffDate = new Date(Date.now() - this.refreshInterval);
    const vectorStore = await getVectorStore();
    
    const results = await vectorStore.query({
      filter: {
        last_refreshed: { $lt: cutoffDate.toISOString() },
      },
      includeMetadata: true,
    });

    return results.matches.map(match => match.metadata as Document);
  }

  private async updateDocumentEmbeddings(
    documentId: string,
    embeddings: number[]
  ): Promise<void> {
    const vectorStore = await getVectorStore();
    await vectorStore.upsert([{
      id: documentId,
      values: embeddings,
      metadata: {
        last_refreshed: new Date().toISOString(),
      },
    }]);
  }
}