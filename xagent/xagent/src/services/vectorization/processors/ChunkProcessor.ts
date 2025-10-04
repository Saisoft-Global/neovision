import type { DocumentChunk } from '../../../types/document';
import { generateEmbeddings } from '../../openai/embeddings';

export class ChunkProcessor {
  async processChunksWithRateLimit(
    chunks: DocumentChunk[],
    batchSize = 5,
    delayMs = 1000
  ): Promise<DocumentChunk[]> {
    const processedChunks: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchPromises = batch.map(chunk => this.processChunk(chunk));

      const results = await Promise.all(batchPromises);
      processedChunks.push(...results);

      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return processedChunks;
  }

  private async processChunk(chunk: DocumentChunk): Promise<DocumentChunk> {
    try {
      chunk.embeddings = await generateEmbeddings(chunk.content);
      return chunk;
    } catch (error) {
      console.error(`Failed to process chunk ${chunk.id}:`, error);
      throw error;
    }
  }
}