import React from 'react';
import { Search, Info, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SearchPreviewPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <Link
        to="/"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Project Dashboard</span>
      </Link>

      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-white">Search Engine Preview</h1>
        <p className="text-sm text-slate-400">
          User query input interface with hybrid search mode selection.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">Phase 1 Milestone Notice</span>
          <p className="text-amber-300/80">
            Per Phase 1 requirements, search ranking, vector storage, and crawling are disabled.
            The search interface structure and API endpoints are wired and ready for activation in
            Phase 4 & Phase 5.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center space-x-3">
        <Search className="w-5 h-5 text-slate-500" />
        <input
          type="text"
          disabled
          placeholder="Search documents, concepts, or technical terms... (Locked in Phase 1)"
          className="w-full bg-transparent text-slate-400 placeholder-slate-600 focus:outline-none text-sm cursor-not-allowed"
        />
        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-mono text-slate-400">
          Hybrid Mode
        </span>
      </div>
    </div>
  );
};
