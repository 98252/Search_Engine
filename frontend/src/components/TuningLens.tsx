import React from 'react';
import { SlidersHorizontal, Sparkles, Zap, Brain, AlignLeft, RefreshCw } from 'lucide-react';
import { SearchMode } from '../types';

interface TuningLensProps {
  isOpen: boolean;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  bm25Weight: number;
  vectorWeight: number;
  onWeightsChange: (bm25: number, vector: number) => void;
  onReset: () => void;
}

export const TuningLens: React.FC<TuningLensProps> = ({
  isOpen,
  mode,
  onModeChange,
  bm25Weight,
  vectorWeight,
  onWeightsChange,
  onReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl my-4 text-xs animate-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-white text-sm">Glass-Box Algorithmic Tuner</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
            Superpower Lens
          </span>
        </div>
        <button
          onClick={onReset}
          className="flex items-center space-x-1 text-slate-400 hover:text-white transition text-[11px]"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset to Balanced RRF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Search Mode Selection */}
        <div className="space-y-2">
          <span className="text-slate-400 font-semibold block">Retrieval Engine Strategy</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onModeChange('hybrid')}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                mode === 'hybrid'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Hybrid RRF</span>
              <span className="text-[9px] text-slate-500 font-normal">BM25 + Dense Vector</span>
            </button>

            <button
              onClick={() => onModeChange('semantic')}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                mode === 'semantic'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Semantic</span>
              <span className="text-[9px] text-slate-500 font-normal">Qdrant Vector Only</span>
            </button>

            <button
              onClick={() => onModeChange('keyword')}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                mode === 'keyword'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <AlignLeft className="w-4 h-4 text-emerald-400" />
              <span>Lexical</span>
              <span className="text-[9px] text-slate-500 font-normal">Exact BM25 Words</span>
            </button>
          </div>
        </div>

        {/* Live Weight Sliders (When in Hybrid Mode) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Reciprocal Rank Balance</span>
            <span className="font-mono text-slate-300 text-[11px]">
              Keyword: {Math.round(bm25Weight * 100)}% | Semantic: {Math.round(vectorWeight * 100)}%
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="w-20 text-slate-400 font-medium text-[11px]">Exact BM25:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bm25Weight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onWeightsChange(val, Number((1 - val).toFixed(2)));
                }}
                className="flex-1 accent-blue-500 cursor-pointer"
              />
              <span className="w-10 text-right font-mono text-blue-400 font-bold">
                {bm25Weight.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="w-20 text-slate-400 font-medium text-[11px]">Semantic Vec:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={vectorWeight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onWeightsChange(Number((1 - val).toFixed(2)), val);
                }}
                className="flex-1 accent-purple-500 cursor-pointer"
              />
              <span className="w-10 text-right font-mono text-purple-400 font-bold">
                {vectorWeight.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
