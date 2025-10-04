import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EmbeddingValidator } from '../../../utils/validation/embeddingValidator';
import type { Document } from '../../../types/document';

interface ValidationButtonProps {
  document: Document;
  onValidationComplete: (result: any) => void;
}

export const ValidationButton: React.FC<ValidationButtonProps> = ({
  document,
  onValidationComplete,
}) => {
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const validator = new EmbeddingValidator();
      const result = await validator.validateDocument(document);
      onValidationComplete(result.details);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <button
      onClick={handleValidate}
      disabled={isValidating}
      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
      <span>{isValidating ? 'Validating...' : 'Validate'}</span>
    </button>
  );
};