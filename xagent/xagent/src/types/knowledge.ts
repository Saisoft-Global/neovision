// Update the KnowledgeUpdate type to be more specific
export interface KnowledgeUpdate {
  id: string;
  type: 'feedback' | 'user_action' | 'external';
  source: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  confidence?: number;
  status?: 'pending' | 'processed' | 'failed';
}

export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'entity' | 'document' | 'fact';
  label: string;
  properties: Record<string, unknown>;
  embeddings: number[];
  sourceDocumentId?: string;
  confidence?: number;
  lastUpdated?: Date;
}

export interface KnowledgeRelation {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties: Record<string, unknown>;
  confidence: number;
  lastUpdated?: Date;
}