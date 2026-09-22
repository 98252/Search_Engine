import React from 'react';
import { ArrowLeft, Shield, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  const phases = [
    { num: 'Phase 1', title: 'Environment & Project Foundation', status: 'Completed', current: true },
    { num: 'Phase 2', title: 'Data Models & Search Engine Setup', status: 'Upcoming', current: false },
    { num: 'Phase 3', title: 'AI Embedding Pipeline & Vector Store', status: 'Upcoming', current: false },
    { num: 'Phase 4', title: 'Scrapy Web Crawler & Ingestion', status: 'Upcoming', current: false },
    { num: 'Phase 5', title: 'Hybrid Search & Reciprocal Rank Fusion', status: 'Upcoming', current: false },
    { num: 'Phase 6', title: 'Production API & JWT Authentication', status: 'Upcoming', current: false },
    { num: 'Phase 7', title: 'Advanced Frontend Search UI & Dashboard', status: 'Upcoming', current: false },
    { num: 'Phase 8', title: 'Verification, Benchmarking & Deployment', status: 'Upcoming', current: false },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <Link
        to="/"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Project Dashboard</span>
      </Link>

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          System Architecture & Roadmap
        </h1>
        <p className="text-sm text-slate-400">
          SmartSearch AI development roadmap and engineering standards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-brand-400">
            <Shield className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Security First</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Zero secrets exposed in source control. All database credentials, JWT secret keys, and
            endpoints are strictly read from environment variables via Pydantic Settings.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-purple-400">
            <Cpu className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Zero-Docker Simplicity</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Engineered to run seamlessly on developer machines without container requirements:
            SQLite for persistence, embedded Qdrant for vectors, and in-memory Okapi BM25 for
            lexical retrieval.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Implementation Phases</h2>
        <div className="space-y-2">
          {phases.map((p, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-center justify-between text-xs transition ${
                p.current
                  ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-mono font-bold text-slate-200">{p.num}</span>
                <span className="font-medium text-white">{p.title}</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                  p.status === 'Completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
