import React from 'react';
import { Plus, X, Database } from 'lucide-react';
import type { AgentKnowledgeBase } from '../../types/agent-framework';

interface KnowledgeBaseSelectorProps {
  knowledgeBases: AgentKnowledgeBase[];
  onChange: (knowledgeBases: AgentKnowledgeBase[]) => void;
}

export const KnowledgeBaseSelector: React.FC<KnowledgeBaseSelectorProps> = ({
  knowledgeBases,
  onChange,
}) => {
  const addKnowledgeBase = () => {
    onChange([
      ...knowledgeBases,
      {
        name: '',
        type: 'pinecone',
        connection_config: {},
      },
    ]);
  };

  const removeKnowledgeBase = (index: number) => {
    onChange(knowledgeBases.filter((_, i) => i !== index));
  };

  const updateKnowledgeBase = (index: number, updates: Partial<AgentKnowledgeBase>) => {
    onChange(
      knowledgeBases.map((kb, i) =>
        i === index ? { ...kb, ...updates } : kb
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Knowledge Bases</h2>
        <button
          onClick={addKnowledgeBase}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge Base</span>
        </button>
      </div>

      <div className="space-y-4">
        {knowledgeBases.map((kb, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={kb.name}
                  onChange={(e) => updateKnowledgeBase(index, { name: e.target.value })}
                  placeholder="Knowledge base name"
                  className="px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => removeKnowledgeBase(index)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <select
                value={kb.type}
                onChange={(e) => updateKnowledgeBase(index, { type: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pinecone">Pinecone Vector DB</option>
                <option value="neo4j">Neo4j Graph DB</option>
                <option value="postgres">PostgreSQL</option>
              </select>

              <textarea
                value={JSON.stringify(kb.connection_config, null, 2)}
                onChange={(e) => updateKnowledgeBase(index, {
                  connection_config: JSON.parse(e.target.value),
                })}
                placeholder="Connection configuration (JSON)"
                className="w-full h-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          </div>
        ))}

        {knowledgeBases.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No knowledge bases configured. Click "Add Knowledge Base" to get started.
          </div>
        )}
      </div>
    </div>
  );
};