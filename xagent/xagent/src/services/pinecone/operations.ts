import { getVectorIndex } from './client';
import type { DocumentChunk } from '../../types/document';

export async function upsertDocumentChunk(chunk: DocumentChunk): Promise<void> {
  const vectorIndex = await getVectorIndex();
  if (!vectorIndex) {
    console.warn('Vector index not available - skipping vector storage');
    return;
  }

  try {
    await vectorIndex.upsert({
      vectors: [{
        id: chunk.id,
        values: chunk.embeddings,
        metadata: {
          documentId: chunk.documentId,
          content: chunk.content.substring(0, 1000), // Truncate to avoid size limits
          ...chunk.metadata,
        },
      }]
    });
  } catch (error) {
    console.error('Failed to upsert document chunk:', error);
    throw new Error('Failed to store document in vector database');
  }
}

export async function querySimilarChunks(
  embeddings: number[],
  limit: number = 5
): Promise<any[]> {
  const vectorIndex = await getVectorIndex();
  if (!vectorIndex) {
    console.warn('Vector index not available - skipping similarity search');
    return [];
  }

  try {
    const results = await vectorIndex.query({
      vector: embeddings,
      topK: limit,
      includeMetadata: true,
    });

    return results.matches;
  } catch (error) {
    console.error('Failed to query similar chunks:', error);
    throw new Error('Failed to search vector database');
  }
}