import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Mic,
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  SlidersHorizontal,
  Globe,
  Sun,
  Moon,
  PlusCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  History,
  Trash2,
  Filter,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { historyService } from '../services/historyService';
import { useVoiceTyping } from '../hooks/useVoiceTyping';
import { SearchResultItem, SearchMode, SearchResponse, SearchHistoryItem } from '../types';
import { InstantReaderDrawer } from '../components/InstantReaderDrawer';
import { TuningLens } from '../components/TuningLens';
import { CrawlerModal } from '../components/CrawlerModal';
import { PeopleAlsoAsk } from '../components/PeopleAlsoAsk';
import { SearchHistoryModal } from '../components/SearchHistoryModal';

interface GoogleSearchResultsPageProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const GoogleSearchResultsPage: React.FC<GoogleSearchResultsPageProps> = ({
  isDarkMode,
  onToggleTheme,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryParam = searchParams.get('q') || '';
  const initialPeek = searchParams.get('peek') === '1';

  const [inputQuery, setInputQuery] = useState(queryParam);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'all' | 'nagarpalika' | 'tech'>('all');
  const [showTools, setShowTools] = useState(false);
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const [bm25Weight, setBm25Weight] = useState(0.5);
  const [vectorWeight, setVectorWeight] = useState(0.5);
  const [page, setPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | 'week' | 'year'>('all');

  // Dynamic tab title
  useEffect(() => {
    if (queryParam) {
      document.title = `${queryParam} - Smart Search`;
    } else {
      document.title = 'Smart Search';
    }
  }, [queryParam]);

  // Modals
  const [isCrawlerOpen, setIsCrawlerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copiedCitation, setCopiedCitation] = useState<boolean>(false);

  // Autocomplete & Search History
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>(() => historyService.getHistory());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Keep history in sync
  useEffect(() => {
    const handleUpdate = () => {
      setHistoryItems(historyService.getHistory());
    };
    window.addEventListener('smartsearch_history_updated', handleUpdate);
    return () => window.removeEventListener('smartsearch_history_updated', handleUpdate);
  }, []);

  const saveToHistory = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    historyService.addHistory(clean, mode);
  };

  const removeHistoryItem = (idOrQuery: string, e: React.MouseEvent) => {
    e.stopPropagation();
    historyService.removeHistoryItem(idOrQuery);
    const updated = historyItems.filter((i) => i.id !== idOrQuery && i.query !== idOrQuery);
    setHistoryItems(updated);
    if (updated.length === 0) {
      setShowHistory(false);
    }
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    historyService.clearAll();
    setHistoryItems([]);
    setShowHistory(false);
  };

  // Real-time Voice Typing into search input
  const voiceTyping = useVoiceTyping({
    lang: 'en-IN',
    onTranscriptChange: (text) => {
      setInputQuery(text);
      setShowSuggestions(false);
      setShowHistory(false);
    },
    onFinalTranscript: (text) => {
      setInputQuery(text);
      setSearchParams({ q: text });
    },
  });

  // Synchronize input query when URL changes
  useEffect(() => {
    setInputQuery(queryParam);
    executeSearch(queryParam, mode, 1, activeTab, bm25Weight, vectorWeight);
  }, [queryParam]);

  // Handle click outside search box to close suggestions and history
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!inputQuery.trim() || inputQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const items = await api.getSuggestions(inputQuery.trim());
      setSuggestions(items);
      setShowSuggestions(items.length > 0);
    }, 150);
    return () => clearTimeout(timer);
  }, [inputQuery]);

  // Execute search
  const executeSearch = async (
    q: string,
    searchMode: SearchMode,
    targetPage: number,
    tab: 'all' | 'nagarpalika' | 'tech',
    wBm25: number,
    wVec: number
  ) => {
    if (!q.trim()) return;
    setLoading(true);
    saveToHistory(q.trim());

    let domainFilter: string | undefined = undefined;
    if (tab === 'nagarpalika') domainFilter = 'nagarpalika.gov.in';
    else if (tab === 'tech') domainFilter = undefined;

    try {
      const data = await api.search(
        q.trim(),
        searchMode,
        targetPage,
        10,
        domainFilter,
        wBm25,
        wVec
      );
      setResponse(data);
      setPage(targetPage);

      // If "I'm Feeling Lucky / Instant Peek" requested, auto-open top result
      if (initialPeek && data.results.length > 0) {
        setSelectedItem(data.results[0]);
        setIsDrawerOpen(true);
      }
    } catch {
      // Handled in api fallback
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    setShowSuggestions(false);
    setShowHistory(false);
    setSearchParams({ q: inputQuery.trim() });
  };

  const handleSelectHistory = (term: string) => {
    setInputQuery(term);
    setShowHistory(false);
    setShowSuggestions(false);
    setSearchParams({ q: term });
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleOpenPeek = (item: SearchResultItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
    api.logClick(item.document_id, item.rank);
  };

  // Previous & Next navigation in Peek Drawer
  const currentIndex = response?.results.findIndex((r) => r.id === selectedItem?.id) ?? -1;
  const hasNext = currentIndex >= 0 && currentIndex < (response?.results.length ?? 0) - 1;
  const hasPrev = currentIndex > 0;

  const handleNextPeek = () => {
    if (hasNext && response) {
      setSelectedItem(response.results[currentIndex + 1]);
    }
  };

  const handlePrevPeek = () => {
    if (hasPrev && response) {
      setSelectedItem(response.results[currentIndex - 1]);
    }
  };

  // Topic Knowledge Panel detection
  const getKnowledgePanel = () => {
    const q = queryParam.toLowerCase();
    if (q.includes('nagar') || q.includes('palika') || q.includes('tax') || q.includes('citizen')) {
      return {
        title: 'Nagarpalika Urban Local Governance',
        subtitle: 'Municipal Council & Citizen Portal',
        description:
          'A Nagarpalika (Municipal Council) is an urban local body responsible for municipal administration, urban planning, sanitation, property tax assessment, and public health delivery for urban townships.',
        attributes: [
          { label: 'Administrative Head', value: 'Chief Municipal Officer (CMO)' },
          { label: 'Key Portals', value: 'Property Tax, Birth/Death, Trade NOC' },
          { label: 'Citizen Helpline', value: '1800-MUNICIPAL' },
          { label: 'Governance Layer', value: '74th Constitutional Amendment Act' },
        ],
        officialUrl: 'https://nagarpalika.gov.in/services/citizen-portal',
        domain: 'nagarpalika.gov.in',
      };
    } else if (q.includes('hybrid') || q.includes('rrf') || q.includes('bm25') || q.includes('search')) {
      return {
        title: 'Hybrid Search Architecture',
        subtitle: 'Information Retrieval Technique',
        description:
          'Hybrid search unifies lexical inverted keyword index scoring (Okapi BM25) with high-dimensional dense vector embeddings. Ranked lists are synthesized via Reciprocal Rank Fusion (RRF) for optimal recall and semantic understanding.',
        attributes: [
          { label: 'BM25 Function', value: 'Term Saturation (k1=1.5, b=0.75)' },
          { label: 'Vector Engine', value: 'Qdrant HNSW Graph Cosine' },
          { label: 'Fusion Algorithm', value: 'Reciprocal Rank Fusion (RRF k=60)' },
          { label: 'Performance Gain', value: '+15% to 30% MRR over single model' },
        ],
        officialUrl: 'https://smartsearch.ai/docs/hybrid-search-explained',
        domain: 'smartsearch.ai',
      };
    }

    // Dynamic knowledge panel from top result for any topic
    if (response && response.results.length > 0) {
      const top = response.results[0];
      const isWikiOrKey = top.domain.includes('wikipedia') || top.domain.includes('imdb') || top.domain.includes('rottentomatoes') || top.domain.includes('gov');
      if (isWikiOrKey || top.snippet.length > 40) {
        const cleanTitle = top.title
          .replace(/\s*-\s*Wikipedia.*$/i, '')
          .replace(/\s*-\s*Rotten Tomatoes.*$/i, '')
          .replace(/\s*-\s*IMDb.*$/i, '');
        const cleanDesc = (top.content || top.snippet).replace(/<[^>]+>/g, '').split('\n\n')[0];
        return {
          title: cleanTitle,
          subtitle: top.domain.replace(/^www\./, ''),
          description: cleanDesc.length > 280 ? cleanDesc.slice(0, 280) + '...' : cleanDesc,
          attributes: [
            { label: 'Primary Source', value: top.domain.replace(/^www\./, '') },
            { label: 'Attribution', value: top.author || 'Verified Web Record' },
            { label: 'Search Rank', value: `#${top.rank} Most Relevant` },
            { label: 'Type', value: top.domain.includes('wikipedia') ? 'Encyclopedia' : top.domain.includes('rottentomatoes') ? 'Film Review & Ratings' : 'Live Web Information' },
          ],
          officialUrl: top.url,
          domain: top.domain,
          topItem: top,
        };
      }
    }

    return null;
  };

  const knowledgePanel = getKnowledgePanel();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* Sticky Google-Style Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Brand Logo (Links to Home) */}
          <Link to="/" className="flex items-center space-x-2.5 flex-shrink-0 group">
            <img
              src="/logo-icon.png"
              alt="Smart Search"
              className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.45)] group-hover:scale-105 transition-transform"
            />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white select-none">
              Smart<span className="text-blue-600 dark:text-blue-400">Search</span>
            </span>
          </Link>

          {/* Search Box Container */}
          <div ref={searchBoxRef} className="flex-1 max-w-2xl relative">
            <form onSubmit={handleFormSubmit}>
              <div
                className={`w-full bg-slate-100/90 dark:bg-slate-900 border ${
                  voiceTyping.isListening
                    ? 'border-red-500 shadow-md ring-2 ring-red-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
                } rounded-full px-4 py-2 flex items-center gap-2 shadow-sm transition`}
              >
                {/* Voice Typing Active Wave Indicator */}
                {voiceTyping.isListening && (
                  <div className="flex items-center space-x-0.5 text-red-500 pr-1" title="Voice Typing Active">
                    <span className="w-1 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span
                      style={{ height: `${Math.max(6, (voiceTyping.voiceVolume / 100) * 18)}px` }}
                      className="w-1 bg-red-500 rounded-full transition-all duration-75"
                    />
                    <span className="w-1 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  </div>
                )}

                <input
                  ref={searchInputRef}
                  type="text"
                  value={inputQuery}
                  onFocus={() => {
                    if (!inputQuery.trim() && historyItems.length > 0) {
                      setShowHistory(true);
                      setShowSuggestions(false);
                    }
                  }}
                  onChange={(e) => {
                    setInputQuery(e.target.value);
                    if (!e.target.value.trim() && historyItems.length > 0) {
                      setShowHistory(true);
                      setShowSuggestions(false);
                    } else {
                      setShowHistory(false);
                    }
                  }}
                  placeholder={
                    voiceTyping.isListening
                      ? "🎙️ Listening... Speak now to type"
                      : "Search across documents and web..."
                  }
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                />

                {/* Processing Spinner */}
                {voiceTyping.isProcessing && (
                  <div className="flex items-center space-x-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden sm:inline">Typing...</span>
                  </div>
                )}

                {inputQuery && !voiceTyping.isListening && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputQuery('');
                      searchInputRef.current?.focus();
                      if (historyItems.length > 0) {
                        setShowHistory(true);
                      }
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Voice Typing Mic Toggle */}
                <button
                  type="button"
                  onClick={() => voiceTyping.toggleVoiceTyping(inputQuery)}
                  className={`p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                    voiceTyping.isListening
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/40 ring-2 ring-red-400 scale-105'
                      : voiceTyping.isProcessing
                      ? 'bg-blue-500 text-white'
                      : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title={voiceTyping.isListening ? 'Stop Voice Typing' : 'Start Voice Typing'}
                >
                  {voiceTyping.isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : voiceTyping.isListening ? (
                    <Mic className="w-3.5 h-3.5 animate-bounce" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="submit"
                  className="p-1.5 rounded-full text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 transition"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Recent Search History Dropdown */}
            {showHistory && historyItems.length > 0 && !inputQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 py-1 animate-in fade-in duration-150">
                <div className="px-4 py-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                    <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Recent Searches</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setShowHistory(false);
                        setIsHistoryOpen(true);
                      }}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                    >
                      Manage
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      onClick={clearAllHistory}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/40 max-h-64 overflow-y-auto">
                  {historyItems.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectHistory(item.query)}
                      className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between cursor-pointer group transition"
                    >
                      <div className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate flex-1 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <span className="truncate">{item.query}</span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {historyService.formatTimestamp(item.timestamp)}
                        </span>
                        <button
                          onClick={(e) => removeHistoryItem(item.id, e)}
                          className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
                          title="Remove from history"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 text-center">
                  <button
                    onClick={() => {
                      setShowHistory(false);
                      setIsHistoryOpen(true);
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center space-x-1 mx-auto py-0.5"
                  >
                    <History className="w-3 h-3" />
                    <span>View & manage all history ({historyItems.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Typeahead Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 py-2 animate-in fade-in duration-150">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setInputQuery(s);
                      setShowSuggestions(false);
                      setSearchParams({ q: s });
                    }}
                    className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Search History Button */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              title="Search History & Activity"
            >
              <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>

            {/* Crawler Button */}
            <button
              onClick={() => setIsCrawlerOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              title="Index new document or start crawler"
            >
              <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Google-Style Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs border-t border-slate-200 dark:border-slate-900 overflow-x-auto transition-colors">
          <div className="flex items-center space-x-1 sm:space-x-6 py-2">
            <button
              onClick={() => {
                setActiveTab('all');
                executeSearch(queryParam, mode, 1, 'all', bm25Weight, vectorWeight);
              }}
              className={`pb-2 pt-1 font-medium transition border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'all'
                  ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>All</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('nagarpalika');
                executeSearch(queryParam, mode, 1, 'nagarpalika', bm25Weight, vectorWeight);
              }}
              className={`pb-2 pt-1 font-medium transition border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'nagarpalika'
                  ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Municipal / Nagarpalika</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tech');
                executeSearch(queryParam, mode, 1, 'tech', bm25Weight, vectorWeight);
              }}
              className={`pb-2 pt-1 font-medium transition border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'tech'
                  ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              <span>Technical & AI</span>
            </button>
          </div>

          {/* Tools / Glass-Box Tuner Toggle */}
          <button
            onClick={() => setShowTools(!showTools)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              showTools
                ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tools & Tuner</span>
          </button>
        </div>

        {/* Optional Google-Style Time & Sort Filter Bar */}
        {showTools && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 border-t border-slate-200 dark:border-slate-900/60 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-center gap-3 text-xs transition-colors">
            <span className="text-slate-500 font-medium">Filter by Time:</span>
            {(['all', '24h', 'week', 'year'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-2 py-0.5 rounded-md border text-[11px] transition ${
                  timeFilter === tf
                    ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-transparent'
                }`}
              >
                {tf === 'all' ? 'Any time' : tf === '24h' ? 'Past 24 hours' : tf === 'week' ? 'Past week' : 'Past year'}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex-1 w-full">
        {/* Tuning Lens Drawer (when Tools clicked) */}
        <TuningLens
          isOpen={showTools}
          mode={mode}
          onModeChange={(newMode) => {
            setMode(newMode);
            executeSearch(queryParam, newMode, 1, activeTab, bm25Weight, vectorWeight);
          }}
          bm25Weight={bm25Weight}
          vectorWeight={vectorWeight}
          onWeightsChange={(w1, w2) => {
            setBm25Weight(w1);
            setVectorWeight(w2);
            executeSearch(queryParam, mode, 1, activeTab, w1, w2);
          }}
          onReset={() => {
            setMode('hybrid');
            setBm25Weight(0.5);
            setVectorWeight(0.5);
            executeSearch(queryParam, 'hybrid', 1, activeTab, 0.5, 0.5);
          }}
        />

        {/* Search Statistics Line */}
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-5 flex items-center justify-between">
          <div>
            About <span className="font-semibold text-slate-800 dark:text-slate-200">{response?.total_hits ?? 0}</span> results{' '}
            <span className="text-slate-400 dark:text-slate-500">
              ({((response?.execution_time_ms ?? 14) / 1000).toFixed(2)} seconds)
            </span>
            {response?.fallback_used && (
              <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono border border-blue-500/20">
                {response.fallback_used}
              </span>
            )}
          </div>

          <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
            Click snippet or <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono">Quick Peek</kbd> for Instant Reader View
          </span>
        </div>

        {/* Two-Column Grid: Results on Left, Knowledge Panel on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Result Feed */}
          <div className="lg:col-span-8 space-y-5">
            {loading ? (
              <div className="space-y-6 animate-pulse py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2.5">
                    <div className="h-3 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-full bg-slate-200/70 dark:bg-slate-800/60 rounded" />
                    <div className="h-3.5 w-5/6 bg-slate-200/70 dark:bg-slate-800/60 rounded" />
                  </div>
                ))}
              </div>
            ) : response && response.results.length > 0 ? (
              response.results.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <article
                    className="group rounded-2xl p-4 -mx-4 hover:bg-slate-100/80 dark:hover:bg-slate-900/50 transition duration-150 border border-transparent hover:border-slate-200 dark:hover:border-slate-800/80"
                  >
                    {/* Google-Style Breadcrumb with Real Favicon & SSL Badge */}
                    <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-mono">
                      <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=64`}
                          alt=""
                          className="w-3.5 h-3.5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.domain}</span>
                      <ShieldCheck className="w-3 h-3 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-400 dark:text-slate-600">›</span>
                      <span className="text-slate-500 truncate max-w-[220px]">
                        {item.url.replace(/^https?:\/\/[^/]+/, '') || 'index'}
                      </span>
                    </div>

                    {/* Document Title with direct link */}
                    <h2 className="text-lg sm:text-xl font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors mb-1.5 leading-snug">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => api.logClick(item.document_id, item.rank)}
                        className="hover:underline focus:outline-none"
                      >
                        <span dangerouslySetInnerHTML={{ __html: item.title }} />
                      </a>
                    </h2>

                    {/* Snippet with Search Term Highlights - clicking opens Reader Peek */}
                    <div
                      onClick={() => handleOpenPeek(item)}
                      className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-3 line-clamp-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition"
                      title="Click to open distraction-free Reader View"
                      dangerouslySetInnerHTML={{ __html: item.snippet }}
                    />

                    {/* Sitelinks / Deep section pills for Top Result (#1) */}
                    {idx === 0 && (
                      <div className="mb-3.5 flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mr-1">
                          Sections:
                        </span>
                        {item.domain.includes('rottentomatoes') ? (
                          <>
                            <button
                              onClick={() => handleOpenPeek(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition flex items-center space-x-1"
                            >
                              <span>🍅 Certified Fresh</span>
                            </button>
                            <button
                              onClick={() => handleOpenPeek(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition flex items-center space-x-1"
                            >
                              <span>🍿 Popcornmeter</span>
                            </button>
                            <button
                              onClick={() => handleOpenPeek(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition flex items-center space-x-1"
                            >
                              <span>🎬 2026 Releases</span>
                            </button>
                          </>
                        ) : item.domain.includes('wikipedia') ? (
                          <>
                            <button
                              onClick={() => handleOpenPeek(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition"
                            >
                              <span>📜 Overview</span>
                            </button>
                            <button
                              onClick={() => handleOpenPeek(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition"
                            >
                              <span>🏛️ History</span>
                            </button>
                            <button
                              onClick={() => handleOpenPeek(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition"
                            >
                              <span>📊 Key Statistics</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenPeek(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition"
                            >
                              <span>📖 Full Overview</span>
                            </button>
                            <button
                              onClick={() => handleOpenPeek(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition"
                            >
                              <span>⚡ Key Insights</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Action Bar with UNIQUE TRICK: Quick Peek */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* The Distinguishing Superpower Button: Quick Peek */}
                      <button
                        onClick={() => handleOpenPeek(item)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-600/15 hover:bg-blue-100 dark:hover:bg-blue-600/25 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-500/30 transition font-medium shadow-sm"
                        title="Read entire document without leaving the search page"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Quick Peek</span>
                      </button>

                      {/* Copy Link */}
                      <button
                        onClick={() => handleCopy(item.url)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        title="Copy URL"
                      >
                        {copiedUrl === item.url ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* External Link */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {/* Algorithmic Relevance Pill */}
                      <div className="ml-auto flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                          Rank #{item.rank}
                        </span>
                        {item.bm25_score && (
                          <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400/80">
                            BM25: {item.bm25_score.toFixed(1)}
                          </span>
                        )}
                        {item.vector_score && (
                          <span className="hidden sm:inline text-purple-600 dark:text-purple-400/80">
                            Cosine: {item.vector_score.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>

                  {/* Insert "People Also Ask" Interactive Accordion right after Result #1 */}
                  {idx === 0 && (
                    <PeopleAlsoAsk
                      query={queryParam}
                      topResult={item}
                      onOpenReader={handleOpenPeek}
                    />
                  )}
                </React.Fragment>
              ))
            ) : (
              <div className="py-12 text-center space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No results found for "{queryParam}"</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Try checking your spelling, using broader search terms, or clicking "Index New URL" to add this topic to the search corpus.
                </p>
              </div>
            )}

            {/* Pagination Controls */}
            {response && response.total_hits > 10 && (
              <div className="pt-8 border-t border-slate-200 dark:border-slate-900 flex items-center justify-center space-x-2 text-sm">
                <button
                  disabled={page <= 1}
                  onClick={() => executeSearch(queryParam, mode, page - 1, activeTab, bm25Weight, vectorWeight)}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-slate-500 dark:text-slate-400 font-mono text-xs">
                  Page {page} of {Math.ceil(response.total_hits / 10)}
                </span>
                <button
                  disabled={page * 10 >= response.total_hits}
                  onClick={() => executeSearch(queryParam, mode, page + 1, activeTab, bm25Weight, vectorWeight)}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Google-Style Knowledge Panel */}
          {knowledgePanel && (
            <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
              <aside className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                      Knowledge Graph
                    </span>
                    <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700/60 flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${knowledgePanel.domain}&sz=64`}
                        alt=""
                        className="w-3.5 h-3.5 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{knowledgePanel.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{knowledgePanel.subtitle}</p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {knowledgePanel.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                  {knowledgePanel.attributes.map((attr, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">{attr.label}:</span>
                      <span className="text-slate-800 dark:text-slate-200 text-right font-medium">{attr.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (response && response.results.length > 0) {
                        handleOpenPeek(response.results[0]);
                      }
                    }}
                    className="inline-flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Quick Peek</span>
                  </button>

                  <a
                    href={knowledgePanel.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition"
                  >
                    <span>Visit Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      {/* Google-Style Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-slate-100/90 dark:bg-slate-950/90 text-xs text-slate-500 dark:text-slate-400 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <span>© 2026 SmartSearch • Hybrid Information Retrieval Engine</span>
          <div className="flex items-center space-x-4">
            <span className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">Help</span>
            <span className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">Send feedback</span>
            <span className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">Privacy</span>
            <span className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">Terms</span>
          </div>
        </div>
      </footer>

      {/* THE UNIQUE TRICK: Instant Reader Peek Drawer */}
      <InstantReaderDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNext={handleNextPeek}
        onPrev={handlePrevPeek}
        hasNext={hasNext}
        hasPrev={hasPrev}
        activeQuery={queryParam}
        currentIndex={currentIndex}
        totalResults={response?.results.length ?? 0}
      />

      {/* Crawler & URL Ingestion Modal */}
      <CrawlerModal
        isOpen={isCrawlerOpen}
        onClose={() => setIsCrawlerOpen(false)}
        onSuccess={() => {
          executeSearch(queryParam, mode, 1, activeTab, bm25Weight, vectorWeight);
        }}
      />

      {/* Search History & Activity Modal */}
      <SearchHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectQuery={(selected) => {
          setInputQuery(selected);
          setSearchParams({ q: selected });
        }}
      />
    </div>
  );
};
