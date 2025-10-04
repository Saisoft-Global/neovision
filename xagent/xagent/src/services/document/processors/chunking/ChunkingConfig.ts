export const CHUNK_CONFIG = {
  DEFAULT_SIZE: 1000,
  DEFAULT_OVERLAP: 200,
  MIN_CHUNK_SIZE: 100,
  MAX_CHUNK_SIZE: 2000,
  MIN_OVERLAP: 50,
  MAX_OVERLAP: 500,
} as const;

export interface ChunkingOptions {
  chunkSize?: number;
  overlap?: number;
  preserveParagraphs?: boolean;
  preserveSentences?: boolean;
}