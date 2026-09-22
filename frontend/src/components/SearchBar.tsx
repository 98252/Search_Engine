import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, SlidersHorizontal, ArrowRight, Zap, Brain, AlignLeft } from 'lucide-react';
import { SearchMode } from '../types';
import { api } from '../services/api';

interface SearchBarProps {
  onSearch: (query: string, mode: SearchMode, domain?: string) => void;
  isLoading: boolean;
  initialQuery?: string;
  initialMode?: SearchMode;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading,
  initialQuery = '',
  initialMode = 'hybrid',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [domainFilter, setDomainFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: '/' focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch typeahead suggestions with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const items = await api.getSuggestions(query);
      setSuggestions(items);
      setShowSuggestions(items.length > 0);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    onSearch(query.trim(), mode, domainFilter.trim() || undefined);
  };

  const handleSelectSuggestion = (item: string) => {
    setQuery(item);
    setShowSuggestions(false);
    onSearch(item, mode, domainFilter.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Search Mode Pill Switcher */}
      <div className="flex items-center justify-center space-x-2 mb-3">
        <button
          type="button"
          onClick={() => setMode('hybrid')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            mode === 'hybrid'
              ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20 ring-1 ring-white/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>Hybrid (BM25 + RRF)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('semantic')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            mode === 'semantic'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 ring-1 ring-white/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-purple-300" />
          <span>Semantic (Qdrant Vector)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('keyword')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            mode === 'keyword'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-teal-500/20 ring-1 ring-white/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <AlignLeft className="w-3.5 h-3.5 text-emerald-300" />
          <span>Keyword (OpenSearch BM25)</span>
        </button>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-xl shadow-black/40 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
          <div className="pl-4 text-slate-400">
            <Search className="w-5 h-5 text-brand-400" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents, concepts, or technical terms... (Press '/' to focus)"
            className="w-full py-4 pl-3 pr-24 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-base sm:text-lg"
          />

          <div className="absolute right-3 flex items-center space-x-2">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
                className="text-slate-400 hover:text-slate-200 p-1 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              title="Toggle Domain Filters"
              className={`p-1.5 rounded-lg border transition ${
                showFilters || domainFilter
                  ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl shadow-md transition-all flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-20"
          >
            <div className="p-1.5">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(item)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition ${
                    idx === activeSuggestionIndex
                      ? 'bg-brand-600/30 text-brand-300 font-medium'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                    <span>{item}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Search</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Domain Filter Bar */}
        {showFilters && (
          <div className="mt-2.5 p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center space-x-3 text-xs">
            <span className="text-slate-400 font-medium">Domain Filter:</span>
            <input
              type="text"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              placeholder="e.g. smartsearch.ai or wikipedia.org"
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            {domainFilter && (
              <button
                type="button"
                onClick={() => setDomainFilter('')}
                className="text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
