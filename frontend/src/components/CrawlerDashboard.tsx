import React, { useState, useEffect } from 'react';
import { Globe, Plus, Play, RefreshCw, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { CrawlJob, CrawlStats } from '../types';
import { api } from '../services/api';

export const CrawlerDashboard: React.FC = () => {
  const [stats, setStats] = useState<CrawlStats | null>(null);
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'crawler' | 'direct_index'>('crawler');

  // Crawl Form State
  const [seedUrl, setSeedUrl] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [depthLimit, setDepthLimit] = useState(2);
  const [maxPages, setMaxPages] = useState(20);

  // Manual Index Form State
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualDomain, setManualDomain] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedStats, fetchedJobs] = await Promise.all([
        api.getCrawlStats(),
        api.listCrawlJobs(),
      ]);
      setStats(fetchedStats);
      setJobs(fetchedJobs);
    } catch (e) {
      console.error('Failed to load crawler telemetry:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await api.startCrawl(seedUrl.trim(), allowedDomains.trim() || undefined, depthLimit, maxPages);
      setSeedUrl('');
      setAllowedDomains('');
      await loadData();
    } catch (err: any) {
      alert(`Error starting crawl: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualIndex = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim() || !manualTitle.trim() || !manualContent.trim()) return;
    setIsSubmitting(true);
    try {
      await api.indexDocument(
        manualUrl.trim(),
        manualTitle.trim(),
        manualContent.trim(),
        manualDomain.trim() || undefined
      );
      setManualSuccessMsg(`Document "${manualTitle}" successfully chunked, embedded, and indexed!`);
      setManualUrl('');
      setManualTitle('');
      setManualContent('');
      setManualDomain('');
      setTimeout(() => setManualSuccessMsg(''), 4000);
      await loadData();
    } catch (err: any) {
      alert(`Error indexing document: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Running</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
            <Globe className="w-7 h-7 text-emerald-400" />
            <span>Web Crawler & Ingestion Hub</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch asynchronous Scrapy crawl jobs or directly index unstructured articles into OpenSearch & Qdrant.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs font-medium text-slate-400 block">Total Crawl Jobs</span>
          <span className="text-2xl font-bold text-white mt-1 block">{stats?.total_jobs ?? 0}</span>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs font-medium text-slate-400 block">Active Running Jobs</span>
          <span className="text-2xl font-bold text-amber-400 mt-1 block">{stats?.active_jobs ?? 0}</span>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs font-medium text-slate-400 block">Total Pages Crawled</span>
          <span className="text-2xl font-bold text-brand-400 mt-1 block">{stats?.total_pages_crawled ?? 0}</span>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs font-medium text-slate-400 block">Total Pages Indexed</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">{stats?.total_pages_indexed ?? 0}</span>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('crawler')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeSubTab === 'crawler'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Automated Web Spider
        </button>
        <button
          onClick={() => setActiveSubTab('direct_index')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeSubTab === 'direct_index'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Direct Document Ingestion
        </button>
      </div>

      {/* Crawl Trigger Form */}
      {activeSubTab === 'crawler' ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-md">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Launch New Crawler Job</span>
          </h2>

          <form onSubmit={handleStartCrawl} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Seed URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                required
                value={seedUrl}
                onChange={(e) => setSeedUrl(e.target.value)}
                placeholder="https://en.wikipedia.org/wiki/Artificial_intelligence"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Allowed Domain Filter (Optional)
              </label>
              <input
                type="text"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                placeholder="e.g. en.wikipedia.org"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Depth Limit</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={depthLimit}
                  onChange={(e) => setDepthLimit(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Max Pages</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value) || 10)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !seedUrl.trim()}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-md shadow-emerald-600/20"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
                <span>Dispatch Spider</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Direct Document Ingestion Form */
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-md">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-brand-400" />
            <span>Direct Text / Document Ingestion</span>
          </h2>

          {manualSuccessMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{manualSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleManualIndex} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Document Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus in Raft"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Canonical URL or Identifier <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://myrepo.org/docs/raft-consensus"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Article / Document Text <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="Paste the full text or documentation here. It will be automatically chunked and vectorized."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || !manualContent.trim() || !manualTitle.trim()}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-md shadow-brand-600/20"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Chunk, Embed & Index Document</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Crawl Jobs History Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-md">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Crawl Jobs Telemetry</h3>
          <span className="text-xs text-slate-400">{jobs.length} total jobs logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 uppercase text-[11px] text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Seed URL</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Crawled</th>
                <th className="px-6 py-3">Indexed</th>
                <th className="px-6 py-3">Depth / Max</th>
                <th className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No crawl jobs executed yet. Launch one above!
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-3.5 font-medium text-white max-w-xs truncate">
                      <a
                        href={job.seed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-brand-400 hover:underline truncate block"
                      >
                        {job.seed_url}
                      </a>
                    </td>
                    <td className="px-6 py-3.5">{getStatusBadge(job.status)}</td>
                    <td className="px-6 py-3.5 font-mono">{job.pages_crawled}</td>
                    <td className="px-6 py-3.5 font-mono text-emerald-400">{job.pages_indexed}</td>
                    <td className="px-6 py-3.5 font-mono text-slate-400">
                      {job.depth_limit} / {job.max_pages}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
