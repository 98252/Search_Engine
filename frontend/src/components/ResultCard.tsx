import React, { useState } from 'react';
import { ExternalLink, Globe, Copy, Check, Hash, Sparkles } from 'lucide-react';
import { SearchResultItem } from '../types';
import { api } from '../services/api';

interface ResultCardProps {
  item: SearchResultItem;
  queryId?: string;
  _onPreview?: (item: SearchResultItem) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ item, queryId, _onPreview }) => {
  const [copied, setCopied] = useState(false);

  const handleTitleClick = () => {
    api.logClick(item.document_id, item.rank, queryId);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="group bg-white dark:bg-slate-900/60 hover:bg-slate-50/90 dark:hover:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/90 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/20">
      {/* Top Metadata Row */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2.5">
        <div className="flex items-center space-x-2">
          {/* Rank Badge */}
          <span className="flex items-center space-x-0.5 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Hash className="w-3 h-3 text-blue-500 dark:text-brand-400" />
            <span>{item.rank}</span>
          </span>

          {/* Domain Pill */}
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
            <Globe className="w-3 h-3 text-slate-400" />
            <span className="font-medium truncate max-w-[180px]">{item.domain || 'smartsearch.ai'}</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
          <button
            onClick={handleCopyLink}
            title="Copy URL"
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTitleClick}
            title="Open in new tab"
            className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Document Title */}
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-brand-300 transition-colors mb-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleTitleClick}
          className="inline-flex items-center gap-1.5 hover:underline"
        >
          <span dangerouslySetInnerHTML={{ __html: item.title }} />
        </a>
      </h3>

      {/* Snippet with Highlights */}
      <div
        className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-4 font-normal"
        dangerouslySetInnerHTML={{ __html: item.snippet }}
      />

      {/* Technical Score Badges (RRF, BM25, Cosine) */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
        {/* RRF Score */}
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-brand-300 border border-blue-500/20 font-mono">
          <Sparkles className="w-3 h-3 text-blue-500 dark:text-brand-400" />
          <span>RRF: {item.hybrid_score.toFixed(4)}</span>
        </div>

        {/* BM25 Score */}
        {item.bm25_score !== null && item.bm25_score !== undefined && (
          <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 font-mono">
            BM25: {item.bm25_score.toFixed(2)}
          </div>
        )}

        {/* Vector Cosine Score */}
        {item.vector_score !== null && item.vector_score !== undefined && (
          <div className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-mono">
            Cosine: {item.vector_score.toFixed(3)}
          </div>
        )}

        <span className="ml-auto text-slate-400 dark:text-slate-500 text-[10px] hidden sm:inline">
          ID: {item.document_id.slice(0, 8)}...
        </span>
      </div>
    </article>
  );
};
