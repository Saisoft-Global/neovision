import type { DocumentChunk } from '../../../types/document';
import { generateEmbeddings } from '../../openai/embeddings';
import { sanitizeContent } from '../utils/sanitization';

export class ChunkProcessor {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private readonly BATCH_SIZE = 5;

  async processChunksWithRateLimit(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const processedChunks: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      
      try {
        const batchResults = await Promise.all(
          batch.map(chunk => this.processChunkWithRetry(chunk))
        );
        processedChunks.push(...batchResults);

        // Add delay between batches to avoid rate limits
        if (i + this.BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Failed to process batch starting at index ${i}:`, error);
        throw error;
      }
    }

    return processedChunks;
  }

  private async processChunkWithRetry(chunk: DocumentChunk, attempt = 0): Promise<DocumentChunk> {
    try {
      // Clean chunk content
      const cleanContent = sanitizeContent(chunk.content);
      if (!cleanContent) {
        throw new Error('Chunk content is empty after sanitization');
      }

      // Generate embeddings
      const embeddings = await generateEmbeddings(cleanContent);
      
      return {
        ...chunk,
        content: cleanContent,
        embeddings,
        metadata: {
          ...chunk.metadata,
          processedAt: new Date().toISOString(),
          embeddingModel: 'text-embedding-3-small',
          embeddingDimensions: embeddings.length,
        }
      };
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        // Wait with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, attempt))
        );
        return this.processChunkWithRetry(chunk, attempt + 1);
      }
      
      console.error(`Failed to process chunk ${chunk.id}:`, error);
      throw error;
    }
  }
}