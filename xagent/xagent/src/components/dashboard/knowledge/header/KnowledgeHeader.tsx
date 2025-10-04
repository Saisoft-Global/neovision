import React from 'react';
import { RefreshCw } from 'lucide-react';

interface KnowledgeHeaderProps {
  onRefresh: () => void;
}

export const KnowledgeHeader: React.FC<KnowledgeHeaderProps> = ({ onRefresh }) => (
  <div className="flex justify-between items-center">
    <h1 className="text-2xl font-bold">Knowledge Base</h1>
    <button
      onClick={onRefresh}
      className="p-2 text-gray-500 hover:text-gray-700 rounded-full"
    >
      <RefreshCw className="w-5 h-5" />
    </button>
  </div>
);