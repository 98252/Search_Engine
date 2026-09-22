import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Trash2,
  X,
  Clock,
  ArrowUpRight,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { SearchHistoryItem } from '../types';
import { historyService } from '../services/historyService';

interface SearchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
}

export const SearchHistoryModal: React.FC<SearchHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectQuery,
}) => {
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Load history whenever opened or event fires
  const refreshHistory = () => {
    setHistoryItems(historyService.getHistory());
  };

  useEffect(() => {
    if (isOpen) {
      refreshHistory();
      setFilterQuery('');
      setConfirmClearAll(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      refreshHistory();
    };
    window.addEventListener('smartsearch_history_updated', handleUpdate);
    return () => window.removeEventListener('smartsearch_history_updated', handleUpdate);
  }, []);

  // Filter items by user input
  const filteredItems = useMemo(() => {
    if (!filterQuery.trim()) return historyItems;
    const term = filterQuery.toLowerCase();
    return historyItems.filter((item) => item.query.toLowerCase().includes(term));
  }, [historyItems, filterQuery]);

  // Group items by time period
  const groupedPeriods = useMemo(() => {
    return historyService.groupByPeriod(filteredItems);
  }, [filteredItems]);

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    historyService.removeHistoryItem(id);
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    historyService.clearAll();
    setHistoryItems([]);
    setConfirmClearAll(false);
  };

  const handleCopyQuery = (id: string, queryText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(queryText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Search History & Activity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  View, search, or delete earlier queries from your device.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Filter Input & Quick Actions */}
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter past searches..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {historyItems.length > 0 && (
              <button
                onClick={handleClearAll}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                  confirmClearAll
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/20 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700/60'
                }`}
                title={confirmClearAll ? 'Click again to permanently delete all' : 'Clear all search history'}
              >
                {confirmClearAll ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Confirm Clear All?</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear All</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* History List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {historyItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 mx-auto flex items-center justify-center text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No search history recorded
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Any topic you search for using Smart Search will automatically be logged here for quick retrieval.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No past searches match "{filterQuery}"
              </p>
              <button
                onClick={() => setFilterQuery('')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            groupedPeriods.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500 px-1">
                  <span>{group.label}</span>
                  <span className="text-[11px] font-mono">{group.items.length} searches</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectQuery(item.query);
                        onClose();
                      }}
                      className="p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                            {item.query}
                          </p>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                            <span>{historyService.formatTimestamp(item.timestamp)}</span>
                            {item.mode && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{item.mode} Mode</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons (Copy, Re-Search, Delete) */}
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleCopyQuery(item.id, item.query, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="Copy query text"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectQuery(item.query);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition"
                          title="Search this again"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          title="Delete from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer Summary */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Search history is securely managed on your local device.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
