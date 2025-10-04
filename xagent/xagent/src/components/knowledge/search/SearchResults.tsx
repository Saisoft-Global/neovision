import React from 'react';
import { FileText } from 'lucide-react';
import { useKnowledgeStore } from '../../../store/knowledgeStore';
import { format } from 'date-fns';

export const SearchResults: React.FC = () => {
  const { searchResults, documents, isLoading } = useKnowledgeStore();

  if (isLoading) {
    return <div className="text-center py-8">Searching...</div>;
  }

  if (!searchResults.length && !documents.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No documents or search results found
      </div>
    );
  }

  const results = searchResults.length ? searchResults : documents;

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div key={result.id} className="p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-1" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium">{result.title}</h3>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {result.content}
              </p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                {result.score !== undefined && (
                  <span className="mr-3">Score: {result.score.toFixed(2)}</span>
                )}
                {result.metadata?.uploadedAt && (
                  <span>
                    Added: {format(new Date(result.metadata.uploadedAt), 'PPp')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};