import React from 'react';
import { DocumentsContainer } from '../documents/DocumentsContainer';
import { FileText } from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">Documents</h1>
      </div>
      <p className="text-white/60 text-sm md:text-base">
        📄 Manage and process your documents with AI
      </p>
      <DocumentsContainer />
    </div>
  );
};
