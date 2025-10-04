import React from 'react';
import { DocumentCard } from './DocumentCard';
import { EmptyState } from './EmptyState';
import { useDocumentStore } from '../../store/documentStore';
import type { Document } from '../../types/document';

export const DocumentGrid: React.FC = () => {
  const { documents } = useDocumentStore();

  const handleSelectDocument = (doc: Document) => {
    // Implement document selection logic
    console.log('Selected document:', doc);
  };

  if (!documents.length) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onSelect={handleSelectDocument}
        />
      ))}
    </div>
  );
};