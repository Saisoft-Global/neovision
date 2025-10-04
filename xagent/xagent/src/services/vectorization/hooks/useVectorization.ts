import { useState, useCallback } from 'react';
import { VectorizationPipeline } from '../VectorizationPipeline';
import type { Document } from '../../../types/document';

export function useVectorization() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    documentId: string;
    chunkCount?: number;
  } | null>(null);

  const processDocument = useCallback(async (document: Document) => {
    const pipeline = VectorizationPipeline.getInstance();
    setIsProcessing(true);
    setError(null);

    try {
      pipeline.onProcessingStart(({ documentId }) => {
        setProgress({ documentId });
      });

      pipeline.onProcessingComplete(({ documentId, chunkCount }) => {
        setProgress({ documentId, chunkCount });
        setIsProcessing(false);
      });

      pipeline.onProcessingError(({ documentId, error }) => {
        setError(error instanceof Error ? error.message : 'Processing failed');
        setIsProcessing(false);
      });

      await pipeline.processDocument(document);
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