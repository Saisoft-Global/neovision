export interface Document {
  id: string;
  title: string;
  content: string;
  doc_type: string;
  metadata: {
    uploadedAt: string;
    processedAt?: string;
    size: number;
    mimeType: string;
    sourceUrl?: string;
    error?: string;
    currentStep?: 'chunking' | 'embeddings' | 'vectorization';
    hasEmbeddings?: boolean;
    isVectorized?: boolean;
    processedLocally?: boolean;
    chunkCount?: number;
  };
  embeddings?: number[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embeddings: number[];
  metadata: {
    pageNumber?: number;
    position?: { start: number; end: number };
  };
}