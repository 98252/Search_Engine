import React, { useState, useEffect } from 'react';
import { Activity, Database, Cpu, Search, RefreshCw, Zap, Layers, Server } from 'lucide-react';
import { SystemTelemetry } from '../types';
import { api } from '../services/api';

export const AnalyticsDashboard: React.FC = () => {
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTelemetry = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTelemetry();
      setTelemetry(data);
    } catch (e) {
      console.error('Error fetching telemetry:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
            <Activity className="w-7 h-7 text-amber-400" />
            <span>Search System Telemetry & Health</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time diagnostics across the vector index, BM25 inverted index, and query latency pipeline.
          </p>
        </div>

        <button
          onClick={fetchTelemetry}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Core KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Documents</span>
            <Layers className="w-4 h-4 text-brand-400" />
          </div>
          <span className="text-3xl font-extrabold text-white">
            {telemetry?.overview.total_documents ?? 0}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Persisted in PostgreSQL</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Indexed Chunks</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-extrabold text-emerald-400">
            {telemetry?.overview.total_chunks ?? 0}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Token-segmented context</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Queries Executed</span>
            <Search className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-3xl font-extrabold text-purple-400">
            {telemetry?.overview.total_queries ?? 0}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">User searches logged</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Average Latency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-3xl font-extrabold text-amber-400">
            {telemetry?.overview.avg_latency_ms ?? 0} <span className="text-sm font-normal">ms</span>
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">End-to-end RRF retrieval</span>
        </div>
      </div>

      {/* Engine Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OpenSearch Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                <Server className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">OpenSearch (Lexical BM25)</h3>
                <p className="text-xs text-slate-400">Inverted Index & Highlighting</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Active
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Engine State:</span>
              <span className="font-mono text-white">
                {telemetry?.search_engines.opensearch.status || 'Connected'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Documents in Inverted Index:</span>
              <span className="font-mono font-bold text-white">
                {telemetry?.search_engines.opensearch.document_count ?? 0}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Scoring Function:</span>
              <span className="font-mono text-slate-200">Okapi BM25 (k1=1.5, b=0.75)</span>
            </div>
          </div>
        </div>

        {/* Qdrant Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Qdrant (Vector Engine)</h3>
                <p className="text-xs text-slate-400">Dense HNSW Cosine Index</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Active
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Engine State:</span>
              <span className="font-mono text-white">
                {telemetry?.search_engines.qdrant.status || 'Connected'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Vectors in HNSW Graph:</span>
              <span className="font-mono font-bold text-white">
                {telemetry?.search_engines.qdrant.vector_count ?? 0}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Embedding Model:</span>
              <span className="font-mono text-slate-200">all-MiniLM-L6-v2 (384-dim)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Search Queries */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-white text-base mb-3">Popular Search Queries</h3>
        <div className="flex flex-wrap gap-2">
          {telemetry?.top_queries && telemetry.top_queries.length > 0 ? (
            telemetry.top_queries.map((q, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs"
              >
                <span className="text-slate-200 font-medium">{q.query}</span>
                <span className="px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 font-bold text-[10px]">
                  {q.count}x
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No search query history logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
