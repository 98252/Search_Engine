import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Mic,
  Scan,
  X,
  Sparkles,
  Database,
  ArrowRight,
  Sun,
  Moon,
  Server,
  Command,
  History,
  Clock,
  Trash2,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { historyService } from '../services/historyService';
import { useVoiceTyping } from '../hooks/useVoiceTyping';
import { CrawlerModal } from '../components/CrawlerModal';
import { AuthModal } from '../components/AuthModal';
import { SearchHistoryModal } from '../components/SearchHistoryModal';
import { User, SearchMode, SearchHistoryItem } from '../types';

interface GoogleSearchHomePageProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const GoogleSearchHomePage: React.FC<GoogleSearchHomePageProps> = ({
  isDarkMode,
  onToggleTheme,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const selectedMode: SearchMode = 'hybrid';

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Search History State
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>(() => historyService.getHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Modals
  const [isCrawlerOpen, setIsCrawlerOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Real-time Voice Typing
  const voiceTyping = useVoiceTyping({
    lang: 'en-IN',
    onTranscriptChange: (text) => {
      setQuery(text);
      setShowSuggestions(false);
      setShowHistory(false);
    },
    onFinalTranscript: (text) => {
      setQuery(text);
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Set document title and retrieve user
  useEffect(() => {
    document.title = 'Smart Search';
    api.getMe().then((u) => {
      if (u) setCurrentUser(u);
    });
  }, []);

  // Listen for history updates
  useEffect(() => {
    const handleHistoryUpdate = () => {
      setHistoryItems(historyService.getHistory());
    };
    window.addEventListener('smartsearch_history_updated', handleHistoryUpdate);
    return () => window.removeEventListener('smartsearch_history_updated', handleHistoryUpdate);
  }, []);

  // Keyboard shortcut '/' or 'Ctrl+K' focuses search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        if (!query.trim() && historyItems.length > 0) {
          setShowHistory(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, historyItems.length]);

  // Fetch typeahead suggestions on typing
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const items = await api.getSuggestions(query.trim());
      setSuggestions(items);
      setShowSuggestions(items.length > 0);
      setShowHistory(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside closes dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string, instantPeek: boolean = false) => {
    const q = searchQuery.trim();
    if (!q) return;
    setShowSuggestions(false);
    setShowHistory(false);
    historyService.addHistory(q, selectedMode);
    navigate(
      `/search?q=${encodeURIComponent(q)}&mode=${selectedMode}${instantPeek ? '&peek=1' : ''}`
    );
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    historyService.removeHistoryItem(id);
    const updated = historyItems.filter((i) => i.id !== id);
    setHistoryItems(updated);
    if (updated.length === 0) {
      setShowHistory(false);
    }
  };

  const handleClearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    historyService.clearAll();
    setHistoryItems([]);
    setShowHistory(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          handleSearch(suggestions[activeSuggestionIndex]);
        } else {
          handleSearch(query);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(query);
    } else if (e.key === 'Escape') {
      setShowHistory(false);
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`min-h-screen relative flex flex-col justify-between overflow-x-hidden ${
      isDarkMode ? 'dark bg-[#07090e] text-slate-100' : 'bg-slate-50 text-slate-900'
    } selection:bg-blue-500 selection:text-white transition-colors duration-200`}>
      {/* Background Architectural Grid & Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Fine-grained dot matrix */}
        <div className="absolute inset-0 bg-dot-grid opacity-40 dark:opacity-35 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,#000_70%,transparent_100%)]" />

        {/* Ambient atmospheric lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[450px] bg-gradient-to-tr from-blue-500/10 dark:from-blue-600/15 via-indigo-500/8 dark:via-indigo-500/10 to-cyan-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 px-6 sm:px-12 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] backdrop-blur-md bg-white/70 dark:bg-[#07090e]/70 transition-colors">
        {/* Logo & Version Chip */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="/logo-icon.png"
            alt="Smart Search Logo"
            className="w-9 h-9 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.45)] hover:scale-105 transition-transform"
          />
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Smart<span className="text-blue-500 dark:text-blue-400">Search</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
              v2.4 AI
            </span>
          </div>
        </div>

        {/* Center Live Engine Status Bar */}
        <div className="hidden lg:flex items-center space-x-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Hybrid RRF Engine Active</span>
          </div>

          <button
            onClick={() => setIsCrawlerOpen(true)}
            className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <Database className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>Scrapy Crawler</span>
          </button>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <Server className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>FastAPI Docs</span>
          </a>

          <Link to="/about" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
            Architecture
          </Link>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          {/* Search History Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1.5"
            title="Search History & Activity"
          >
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs hidden sm:inline font-medium">History</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* User Account / Sign In */}
          {currentUser ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span className="font-medium truncate max-w-[130px]">{currentUser.email}</span>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 transition shadow-sm"
            >
              Sign In
            </button>
          )}

          {/* Get Started / Index URL */}
          <button
            onClick={() => setIsCrawlerOpen(true)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition flex items-center space-x-1.5"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Index URL</span>
          </button>
        </div>
      </header>

      {/* Main Search Centerpiece */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-12 pb-16 w-full max-w-5xl mx-auto">
        {/* System Capability Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 mb-6 shadow-sm">
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-semibold uppercase tracking-wider">
            Enterprise
          </span>
          <span>OpenSearch BM25 + Qdrant Vector Cosine Similarity</span>
        </div>

        {/* Main Logo & Emblem Centerpiece */}
        <div className="flex flex-col items-center justify-center text-center select-none mb-4">
          <div className="relative mb-3 group cursor-pointer" onClick={() => navigate('/')}>
            {/* Ambient blue glow behind emblem */}
            <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-500/25 blur-2xl rounded-full scale-110 group-hover:scale-125 transition-transform duration-500" />
            <img
              src="/logo-icon.png"
              alt="Smart Search Emblem"
              className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 object-contain drop-shadow-[0_12px_28px_rgba(37,99,235,0.35)] dark:drop-shadow-[0_12px_28px_rgba(37,99,235,0.45)] hover:scale-105 transition-transform duration-300"
            />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            <span className="text-slate-900 dark:text-white">Smart</span>
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 dark:from-blue-400 dark:via-blue-500 dark:to-cyan-400 bg-clip-text text-transparent">
              Search
            </span>
          </h1>

          <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-slate-500 dark:text-slate-300 mt-2.5">
            Search Smarter, Discover More
          </p>

          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-2 max-w-lg mx-auto font-normal leading-relaxed">
            Instant unified retrieval fusing lexical keyword precision with deep semantic vector understanding.
          </p>
        </div>

        {/* The Search Console Input Box */}
        <div className="w-full max-w-3xl mt-8 relative" ref={dropdownRef}>
          <div
            className={`w-full bg-white dark:bg-slate-900/90 backdrop-blur-2xl border ${
              voiceTyping.isListening
                ? 'rounded-2xl border-red-500 shadow-2xl ring-4 ring-red-500/20'
                : (showSuggestions && suggestions.length > 0) || (showHistory && !query.trim() && historyItems.length > 0)
                ? 'rounded-t-2xl border-blue-500 shadow-2xl'
                : 'rounded-2xl border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-lg dark:shadow-xl'
            } focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 px-5 py-3.5 flex items-center gap-3 transition-all duration-200`}
          >
            {/* Search Icon or Live Audio Voice Typing Animation */}
            {voiceTyping.isListening ? (
              <div className="flex items-center space-x-1 flex-shrink-0 text-red-500 py-1" title="Voice Typing Active">
                <span className="w-1.5 h-3 bg-red-500 rounded-full animate-pulse" />
                <span
                  style={{ height: `${Math.max(10, (voiceTyping.voiceVolume / 100) * 26)}px` }}
                  className="w-1.5 bg-red-500 rounded-full transition-all duration-75"
                />
                <span className="w-1.5 h-3 bg-red-500 rounded-full animate-pulse" />
              </div>
            ) : (
              <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            )}

            {/* Main Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={() => {
                if (!query.trim() && historyItems.length > 0) {
                  setShowHistory(true);
                  setShowSuggestions(false);
                }
              }}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveSuggestionIndex(-1);
                if (!e.target.value.trim() && historyItems.length > 0) {
                  setShowHistory(true);
                  setShowSuggestions(false);
                } else {
                  setShowHistory(false);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                voiceTyping.isListening
                  ? "🎙️ Listening... Speak now to type directly into search"
                  : "Search municipal documents, public records, technical research, or ask anything..."
              }
              className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-sm sm:text-base font-normal"
              autoFocus
            />

            {/* Voice Typing Active Live Badge */}
            {voiceTyping.isListening && (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-[11px] font-semibold text-red-600 dark:text-red-400 animate-pulse flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Voice Typing</span>
              </div>
            )}

            {/* Voice Processing Spinner */}
            {voiceTyping.isProcessing && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-[11px] font-medium text-blue-600 dark:text-blue-400 flex-shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Typing voice...</span>
              </div>
            )}

            {/* Clear Input */}
            {query && !voiceTyping.isListening && (
              <button
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                  if (historyItems.length > 0) {
                    setShowHistory(true);
                  }
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Keyboard shortcut indicator */}
            {!query && !voiceTyping.isListening && (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
                <Command className="w-3 h-3" />
                <span>K</span>
              </kbd>
            )}

            {/* Microphone Voice Typing Button */}
            <button
              type="button"
              onClick={() => voiceTyping.toggleVoiceTyping(query)}
              className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                voiceTyping.isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40 ring-4 ring-red-500/20 scale-105'
                  : voiceTyping.isProcessing
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={voiceTyping.isListening ? 'Stop Voice Typing' : 'Start Voice Typing'}
            >
              {voiceTyping.isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : voiceTyping.isListening ? (
                <Mic className="w-4 h-4 animate-bounce" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => {
                if (voiceTyping.isListening) {
                  voiceTyping.stopListening();
                }
                handleSearch(query);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center space-x-1.5 flex-shrink-0"
            >
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recent Searches Dropdown on Focus */}
          {showHistory && !query.trim() && historyItems.length > 0 && (
            <div className="absolute left-0 right-0 top-full bg-white dark:bg-slate-900 border-x border-b border-blue-500 rounded-b-2xl shadow-2xl overflow-hidden z-30 animate-in fade-in duration-150">
              <div className="px-5 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
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
                    Manage history
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    onClick={handleClearAllHistory}
                    className="hover:text-red-500 dark:hover:text-red-400 transition"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="py-1 divide-y divide-slate-100 dark:divide-slate-800/40 max-h-72 overflow-y-auto">
                {historyItems.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={() => handleSearch(item.query)}
                    className="px-5 py-2.5 flex items-center justify-between cursor-pointer group text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <History className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                      <span className="text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate font-medium">
                        {item.query}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        {historyService.formatTimestamp(item.timestamp)}
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Delete from history"
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
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center space-x-1 mx-auto py-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View all search activity ({historyItems.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full bg-white dark:bg-slate-900 border-x border-b border-blue-500/80 rounded-b-2xl shadow-2xl overflow-hidden z-30">
              <div className="py-2 divide-y divide-slate-100 dark:divide-slate-800/40">
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onMouseDown={() => handleSearch(item)}
                    onMouseEnter={() => setActiveSuggestionIndex(idx)}
                    className={`px-5 py-2.5 flex items-center justify-between cursor-pointer text-sm transition ${
                      idx === activeSuggestionIndex
                        ? 'bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium truncate">{item}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Suggested</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clean Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => handleSearch(query)}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
          >
            Smart Search
          </button>
          <button
            onClick={() => handleSearch(query || 'Nagarpalika Citizen Services', true)}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition shadow-sm flex items-center space-x-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>I'm Feeling Lucky</span>
          </button>
        </div>
      </main>

      {/* Enterprise Footer */}
      <footer className="relative z-20 border-t border-slate-200 dark:border-white/[0.06] bg-slate-100/90 dark:bg-[#05070c] text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="Smart Search" className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]" />
            <div className="flex items-baseline space-x-2">
              <span className="font-semibold text-slate-900 dark:text-white">SmartSearch</span>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <span className="text-slate-500 dark:text-slate-400">Search Smarter, Discover More</span>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-xs text-slate-500 dark:text-slate-400">
            <Link to="/about" className="hover:text-slate-900 dark:hover:text-white transition">Architecture</Link>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-slate-900 dark:hover:text-white transition">REST APIs</a>
            <button onClick={() => setIsCrawlerOpen(true)} className="hover:text-slate-900 dark:hover:text-white transition">Crawler Ingestion</button>
            <Link to="/diagnostics" className="hover:text-slate-900 dark:hover:text-white transition">Diagnostics</Link>
          </div>

          <div className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">
            SQLite • Qdrant • OpenSearch BM25 • Scrapy
          </div>
        </div>
      </footer>

      {/* Crawler / URL Ingestion Modal */}
      <CrawlerModal
        isOpen={isCrawlerOpen}
        onClose={() => setIsCrawlerOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />

      {/* Search History & Activity Modal */}
      <SearchHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectQuery={(selectedQuery) => {
          setQuery(selectedQuery);
          handleSearch(selectedQuery);
        }}
      />
    </div>
  );
};
