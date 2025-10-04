import { useState, useCallback } from 'react';
import { KnowledgePipeline } from '../services/knowledge/pipeline/KnowledgePipeline';
import type { Document } from '../types/document';

export function useKnowledgePipeline() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    documentId: string;
    status?: string;
  } | null>(null);

  const processDocument = useCallback(async (document: Document) => {
    const pipeline = KnowledgePipeline.getInstance();
    setIsProcessing(true);
    setError(null);

    try {
      pipeline.onProcessingStart(({ documentId }) => {
        setProgress({ documentId });
      });

      pipeline.onProcessingComplete(({ documentId, status }) => {
        setProgress({ documentId, status });
        setIsProcessing(false);
      });

      pipeline.onProcessingError(({ documentId, error }) => {
        setError(error);
        setProgress({ documentId, status: 'error' });
        setIsProcessing(false);
      });

      await pipeline.processKnowledge(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setIsProcessing(false);
    }
  }, []);

  return {
    processDocument,
    isProcessing,
    error,
    progress,
  };
}