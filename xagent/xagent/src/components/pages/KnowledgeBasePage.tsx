import React from 'react';
import { KnowledgeBase } from '../knowledge/KnowledgeBase';
import { useKnowledgeInitialization } from '../../hooks/useKnowledgeInitialization';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Alert } from '../common/Alert';

export const KnowledgeBasePage: React.FC = () => {
  const { isInitialized, isLoading, error } = useKnowledgeInitialization();

  if (isLoading) {
    return <LoadingSpinner message="Initializing knowledge base..." />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Alert
          type="error"
          message={`Failed to initialize knowledge base: ${error}`}
        />
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Alert
          type="warning"
          message="Knowledge base is not initialized. Please try refreshing the page."
        />
      </div>
    );
  }

  return <KnowledgeBase />;
};