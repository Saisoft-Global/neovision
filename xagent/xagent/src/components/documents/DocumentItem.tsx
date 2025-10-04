import React from 'react';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Document } from '../../types/document';
import { DocumentStatus } from './DocumentStatus';

interface DocumentItemProps {
  document: Document;
}

export const DocumentItem: React.FC<DocumentItemProps> = ({ document }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-medium">{document.title}</h3>
            <p className="text-sm text-gray-500">
              {format(document.metadata.uploadedAt, 'PPp')}
            </p>
          </div>
        </div>
        <DocumentStatus status={document.status} />
      </div>
    </div>
  );
};