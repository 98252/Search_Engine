import React from 'react';
import { Search, Globe, Activity, LogIn, LogOut } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeTab: 'search' | 'crawler' | 'analytics';
  setActiveTab: (tab: 'search' | 'crawler' | 'analytics') => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('search')}
          className="flex items-center space-x-3 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">SmartSearch</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Hybrid Search & Ingestion Engine</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Search className="w-4 h-4 text-brand-400" />
            <span>Search</span>
          </button>

          <button
            onClick={() => setActiveTab('crawler')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'crawler'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Crawler & Index</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Telemetry</span>
          </button>
        </nav>

        {/* User Auth Action */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <div className="w-6 h-6 rounded-full bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-xs text-brand-300 font-bold">
                {user.email[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <span className="text-slate-200 font-medium block truncate max-w-[120px]">
                  {user.full_name || user.email.split('@')[0]}
                </span>
                <span className="text-[10px] text-brand-400 uppercase font-semibold">{user.role}</span>
              </div>
              <button
                onClick={onLogout}
                title="Log Out"
                className="text-slate-400 hover:text-red-400 p-1 rounded transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5 text-brand-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
