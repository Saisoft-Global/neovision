import React from 'react';
import { useVectorStore } from '../../hooks/useVectorStore';
import { KnowledgeList } from './KnowledgeList';
import { KnowledgeToolbar } from './KnowledgeToolbar';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Alert } from '../common/Alert';
import { useKnowledgeStore } from '../../store/knowledgeStore';

export const KnowledgeBase: React.FC = () => {
  const { isInitialized, isLoading, error, isConfigured } = useVectorStore();
  const { documents, fetchDocuments, isLoading: documentsLoading, error: documentsError } = useKnowledgeStore();

  React.useEffect(() => {
    console.log('📚 Fetching documents from Supabase...');
    fetchDocuments().then(() => {
      console.log(`✅ Fetched ${documents.length} documents`);
    }).catch((err) => {
      console.error('❌ Failed to fetch documents:', err);
    });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Knowledge Base</h1>
          <p className="text-white/60">Manage your AI's knowledge and documents</p>
        </div>
      </div>

      {/* Show documents error if any */}
      {documentsError && (
        <Alert type="error" message={documentsError} />
      )}

      <KnowledgeToolbar />
      <KnowledgeList documents={documents} />
    </div>
  );
};