import React from 'react';
import { FileText, Calendar } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import type { Document } from '../../types/document';
import { DocumentStatus } from '../documents/DocumentStatus';

interface KnowledgeListProps {
  documents?: Document[];
}

export const KnowledgeList: React.FC<KnowledgeListProps> = ({ documents = [] }) => {
  const formatDate = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        return 'Invalid date';
      }
      return format(date, 'PPp');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  if (!documents?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No documents in knowledge base yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div key={doc.id} className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-1" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{doc.title}</h3>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {doc.content}
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  <time>
                    {doc.metadata?.uploadedAt ? 
                      formatDate(doc.metadata.uploadedAt) : 
                      'Date not available'
                    }
                  </time>
                </div>
              </div>
            </div>
            <DocumentStatus document={doc} />
          </div>
        </div>
      ))}
    </div>
  );
};