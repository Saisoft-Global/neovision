import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Document } from '../../../types/document';

interface ValidationStatusProps {
  document: Document;
  onValidate: () => void;
  validationResult?: {
    hasEmbeddings: boolean;
    isStoredInVectorDB: boolean;
    embeddingDimensions?: number;
    vectorMatches?: number;
  };
  isValidating: boolean;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({
  document,
  onValidate,
  validationResult,
  isValidating,
}) => {
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Validation Status</span>
        <button
          onClick={onValidate}
          disabled={isValidating}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isValidating ? 'Validating...' : 'Validate'}
        </button>
      </div>

      {validationResult && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Embeddings</span>
            {validationResult.hasEmbeddings ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>

          <div className="flex items-center justify-between">
            <span>Vector Storage</span>
            {validationResult.isStoredInVectorDB ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>

          {validationResult.embeddingDimensions && (
            <div className="flex items-center justify-between text-gray-600">
              <span>Dimensions</span>
              <span>{validationResult.embeddingDimensions}</span>
            </div>
          )}

          {validationResult.vectorMatches !== undefined && (
            <div className="flex items-center justify-between text-gray-600">
              <span>Vector Matches</span>
              <span>{validationResult.vectorMatches}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};