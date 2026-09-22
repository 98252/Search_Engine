import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Layers,
  Database,
  Search,
  ExternalLink,
  Code2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
  database: string;
  timestamp: string;
}

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const response = await axios.get<HealthStatus>('/api/health', { timeout: 4000 });
      const duration = Math.round(performance.now() - start);
      setHealth(response.data);
      setLatencyMs(duration);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to connect to backend. Please ensure the FastAPI server is running on port 8000.'
      );
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const projectModules = [
    {
      name: 'frontend/',
      tech: 'React 18, Vite, TypeScript, Tailwind CSS, React Router',
      desc: 'Modern SPA with typed components, client routing, and ESLint/Prettier setup.',
      badge: 'Active',
      color: 'border-brand-500/40 text-brand-400 bg-brand-500/10',
    },
    {
      name: 'backend/',
      tech: 'Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Pydantic',
      desc: 'Asynchronous ASGI server with CORS, lifespan management, and OpenAPI auto-docs.',
      badge: 'Active',
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    },
    {
      name: 'database/',
      tech: 'PostgreSQL 16 / SQLite via aiosqlite',
      desc: 'Relational data models for documents, chunks, users, and search telemetry.',
      badge: 'Configured',
      color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
    },
    {
      name: 'ai/',
      tech: 'Sentence-Transformers & Qdrant HNSW',
      desc: 'Dense vector embedding generator (384-dim) and similarity retrieval foundation.',
      badge: 'Scaffolded',
      color: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
    },
    {
      name: 'crawler/',
      tech: 'Scrapy & Async HTML Sanitizer',
      desc: 'Polite crawling pipeline respecting robots.txt and auto-throttling.',
      badge: 'Scaffolded',
      color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    },
    {
      name: 'tests/',
      tech: 'Pytest, Pytest-Asyncio, HTTPX',
      desc: 'End-to-end integration test suite verifying health endpoints and logic.',
      badge: 'Verified',
      color: 'border-teal-500/40 text-teal-400 bg-teal-500/10',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-16 space-y-10">
      {/* Hero Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-xs text-brand-300 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Phase 1: Environment & Project Foundation</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
          SmartSearch{' '}
          <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Production-quality hybrid search engine foundation combining FastAPI, React Router,
          TypeScript, and Tailwind CSS.
        </p>
      </div>

      {/* Live Backend Connection Status Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <Server className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Backend Health Diagnostic</span>
                <span className="text-xs text-slate-500 font-mono">/health</span>
              </h2>
              <p className="text-xs text-slate-400">
                Live heartbeat verification connecting Frontend to Backend via Axios proxy
              </p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            <span>Check Health Again</span>
          </button>
        </div>

        <div className="pt-5">
          {loading && !health ? (
            <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
              <span>Pinging FastAPI backend at /health...</span>
            </div>
          ) : health ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                  Connection Status
                </span>
                <div className="flex items-center space-x-2 mt-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                    {health.status}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Latency: <span className="text-slate-300 font-mono">{latencyMs} ms</span>
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                  Service Name
                </span>
                <span className="text-sm font-bold text-white mt-1.5 block truncate">
                  {health.service}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Version: <span className="text-slate-300 font-mono">{health.version}</span>
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                  Database Layer
                </span>
                <div className="flex items-center space-x-2 mt-1.5">
                  <Database className="w-4 h-4 text-brand-400" />
                  <span className="text-sm font-bold text-white">{health.database}</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Mode: <span className="text-slate-300 font-mono">SQLite (async)</span>
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                  Environment
                </span>
                <span className="text-sm font-bold text-amber-400 mt-1.5 block capitalize">
                  {health.environment}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  CORS: <span className="text-slate-300 font-mono">Active</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <span className="font-bold block">Backend Disconnected</span>
                <span className="text-red-300/80">{error}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4 text-slate-400">
            <span>
              Backend Server:{' '}
              <a
                href="http://127.0.0.1:8000"
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 hover:underline font-mono"
              >
                http://127.0.0.1:8000
              </a>
            </span>
          </div>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <span>Open Swagger API Docs</span>
            <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
          </a>
        </div>
      </div>

      {/* Project Structure Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-brand-400" />
            <span>Modular Workspace Structure</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">Clean Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectModules.map((m, idx) => (
            <div
              key={idx}
              className="bg-slate-900/50 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-white">{m.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.color}`}>
                  {m.badge}
                </span>
              </div>
              <p className="text-xs text-brand-300/90 font-medium">{m.tech}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Link
          to="/search"
          className="group bg-gradient-to-r from-slate-900 to-slate-900/80 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-brand-500/50 rounded-2xl p-6 transition shadow-md flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-brand-400" />
              <h3 className="font-bold text-white text-base">Search Engine Preview</h3>
            </div>
            <p className="text-xs text-slate-400">
              Interactive search interface prepared for Phase 4 & 5 integration.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to="/about"
          className="group bg-gradient-to-r from-slate-900 to-slate-900/80 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition shadow-md flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-white text-base">Architecture & Roadmap</h3>
            </div>
            <p className="text-xs text-slate-400">
              Review Phase 1-8 development plan and system specs.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
};
