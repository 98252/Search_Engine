import React, { useState } from 'react';
import { X, Globe, Plus, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface CrawlerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CrawlerModal: React.FC<CrawlerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'crawl'>('url');
  
  // Instant Document Ingestion
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');

  // Crawler Job
  const [seedUrl, setSeedUrl] = useState('');
  const [depthLimit, setDepthLimit] = useState(2);
  const [maxPages, setMaxPages] = useState(20);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleIndexUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setMessage(null);
    try {
      await api.indexDocument(
        url.trim() || `https://custom-index.local/${Date.now()}`,
        title.trim(),
        content.trim(),
        undefined,
        title.trim()
      );
      setMessage({ type: 'success', text: 'Document indexed successfully into search corpus!' });
      setUrl('');
      setTitle('');
      setContent('');
      setAuthor('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to index document.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedUrl.trim()) return;

    setLoading(true);
    setMessage(null);
    try {
      await api.startCrawl(seedUrl.trim(), undefined, depthLimit, maxPages);
      setMessage({
        type: 'success',
        text: `Crawler job launched for ${seedUrl}. Pages will be automatically sanitized and indexed.`,
      });
      setSeedUrl('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to trigger crawler job.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <span>Search Corpus & Web Ingestion</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Feed new documents, municipal updates, or websites directly into the search engine.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('url');
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'url' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct Document Ingestion
          </button>
          <button
            onClick={() => {
              setActiveTab('crawl');
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'crawl' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Web Crawler Job
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tab 1: Direct Document Ingestion */}
        {activeTab === 'url' && (
          <form onSubmit={handleIndexUrl} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Nagarpalika Sanitation Guidelines 2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Source Web URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://nagarpalika.gov.in/notices"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Author / Organization
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Municipal Board"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Document Content / Text *
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the full text, article paragraphs, or municipal notice here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Indexing Document...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Index Document Into Search Engine</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Crawler Job */}
        {activeTab === 'crawl' && (
          <form onSubmit={handleStartCrawl} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Seed Website URL *
              </label>
              <input
                type="url"
                required
                value={seedUrl}
                onChange={(e) => setSeedUrl(e.target.value)}
                placeholder="https://example.gov.in"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Crawl Depth Limit: {depthLimit}
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={depthLimit}
                  onChange={(e) => setDepthLimit(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Max Pages: {maxPages}
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching Crawler...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Automated Scrapy Crawl</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
