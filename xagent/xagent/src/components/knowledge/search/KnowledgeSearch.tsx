import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useKnowledgeStore } from '../../../store/knowledgeStore';
import { SearchResults } from './SearchResults';

export const KnowledgeSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const { searchKnowledge, isLoading } = useKnowledgeStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await searchKnowledge(query);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search knowledge base..."
          className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-2 top-2 px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <SearchResults />
    </div>
  );
};