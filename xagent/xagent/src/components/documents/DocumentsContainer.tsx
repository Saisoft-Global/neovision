import React, { useEffect, useState } from 'react';
import { DocumentGrid } from './DocumentGrid';
import { DocumentUpload } from '../upload/DocumentUpload';
import { SearchBar } from '../common/SearchBar';
import { useDocumentStore } from '../../store/documentStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Alert } from '../common/Alert';
import { PineconeTest } from '../test/PineconeTest';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const DocumentsContainer: React.FC = () => {
  const { fetchDocuments, isLoading, error } = useDocumentStore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [pineconeError, setPineconeError] = useState<string | null>(null);
  const [showPineconeTest, setShowPineconeTest] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search logic
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading documents..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
      </div>

      {error && (
        <Alert 
          type="error"
          message={error}
        />
      )}

      {/* Pinecone Status Section */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => setShowPineconeTest(!showPineconeTest)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="font-medium">Vector Storage Status</span>
          {showPineconeTest ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {showPineconeTest && (
          <div className="p-4">
            <PineconeTest />
          </div>
        )}
      </div>

      {pineconeError && (
        <Alert
          type="warning"
          message={`Vector storage is disabled: ${pineconeError}. Documents will be stored without embeddings.`}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search documents..."
          />
          <div className="mt-6">
            <DocumentGrid />
          </div>
        </div>

        <div className="lg:col-span-1">
          <DocumentUpload />
        </div>
      </div>
    </div>
  );
};