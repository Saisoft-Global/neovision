import { getVectorStore } from '../../pinecone/client';
import type { DocumentChunk } from '../../../types/document';

export class VectorStorage {
  async storeVectors(chunks: DocumentChunk[]): Promise<void> {
    const vectorStore = await getVectorStore();
    if (!vectorStore) {
      throw new Error('Vector store not available');
    }

    const vectors = chunks.map(chunk => ({
      id: chunk.id,
      values: chunk.embeddings,
      metadata: {
        documentId: chunk.documentId,
        content: chunk.content,
        ...chunk.metadata,
      },
    }));

    await vectorStore.upsert(vectors);
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
}