import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, Tag, Calendar, Database } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  similarity_score?: number;
}

interface KnowledgeBaseProps {
  onAddDocument?: (documentId: string) => void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ onAddDocument }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: [] as string[]
  });

  const categories = [
    'all',
    'general',
    'invoices',
    'contracts',
    'reports',
    'procedures',
    'faq'
  ];

  const searchKnowledgeBase = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch('/api/ai/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          filters: selectedCategory !== 'all' ? { category: selectedCategory } : {},
          limit: 20
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Error searching knowledge base:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addToKnowledgeBase = async () => {
    if (!newItem.title.trim() || !newItem.content.trim()) return;

    try {
      const response = await fetch('/api/ai/knowledge/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: `kb_${Date.now()}`,
          title: newItem.title,
          content: newItem.content,
          category: newItem.category,
          tags: newItem.tags
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setNewItem({ title: '', content: '', category: 'general', tags: [] });
        setShowAddForm(false);
        // Refresh search results
        if (searchQuery.trim()) {
          searchKnowledgeBase();
        }
      }
    } catch (error) {
      console.error('Error adding to knowledge base:', error);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !newItem.tags.includes(tag.trim())) {
      setNewItem(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewItem(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchKnowledgeBase();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900">Knowledge Base</h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          Add Knowledge
        </button>
      </div>

      {/* Search */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {isSearching && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Searching...
            </div>
          </div>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">Add to Knowledge Base</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter title..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={newItem.content}
                onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter content..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.filter(cat => cat !== 'all').map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {newItem.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add tag and press Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={addToKnowledgeBase}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add to Knowledge Base
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Search Results ({searchResults.length})
          </h3>
          <div className="grid gap-4">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  {item.similarity_score && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {Math.round(item.similarity_score * 100)}% match
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                  {item.content}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span className="capitalize">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span>Tags: {item.tags.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No results found for "{searchQuery}"</p>
          <p className="text-sm text-gray-400 mt-1">
            Try different keywords or add new knowledge to the base
          </p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
