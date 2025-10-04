export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  type?: 'document' | 'knowledge' | 'conversation';
  source?: string;
  timestamp?: Date;
}

export interface SearchOptions {
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  includeMetadata?: boolean;
}