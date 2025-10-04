import React from 'react';
import { FileText, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import type { Document } from '../../types/document';
import { DocumentStatus } from './DocumentStatus';
import { DocumentValidation } from './DocumentValidation';

interface DocumentCardProps {
  document: Document;
  onSelect?: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onSelect }) => {
  const [showValidation, setShowValidation] = React.useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <FileText className="w-6 h-6 text-blue-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{document.title}</h3>
          
          <div className="mt-1 flex items-center text-sm text-gray-500 space-x-4">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {format(new Date(document.metadata.uploadedAt), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center">
              <Tag className="w-4 h-4 mr-1" />
              {document.doc_type.toUpperCase()}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
            {document.content}
          </p>

          {document.status === 'completed' && (
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              {showValidation ? 'Hide Validation' : 'Show Validation'}
            </button>
          )}
        </div>

        <DocumentStatus status={document.status} />
      </div>

      {showValidation && document.status === 'completed' && (
        <div className="mt-4 border-t pt-4">
          <DocumentValidation document={document} />
        </div>
      )}
    </div>
  );
};