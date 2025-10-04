import React from 'react';
import { FileText, Loader, CheckCircle, XCircle } from 'lucide-react';
import { useDocumentStore } from '../../store/documentStore';
import { format } from 'date-fns';
import { DocumentItem } from './DocumentItem';
import { EmptyState } from './EmptyState';
import type { Document } from '../../types/document';

export const DocumentList: React.FC = () => {
  const { documents } = useDocumentStore();

  if (!documents.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <DocumentItem key={doc.id} document={doc} />
      ))}
    </div>
  );
};