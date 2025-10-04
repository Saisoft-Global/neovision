import type { Document } from '../../../types/document';
import { vectorStore } from '../../pinecone/client';

export class DocumentRetriever {
  async retrieveDocuments(
    queryEmbeddings: number[],
    context?: { documentIds?: string[]; filters?: Record<string, unknown> }
  ): Promise<Document[]> {
    const filter = this.buildFilter(context);
    const results = await this.queryVectorStore(queryEmbeddings, filter);
    return this.processResults(results);
  }

  private buildFilter(context?: { documentIds?: string[]; filters?: Record<string, unknown> }) {
    return {
      ...(context?.documentIds && {
        id: { $in: context.documentIds },
      }),
      ...context?.filters,
    };
  }

  private async queryVectorStore(embeddings: number[], filter: Record<string, unknown>) {
    return vectorStore.query({
      vector: embeddings,
      topK: 5,
      filter,
    });
  }

  private processResults(results: any) {
    return results.matches.map(match => match.metadata as Document);
  }
}