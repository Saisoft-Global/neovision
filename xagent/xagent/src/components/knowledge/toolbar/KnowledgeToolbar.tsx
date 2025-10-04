import React, { useState } from 'react';
import { Plus, RefreshCw, Settings } from 'lucide-react';
import { useKnowledgeStore } from '../../../store/knowledgeStore';
import { AddKnowledgeModal } from '../modals/AddKnowledgeModal';

export const KnowledgeToolbar: React.FC = () => {
  const { fetchDocuments, isLoading } = useKnowledgeStore();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchDocuments}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Knowledge</span>
          </button>

          <button
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddKnowledgeModal onClose={() => setShowAddModal(false)} />
      )}
    </>
  );
};