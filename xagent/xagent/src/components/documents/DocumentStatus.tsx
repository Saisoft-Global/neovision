import React from 'react';
import { CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import type { Document } from '../../types/document';

interface DocumentStatusProps {
  document: Document;
}

export const DocumentStatus: React.FC<DocumentStatusProps> = ({ document }) => {
  const getStatusDisplay = () => {
    const { status, metadata } = document;
    
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          text: 'Processed',
          description: (
            <div className="text-xs space-y-1">
              <p>✓ Document stored</p>
              {metadata.hasEmbeddings && <p>✓ Embeddings generated</p>}
              {metadata.isVectorized && <p>✓ Vectors stored</p>}
              {!metadata.hasEmbeddings && <p className="text-amber-600">⚠ Embeddings disabled</p>}
            </div>
          )
        };
      case 'processing':
        return {
          icon: <Loader className="w-5 h-5 text-blue-500 animate-spin" />,
          text: 'Processing',
          description: (
            <div className="text-xs space-y-1">
              <p>Processing document...</p>
              {metadata.currentStep === 'embeddings' && <p>Generating embeddings...</p>}
              {metadata.currentStep === 'vectorization' && <p>Storing vectors...</p>}
            </div>
          )
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          text: 'Failed',
          description: <p className="text-xs text-red-600">{metadata.error || 'Processing failed'}</p>
        };
      default:
        return {
          icon: <Loader className="w-5 h-5 text-gray-400" />,
          text: 'Pending',
          description: <p className="text-xs">Waiting to process</p>
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center space-x-1">
        {statusDisplay.icon}
        <span className="text-sm font-medium">{statusDisplay.text}</span>
      </div>
      <div className="mt-1">{statusDisplay.description}</div>
    </div>
  );
};