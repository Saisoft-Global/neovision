import { CHUNK_CONFIG } from './ChunkingConfig';
import type { ChunkingOptions } from './ChunkingConfig';

export class TextChunker {
  splitText(text: string, options: ChunkingOptions = {}): string[] {
    const {
      chunkSize = CHUNK_CONFIG.DEFAULT_SIZE,
      overlap = CHUNK_CONFIG.DEFAULT_OVERLAP,
      preserveParagraphs = true,
      preserveSentences = true,
    } = options;

    if (preserveParagraphs) {
      return this.splitByParagraphs(text, chunkSize, overlap);
    }

    if (preserveSentences) {
      return this.splitBySentences(text, chunkSize, overlap);
    }

    return this.splitByCharacters(text, chunkSize, overlap);
  }

  private splitByParagraphs(text: string, chunkSize: number, overlap: number): string[] {
    const paragraphs = text.split(/\n\s*\n/);
    return this.combineChunks(paragraphs, chunkSize, overlap);
  }

  private splitBySentences(text: string, chunkSize: number, overlap: number): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return this.combineChunks(sentences, chunkSize, overlap);
  }

  private splitByCharacters(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      chunks.push(text.slice(startIndex, endIndex));
      startIndex += chunkSize - overlap;
    }

    return chunks;
  }

  private combineChunks(elements: string[], chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    for (const element of elements) {
      if (currentChunk.length + element.length <= chunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + element;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = element;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}