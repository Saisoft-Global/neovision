import React from 'react';
import { DocumentUpload } from './DocumentUpload';
import { DocumentList } from './documents';
import { LLMConfig } from './llm/LLMConfig';

export const AdminPanel: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <LLMConfig />
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Document Management</h2>
        <DocumentUpload />
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <DocumentList />
      </div>
    </div>
  );
};