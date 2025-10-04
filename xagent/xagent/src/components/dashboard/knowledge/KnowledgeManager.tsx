import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import { DocumentUpload } from '../../DocumentUpload';
import { SearchResults } from './SearchResults';
import { KnowledgeUpdateLog } from './KnowledgeUpdateLog';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { SearchBar } from './search/SearchBar';
import { KnowledgeHeader } from './header/KnowledgeHeader';
import { ErrorDisplay } from './error/ErrorDisplay';

const KnowledgeManager: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadDocuments();
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .textSearch('content', searchQuery)
        .limit(10);

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadDocuments} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <KnowledgeHeader onRefresh={loadDocuments} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
          />
          <DocumentUpload />
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <SearchResults results={documents} />
              <KnowledgeUpdateLog updates={[]} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeManager;