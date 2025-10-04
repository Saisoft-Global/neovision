import React from 'react';
import { FileText } from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-lg">
      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900">No documents yet</h3>
      <p className="mt-2 text-sm text-gray-500">
        Upload documents to get started
      </p>
    </div>
  );
};