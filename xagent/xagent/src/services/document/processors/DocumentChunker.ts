import type { Document, DocumentChunk } from '../../../types/document';
import { sanitizeContent } from '../utils/sanitization';

export class DocumentChunker {
  private static instance: DocumentChunker | null = null;
  private readonly CHUNK_SIZE = 1000;
  private readonly CHUNK_OVERLAP = 200;
  private readonly MIN_CHUNK_SIZE = 100;

  private constructor() {}

  public static getInstance(): DocumentChunker {
    if (!this.instance) {
      this.instance = new DocumentChunker();
    }
    return this.instance;
  }

  async chunkDocument(document: Document): Promise<DocumentChunk[]> {
    try {
      if (!document.content) {
        throw new Error('Document content is empty');
      }

      // Sanitize content first
      const sanitizedContent = sanitizeContent(document.content);
      if (!sanitizedContent) {
        throw new Error('Document content is invalid after sanitization');
      }

      // Split into paragraphs first
      const paragraphs = sanitizedContent.split(/\n\s*\n/).filter(Boolean);
      
      const chunks: DocumentChunk[] = [];
      let currentChunk = '';
      let chunkIndex = 0;

      for (const paragraph of paragraphs) {
        // If paragraph is larger than chunk size, split it
        if (paragraph.length > this.CHUNK_SIZE) {
          if (currentChunk) {
            chunks.push(this.createChunk(document.id, currentChunk, chunkIndex++));
            currentChunk = '';
          }
          
          // Split large paragraph into smaller chunks
          const paragraphChunks = this.splitTextIntoChunks(paragraph);
          for (const chunk of paragraphChunks) {
            chunks.push(this.createChunk(document.id, chunk, chunkIndex++));
          }
          continue;
        }

        // Check if adding paragraph would exceed chunk size
        if (currentChunk && (currentChunk.length + paragraph.length > this.CHUNK_SIZE)) {
          chunks.push(this.createChunk(document.id, currentChunk, chunkIndex++));
          currentChunk = paragraph;
        } else {
          currentChunk = currentChunk 
            ? `${currentChunk}\n\n${paragraph}`
            : paragraph;
        }
      }

      // Add final chunk if exists
      if (currentChunk) {
        chunks.push(this.createChunk(document.id, currentChunk, chunkIndex));
      }

      return chunks;
    } catch (error) {
      console.error('Document chunking error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to chunk document: ${error.message}`
          : 'Failed to chunk document'
      );
    }
  }

  private splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = startIndex + this.CHUNK_SIZE;
      
      // If not at end, try to break at sentence or word boundary
      if (endIndex < text.length) {
        // Look for sentence end
        const sentenceEnd = text.substring(endIndex - 50, endIndex + 50).search(/[.!?]\s/);
        if (sentenceEnd !== -1) {
          endIndex = endIndex - 50 + sentenceEnd + 1;
        } else {
          // Look for word boundary
          const wordEnd = text.substring(endIndex - 20, endIndex + 20).search(/\s/);
          if (wordEnd !== -1) {
            endIndex = endIndex - 20 + wordEnd;
          }
        }
      }

      const chunk = text.substring(startIndex, endIndex).trim();
      if (chunk.length >= this.MIN_CHUNK_SIZE) {
        chunks.push(chunk);
      }

      startIndex = endIndex - this.CHUNK_OVERLAP;
    }

    return chunks;
  }

  private createChunk(documentId: string, content: string, index: number): DocumentChunk {
    return {
      id: `${documentId}-chunk-${index}`,
      documentId,
      content: content.trim(),
      embeddings: [],
      metadata: {
        pageNumber: Math.floor(index / 2) + 1,
        position: {
          start: index * this.CHUNK_SIZE,
          end: (index + 1) * this.CHUNK_SIZE,
        },
        statistics: {
          wordCount: content.split(/\s+/).length,
          charCount: content.length,
        }
      }
    };
  }
}

// Export a default instance
export const documentChunker = DocumentChunker.getInstance();