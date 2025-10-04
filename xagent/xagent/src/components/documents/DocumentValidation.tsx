import React, { useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { EmbeddingValidator } from '../../utils/validation/embeddingValidator';
import type { Document } from '../../types/document';

interface DocumentValidationProps {
  document: Document;
}

export const DocumentValidation: React.FC<DocumentValidationProps> = ({ document }) => {
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validator = new EmbeddingValidator();

  const runValidation = async () => {
    setIsValidating(true);
    setError(null);
    
    try {
      // Only run validation if OpenAI API key is configured
      if (!import.meta.env.VITE_OPENAI_API_KEY) {
        setError('OpenAI API key not configured. Embeddings validation is disabled.');
        return;
      }

      const [embedResult, similarityResult] = await Promise.all([
        validator.validateDocument(document),
        validator.testSimilaritySearch(document)
      ]);

      setValidationResult({ embedResult, similarityResult });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Validation failed');
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg flex items-start space-x-2">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              runValidation();
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!validationResult) {
    return (
      <button
        onClick={runValidation}
        disabled={isValidating}
        className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
      >
        {isValidating ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        <span>Validate Embeddings</span>
      </button>
    );
  }

  const { embedResult, similarityResult } = validationResult;

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="space-y-2">
        <h3 className="font-medium">Embedding Validation</h3>
        <div className="space-y-1">
          <ValidationItem
            label="Has Embeddings"
            isValid={embedResult.details.hasEmbeddings}
            detail={`Dimensions: ${embedResult.details.embeddingDimensions || 'N/A'}`}
          />
          <ValidationItem
            label="Stored in Vector DB"
            isValid={embedResult.details.isStoredInVectorDB}
            detail={`Matches: ${embedResult.details.vectorMatches}`}
          />
        </div>
      </div>

      {similarityResult.success && similarityResult.similarDocuments && (
        <div className="space-y-2">
          <h3 className="font-medium">Similar Documents</h3>
          <div className="space-y-1">
            {similarityResult.similarDocuments.map((doc, index) => (
              <div key={doc.id} className="text-sm text-gray-600">
                {index + 1}. Score: {doc.score.toFixed(3)}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={runValidation}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        Run Again
      </button>
    </div>
  );
};

const ValidationItem: React.FC<{
  label: string;
  isValid: boolean;
  detail?: string;
}> = ({ label, isValid, detail }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2">
      {isValid ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      <span className="text-sm">{label}</span>
    </div>
    {detail && <span className="text-xs text-gray-500">{detail}</span>}
  </div>
);