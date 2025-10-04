import React from 'react';
import { useVectorStore } from '../../hooks/useVectorStore';
import { KnowledgeList } from './KnowledgeList';
import { KnowledgeToolbar } from './KnowledgeToolbar';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Alert } from '../common/Alert';
import { useKnowledgeStore } from '../../store/knowledgeStore';

export const KnowledgeBase: React.FC = () => {
  const { isInitialized, isLoading, error, isConfigured } = useVectorStore();
  const { documents, fetchDocuments } = useKnowledgeStore();

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (isLoading) {
    return <LoadingSpinner message="Initializing vector store..." />;
  }

  if (error) {
    return (
      <Alert
        type="error"
        message={`Vector store initialization failed: ${error}`}
      />
    );
  }

  if (!isConfigured) {
    return (
      <Alert
        type="warning"
        message="OpenAI API key not configured. Document embeddings and semantic search will be disabled."
      />
    );
  }

  if (!isInitialized) {
    return (
      <Alert
        type="warning"
        message="Vector store is not initialized. Some features may be limited."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <KnowledgeToolbar />
      <KnowledgeList documents={documents} />
    </div>
  );
};