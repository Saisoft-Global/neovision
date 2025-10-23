/**
 * Enhanced Search Bar with Instant Results
 */
import { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../utils/cn';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  showResults?: boolean;
  results?: any[];
  isSearching?: boolean;
  className?: string;
}

export const SearchBar = ({
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
  showResults = false,
  results = [],
  isSearching = false,
  className
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    if (debouncedQuery) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-12 pr-12 py-3 rounded-xl',
            'bg-white/90 backdrop-blur-sm border-2 border-white/20',
            'focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20',
            'transition-all duration-300 outline-none',
            'text-gray-800 placeholder-gray-400'
          )}
        />
        
        {/* Clear/Loading Button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          ) : query ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && isFocused && query && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-card max-h-96 overflow-y-auto z-50 animate-in slide-in-from-top-2 duration-200">
          {results.length > 0 ? (
            <div className="p-2">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-white"
                >
                  {result.title || result.name || result.content}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-white/60">
              {isSearching ? 'Searching...' : 'No results found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
