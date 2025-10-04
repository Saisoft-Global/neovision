import type { DocumentChunk } from '../../../../types/document';

export class ChunkMetadataGenerator {
  generateMetadata(chunk: string, index: number, total: number): DocumentChunk['metadata'] {
    return {
      pageNumber: this.estimatePageNumber(index),
      position: {
        start: this.calculateStartPosition(index, chunk.length),
        end: this.calculateEndPosition(index, chunk.length),
      },
      statistics: {
        wordCount: this.countWords(chunk),
        charCount: chunk.length,
        density: this.calculateDensity(chunk),
      },
    };
  }

  private estimatePageNumber(chunkIndex: number): number {
    // Assume average page has 2000 characters
    return Math.floor(chunkIndex / 2) + 1;
  }

  private calculateStartPosition(index: number, length: number): number {
    return index * length;
  }

  private calculateEndPosition(index: number, length: number): number {
    return (index + 1) * length;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private calculateDensity(text: string): number {
    const words = this.countWords(text);
    return words / text.length;
  }
}