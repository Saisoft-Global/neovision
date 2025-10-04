import React from 'react';
import { FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface SearchResultsProps {
  results: SearchResult[];
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
  if (!results.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No documents found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div key={result.id} className="p-4 bg-white rounded-lg shadow">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-1" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900">{result.title}</h3>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {result.content}
              </p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                <time dateTime={result.created_at}>
                  {format(new Date(result.created_at), 'PPP')}
                </time>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};