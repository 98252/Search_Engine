import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  FileText,
  User,
  Sparkles,
  Share2,
  Globe,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Zap,
  Calendar,
  Layers,
  ZoomIn,
  ZoomOut,
  Highlighter,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  ListOrdered,
  Download,
} from 'lucide-react';
import { SearchResultItem, ReaderArticleData } from '../types';
import { api } from '../services/api';

interface InstantReaderDrawerProps {
  item: SearchResultItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  activeQuery?: string;
  currentIndex?: number;
  totalResults?: number;
}

type TabType = 'reader' | 'insights' | 'preview';
type ReaderTheme = 'midnight' | 'sepia' | 'light';

export const InstantReaderDrawer: React.FC<InstantReaderDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  activeQuery = '',
  currentIndex = 0,
  totalResults = 0,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('reader');
  const [theme, setTheme] = useState<ReaderTheme>('midnight');
  const [fontSize, setFontSize] = useState<number>(16); // 14 to 22
  const [fontSerif, setFontSerif] = useState<boolean>(false);
  const [showHighlights, setShowHighlights] = useState<boolean>(true);

  // Article data state
  const [article, setArticle] = useState<ReaderArticleData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [showToc, setShowToc] = useState<boolean>(false);

  // Speech synthesis audio player state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  // Search match navigation inside reader
  const [highlightCount, setHighlightCount] = useState<number>(0);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState<number>(0);

  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch full reader content whenever item changes
  useEffect(() => {
    if (!isOpen || !item) {
      setArticle(null);
      stopSpeech();
      return;
    }

    let isMounted = true;
    setLoading(true);
    setIframeError(false);
    setActiveTab('reader');
    stopSpeech();

    api
      .fetchReaderArticle(item.url, item.title, item.snippet)
      .then((data) => {
        if (isMounted) {
          setArticle(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setArticle({
            success: true,
            url: item.url,
            domain: item.domain,
            title: item.title,
            author: item.author || item.domain,
            published_date: 'Online Record',
            lead_image: null,
            excerpt: item.snippet,
            word_count: item.snippet.split(/\s+/).length,
            read_time_minutes: 1,
            paragraphs: [item.snippet],
            headings: ['Summary'],
            key_points: [item.snippet],
            is_fallback: true,
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      stopSpeech();
    };
  }, [item?.url, isOpen]);

  // Clean up speech when drawer closes
  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const handlePlaySpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();

    // Prepare clean text to read
    const textToRead = [
      article?.title || item?.title || '',
      article?.excerpt || '',
      ...(article?.paragraphs || []).filter((p) => !p.startsWith('![') && !p.startsWith('##')),
    ].join('. ');

    if (!textToRead.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textToRead.slice(0, 3000));
    utterance.rate = speechRate;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handlePauseSpeech = () => {
    if ('speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  // Keyboard navigation: Esc to close, J/K to navigate results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        stopSpeech();
        onClose();
      } else if ((e.key === 'j' || e.key === 'J') && hasNext && onNext) {
        stopSpeech();
        onNext();
      } else if ((e.key === 'k' || e.key === 'K') && hasPrev && onPrev) {
        stopSpeech();
        onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrev, onNext, onPrev, onClose]);

  // Count highlights in rendered DOM
  useEffect(() => {
    if (!isOpen || !contentRef.current || !showHighlights) {
      setHighlightCount(0);
      return;
    }
    const marks = contentRef.current.querySelectorAll('mark.reader-hl');
    setHighlightCount(marks.length);
    setActiveHighlightIndex(0);
  }, [article, isOpen, activeQuery, showHighlights, activeTab]);

  if (!isOpen || !item) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySummary = () => {
    if (!article) return;
    const bullets = (article.key_points || []).map((k) => `• ${k}`).join('\n');
    const md = `# ${article.title}\nSource: ${article.url}\n\n## Executive Summary\n${article.excerpt}\n\n## Key Takeaways\n${bullets}`;
    navigator.clipboard.writeText(md);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: article?.title || item.title,
          url: item.url,
        })
        .catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const jumpToHighlight = (direction: 'next' | 'prev') => {
    if (!contentRef.current || highlightCount === 0) return;
    const marks = contentRef.current.querySelectorAll('mark.reader-hl');
    let nextIdx = activeHighlightIndex;
    if (direction === 'next') {
      nextIdx = (activeHighlightIndex + 1) % marks.length;
    } else {
      nextIdx = (activeHighlightIndex - 1 + marks.length) % marks.length;
    }
    setActiveHighlightIndex(nextIdx);
    const target = marks[nextIdx] as HTMLElement;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-2', 'ring-amber-400');
      setTimeout(() => target.classList.remove('ring-2', 'ring-amber-400'), 1500);
    }
  };

  const scrollToHeading = (headingText: string) => {
    if (!contentRef.current) return;
    const hElements = contentRef.current.querySelectorAll('h3, h2');
    for (const h of Array.from(hElements)) {
      if (h.textContent?.toLowerCase().includes(headingText.toLowerCase())) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setShowToc(false);
        break;
      }
    }
  };

  // Format paragraphs with subtle highlight
  const renderParagraph = (text: string, pIdx: number) => {
    // Check if paragraph is an image markdown ![alt](url)
    const imgMatch = text.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/);
    if (imgMatch) {
      const altText = imgMatch[1];
      const imgSrc = imgMatch[2];
      return (
        <figure key={pIdx} className="my-6 rounded-xl overflow-hidden bg-black/20 border border-slate-700/50 shadow-md">
          <img
            src={imgSrc}
            alt={altText || 'Article illustration'}
            className="w-full max-h-[420px] object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {altText && (
            <figcaption className="p-2.5 text-xs text-center opacity-70 italic">
              {altText}
            </figcaption>
          )}
        </figure>
      );
    }

    // Check if line is a heading ##
    if (text.startsWith('## ') || text.startsWith('# ')) {
      const headingText = text.replace(/^#+\s*/, '');
      return (
        <h3
          key={pIdx}
          id={`section-${pIdx}`}
          className="text-xl font-bold mt-8 mb-3 pb-1 border-b border-current/15 tracking-tight scroll-mt-14"
        >
          {headingText}
        </h3>
      );
    }

    // Check if Rotten Tomatoes / Review style block (Critics Consensus, Synopsis)
    const isCriticsConsensus = text.startsWith('Critics Consensus:');
    const isSynopsis = text.startsWith('Synopsis:');
    const isDirectedBy = text.startsWith('Directed By:');

    if (isCriticsConsensus || isSynopsis || isDirectedBy) {
      return (
        <div
          key={pIdx}
          className={`p-3.5 my-3 rounded-xl border text-sm leading-relaxed ${
            isCriticsConsensus
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200/95 font-medium'
              : isSynopsis
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-200/95'
              : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
          }`}
        >
          <span className="font-bold block mb-1 uppercase tracking-wider text-xs opacity-80">
            {isCriticsConsensus ? '🍅 Critics Consensus' : isSynopsis ? '📖 Synopsis' : '🎬 Production'}
          </span>
          {text.replace(/^(Critics Consensus:|Synopsis:|Directed By:)\s*/, '')}
        </div>
      );
    }

    if (!showHighlights || !activeQuery.trim()) {
      return (
        <p key={pIdx} className="mb-4 leading-relaxed">
          {text}
        </p>
      );
    }

    // Subtle highlighting for terms > 1 character, matching whole terms
    const queryTerms = activeQuery
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (queryTerms.length === 0) {
      return (
        <p key={pIdx} className="mb-4 leading-relaxed">
          {text}
        </p>
      );
    }

    const regex = new RegExp(`\\b(${queryTerms.join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return (
      <p key={pIdx} className="mb-4 leading-relaxed">
        {parts.map((part, i) => {
          const isMatch = queryTerms.some((t) => t.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <mark
                key={i}
                className={`reader-hl px-1 py-0.2 rounded font-medium transition-colors ${
                  theme === 'midnight'
                    ? 'bg-amber-400/20 text-amber-200 border-b border-amber-400/50'
                    : theme === 'sepia'
                    ? 'bg-amber-300/40 text-amber-950 border-b border-amber-500/60'
                    : 'bg-amber-200 text-amber-900 border-b border-amber-400'
                }`}
              >
                {part}
              </mark>
            );
          }
          return part;
        })}
      </p>
    );
  };

  // Theme styling definitions
  const themeClasses = {
    midnight: 'bg-[#0d1117] text-slate-200 border-slate-800',
    sepia: 'bg-[#f8f1e5] text-[#2c2419] border-[#e4d7c2]',
    light: 'bg-white text-slate-900 border-slate-200',
  };

  const headerBgClasses = {
    midnight: 'bg-[#090d14]/95 border-slate-800/80',
    sepia: 'bg-[#ede3d1]/95 border-[#e0cfb8]',
    light: 'bg-slate-50/95 border-slate-200',
  };

  const cardBgClasses = {
    midnight: 'bg-slate-900/60 border-slate-800/80',
    sepia: 'bg-[#f0e7d5] border-[#dfd2be]',
    light: 'bg-slate-100/80 border-slate-200',
  };

  const buttonHoverClasses = {
    midnight: 'hover:bg-slate-800 text-slate-300 hover:text-white',
    sepia: 'hover:bg-[#e4d7c2] text-[#4d3d2a] hover:text-black',
    light: 'hover:bg-slate-200 text-slate-600 hover:text-slate-900',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Background click to dismiss */}
      <div
        className="flex-1"
        onClick={() => {
          stopSpeech();
          onClose();
        }}
      />

      {/* Drawer Container */}
      <aside
        className={`w-full max-w-2xl h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out border-l ${
          themeClasses[theme]
        } ${fontSerif ? 'font-serif' : 'font-sans'}`}
      >
        {/* Top Control Bar with iOS safe area support */}
        <div
          className={`px-3 sm:px-5 py-2.5 sm:py-3 border-b flex items-center justify-between gap-2 sm:gap-3 backdrop-blur-md sticky top-0 z-20 pt-safe ${
            headerBgClasses[theme]
          }`}
        >
          {/* Domain & Source Badge with Real Favicon */}
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-6 h-6 rounded-md bg-slate-800/80 border border-current/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=64`}
                alt=""
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="truncate flex items-center space-x-1.5 text-xs font-mono">
              <span className="font-semibold truncate max-w-[160px]">{item.domain}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            </div>
          </div>

          {/* Center Tabs: Reader / Insights / Web View */}
          <div className="flex items-center rounded-lg p-0.5 border text-xs font-medium bg-black/10 border-current/10">
            <button
              onClick={() => setActiveTab('reader')}
              className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                activeTab === 'reader'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : buttonHoverClasses[theme]
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Reader</span>
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                activeTab === 'insights'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : buttonHoverClasses[theme]
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Insights</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : buttonHoverClasses[theme]
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Web</span>
            </button>
          </div>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Result Counter (K/J) */}
            {totalResults > 1 && (
              <div className="flex items-center rounded-lg p-0.5 border border-current/10 mr-1 text-xs">
                <button
                  onClick={onPrev}
                  disabled={!hasPrev}
                  title="Previous result (K)"
                  className="p-1 rounded disabled:opacity-25 transition hover:bg-current/10"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 text-[11px] opacity-60 font-mono">
                  {currentIndex + 1}/{totalResults}
                </span>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  title="Next result (J)"
                  className="p-1 rounded disabled:opacity-25 transition hover:bg-current/10"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Font Size Adjuster */}
            <div className="hidden sm:flex items-center rounded-lg p-0.5 border border-current/10 mr-1">
              <button
                onClick={() => setFontSize((s) => Math.max(13, s - 1))}
                title="Decrease font size"
                className="p-1 rounded transition hover:bg-current/10 text-xs font-bold"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                title="Increase font size"
                className="p-1 rounded transition hover:bg-current/10 text-xs font-bold"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>

            {/* Theme Switcher Button */}
            <button
              onClick={() => {
                if (theme === 'midnight') setTheme('sepia');
                else if (theme === 'sepia') setTheme('light');
                else setTheme('midnight');
              }}
              title={`Theme: ${theme}. Click to switch.`}
              className={`p-1.5 rounded-lg border border-current/10 text-xs transition ${buttonHoverClasses[theme]}`}
            >
              <span className="w-3.5 h-3.5 rounded-full block border border-current/20 font-mono text-[9px] leading-3 text-center uppercase font-bold">
                {theme.charAt(0)}
              </span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              title="Copy URL"
              className={`p-1.5 rounded-lg transition ${buttonHoverClasses[theme]}`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              title="Share article"
              className={`p-1.5 rounded-lg transition ${buttonHoverClasses[theme]}`}
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Open externally in new tab */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full page in new tab"
              className="p-1.5 rounded-lg text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 transition"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close Button */}
            <button
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              title="Close reader (Esc)"
              className={`p-1.5 rounded-lg transition ml-1 ${buttonHoverClasses[theme]}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audio Player Toolbar: Listen to Article (Speech Synthesis) */}
        {activeTab === 'reader' && !loading && (
          <div
            className={`px-5 py-2 border-b flex items-center justify-between gap-3 text-xs ${
              headerBgClasses[theme]
            }`}
          >
            <div className="flex items-center space-x-2">
              {!isSpeaking ? (
                <button
                  onClick={handlePlaySpeech}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Listen to article</span>
                </button>
              ) : isPaused ? (
                <button
                  onClick={handlePlaySpeech}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Resume</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={handlePauseSpeech}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-sm transition"
                  >
                    <Pause className="w-3 h-3 fill-current" />
                    <span>Pause</span>
                  </button>
                  <button
                    onClick={stopSpeech}
                    className="p-1.5 rounded-full hover:bg-current/10 transition text-red-400"
                    title="Stop playback"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>

                  {/* Animated sound bars */}
                  <div className="flex items-end space-x-0.5 h-3 ml-2">
                    <span className="w-0.5 bg-blue-400 h-2 animate-pulse" />
                    <span className="w-0.5 bg-blue-400 h-3 animate-bounce" />
                    <span className="w-0.5 bg-blue-400 h-1.5 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Speed rate toggle */}
              <button
                onClick={() => {
                  const nextRate = speechRate === 1.0 ? 1.25 : speechRate === 1.25 ? 1.5 : 1.0;
                  setSpeechRate(nextRate);
                  if (isSpeaking) {
                    stopSpeech();
                    setTimeout(handlePlaySpeech, 100);
                  }
                }}
                className="px-2 py-0.5 rounded text-[11px] border border-current/15 opacity-70 hover:opacity-100 font-mono transition"
                title="Change playback speed"
              >
                {speechRate}x
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {/* Table of Contents Button */}
              {article?.headings && article.headings.length > 1 && (
                <button
                  onClick={() => setShowToc(!showToc)}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] border transition ${
                    showToc
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'border-current/15 opacity-80 hover:opacity-100'
                  }`}
                >
                  <ListOrdered className="w-3 h-3" />
                  <span>Contents ({article.headings.length})</span>
                </button>
              )}

              {/* Copy Summary Button */}
              <button
                onClick={handleCopySummary}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] border border-current/15 opacity-80 hover:opacity-100 transition"
                title="Copy markdown summary with takeaways"
              >
                {copiedSummary ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
                <span>{copiedSummary ? 'Copied' : 'Export'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Table of Contents Dropdown Drawer */}
        {showToc && article?.headings && (
          <div
            className={`px-5 py-3 border-b text-xs space-y-1.5 animate-in slide-in-from-top-2 duration-150 ${
              cardBgClasses[theme]
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">
              Table of Contents • Jump to Section
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {article.headings.map((h, hIdx) => (
                <button
                  key={hIdx}
                  onClick={() => scrollToHeading(h)}
                  className="px-2 py-1 rounded-lg bg-black/10 hover:bg-blue-600 hover:text-white border border-current/10 transition text-left text-xs truncate max-w-[200px]"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Sub-bar: Search Match navigation & Reading Mode Utilities */}
        {highlightCount > 0 && activeTab === 'reader' && (
          <div
            className={`px-5 py-1.5 border-b text-xs flex items-center justify-between opacity-90 ${
              headerBgClasses[theme]
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-amber-400 flex items-center gap-1 font-medium text-[11px]">
                <Highlighter className="w-3 h-3" />
                <span>
                  {highlightCount} match{highlightCount > 1 ? 'es' : ''} for "{activeQuery}"
                </span>
              </span>
              <button
                onClick={() => setShowHighlights(!showHighlights)}
                className="text-[10px] underline opacity-70 hover:opacity-100 ml-1"
              >
                {showHighlights ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="opacity-60 text-[11px]">
                {activeHighlightIndex + 1} of {highlightCount}
              </span>
              <button
                onClick={() => jumpToHighlight('prev')}
                className="px-1.5 py-0.5 rounded border border-current/15 text-[10px] hover:bg-current/10 transition"
              >
                ▲ Prev
              </button>
              <button
                onClick={() => jumpToHighlight('next')}
                className="px-1.5 py-0.5 rounded border border-current/15 text-[10px] hover:bg-current/10 transition"
              >
                ▼ Next
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: CLEAN READER VIEW */}
        {activeTab === 'reader' && (
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto px-4 sm:px-10 py-5 sm:py-6 space-y-5 sm:space-y-6 pb-safe"
            style={{ fontSize: `${fontSize}px` }}
          >
            {loading ? (
              /* Shimmer Loading Skeleton */
              <div className="space-y-6 animate-pulse py-4">
                <div className="h-4 w-32 bg-current/10 rounded-full" />
                <div className="h-8 w-4/5 bg-current/15 rounded-lg" />
                <div className="h-4 w-60 bg-current/10 rounded-full" />
                <div className="h-52 w-full bg-current/10 rounded-2xl my-4" />
                <div className="space-y-3 pt-2">
                  <div className="h-4 w-full bg-current/10 rounded" />
                  <div className="h-4 w-11/12 bg-current/10 rounded" />
                  <div className="h-4 w-4/5 bg-current/10 rounded" />
                  <div className="h-4 w-full bg-current/10 rounded" />
                </div>
                <div className="text-center pt-8 text-xs opacity-60 font-mono">
                  Extracting clean reader view from {item.domain}...
                </div>
              </div>
            ) : (
              <>
                {/* Publication Breadcrumb */}
                <div className="flex items-center space-x-2 text-xs opacity-60 font-mono">
                  <span>{item.domain}</span>
                  <span>›</span>
                  <span>Distraction-Free Reader</span>
                </div>

                {/* Article Main Headline */}
                <h1
                  className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-current"
                  dangerouslySetInnerHTML={{ __html: article?.title || item.title }}
                />

                {/* Metadata Pill Row */}
                <div className="flex flex-wrap items-center gap-3.5 py-3 border-y border-current/10 text-xs opacity-75">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>{article?.author || item.author || item.domain}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{article?.published_date || 'Updated Web Record'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{article?.read_time_minutes || 2} min read</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{article?.word_count || 350} words</span>
                  </div>
                  <div className="ml-auto flex items-center space-x-1 font-mono text-[11px] opacity-60">
                    <span>Rank #{item.rank}</span>
                  </div>
                </div>

                {/* Lead Image if Available */}
                {article?.lead_image && (
                  <div className="my-5 rounded-2xl overflow-hidden shadow-lg border border-current/10 max-h-[380px] bg-black/20">
                    <img
                      src={article.lead_image}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Executive Synopsis Box */}
                {article?.excerpt && (
                  <div
                    className={`p-4 rounded-xl border text-sm leading-relaxed ${cardBgClasses[theme]}`}
                  >
                    <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Executive Overview</span>
                    </div>
                    <div
                      className="opacity-90 leading-relaxed text-sm"
                      dangerouslySetInnerHTML={{ __html: article.excerpt }}
                    />
                  </div>
                )}

                {/* Article Paragraphs Body */}
                <div className="article-body-content pt-2">
                  {article?.paragraphs && article.paragraphs.length > 0 ? (
                    article.paragraphs.map((para, pIdx) => renderParagraph(para, pIdx))
                  ) : (
                    <p className="leading-relaxed opacity-90">{item.snippet}</p>
                  )}
                </div>

                {/* Subtle Collapsible Search Diagnostics (Never intrusive) */}
                <div className="pt-6 border-t border-current/10">
                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="flex items-center justify-between w-full text-xs opacity-60 hover:opacity-100 transition py-1"
                  >
                    <span className="flex items-center space-x-1.5 font-mono">
                      <Layers className="w-3 h-3" />
                      <span>Search Engine Ranking Diagnostics</span>
                    </span>
                    {showDiagnostics ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showDiagnostics && (
                    <div
                      className={`mt-3 p-3.5 rounded-xl border text-xs font-mono space-y-2 ${
                        cardBgClasses[theme]
                      }`}
                    >
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-black/20 border border-current/10">
                          <span className="text-[10px] opacity-60 block">Hybrid RRF</span>
                          <span className="text-blue-400 font-bold">{item.hybrid_score.toFixed(4)}</span>
                        </div>
                        <div className="p-2 rounded bg-black/20 border border-current/10">
                          <span className="text-[10px] opacity-60 block">BM25 Score</span>
                          <span className="text-emerald-400 font-bold">
                            {item.bm25_score ? item.bm25_score.toFixed(2) : 'Lexical Hit'}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-black/20 border border-current/10">
                          <span className="text-[10px] opacity-60 block">Dense Vector</span>
                          <span className="text-purple-400 font-bold">
                            {item.vector_score ? item.vector_score.toFixed(3) : 'Semantic Match'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] opacity-50 pt-1 text-center">
                        Indexed via SmartSearch Multi-Source Pipeline • ID: {item.document_id}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: KEY TAKEAWAYS & EXECUTIVE SUMMARY */}
        {activeTab === 'insights' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6 pb-safe">
            <div className="border-b border-current/10 pb-4">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                AI Synthesis & Key Findings
              </span>
              <h2 className="text-xl font-bold">{article?.title || item.title}</h2>
              <p className="text-xs opacity-60 mt-1">
                Extracted salient takeaways and structured points from {item.domain}
              </p>
            </div>

            {/* Key Points Bullet List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Salient Highlights</span>
              </h3>

              {article?.key_points && article.key_points.length > 0 ? (
                <div className="space-y-2.5">
                  {article.key_points.map((point, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-start space-x-3 text-sm leading-relaxed ${cardBgClasses[theme]}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 opacity-90">{point}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-xl border text-sm ${cardBgClasses[theme]}`}>
                  {item.snippet}
                </div>
              )}
            </div>

            {/* Quick Citations Box */}
            <div className={`p-4 rounded-xl border space-y-3 text-xs ${cardBgClasses[theme]}`}>
              <span className="font-semibold block opacity-80 uppercase tracking-wider text-[11px]">
                Source Citation
              </span>
              <div className="flex items-center justify-between gap-2 p-2 rounded bg-black/20 border border-current/10 font-mono text-[11px]">
                <span className="truncate">{item.url}</span>
                <button
                  onClick={handleCopyLink}
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans flex-shrink-0 transition"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE WEB PREVIEW / IFRAME */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Embedded Browser Toolbar */}
            <div
              className={`px-4 py-2 border-b flex items-center justify-between gap-2 text-xs font-mono ${
                headerBgClasses[theme]
              }`}
            >
              <div className="flex items-center space-x-2 flex-1 truncate bg-black/20 px-3 py-1.5 rounded-lg border border-current/10">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{item.url}</span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-semibold flex items-center space-x-1.5 transition flex-shrink-0 shadow-sm"
              >
                <span>Open in Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Iframe or Fallback Notice */}
            <div className="flex-1 relative bg-slate-950">
              {iframeError ? (
                /* Fallback if site sends X-Frame-Options: SAMEORIGIN / DENY */
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <Globe className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">External Site Security Restriction</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {item.domain} restricts direct in-app embedding for user privacy. You can read the clean extracted article in the <strong>Reader tab</strong> or visit the original site below.
                  </p>
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={() => setActiveTab('reader')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                    >
                      Back to Reader
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center space-x-1.5"
                    >
                      <span>Open {item.domain}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <iframe
                  src={item.url}
                  title={item.title}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  onError={() => setIframeError(true)}
                />
              )}
            </div>
          </div>
        )}

        {/* Footer Bar */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between text-xs backdrop-blur-md ${
            headerBgClasses[theme]
          }`}
        >
          <div className="flex items-center space-x-3 opacity-60">
            <span>
              Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-current/10 font-mono text-[10px]">Esc</kbd> close,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-current/10 font-mono text-[10px]">J</kbd>/
              <kbd className="px-1.5 py-0.5 rounded bg-current/10 font-mono text-[10px]">K</kbd> results
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFontSerif(!fontSerif)}
              className="text-xs opacity-75 hover:opacity-100 transition px-2 py-1 rounded border border-current/15"
              title="Toggle Serif/Sans font"
            >
              {fontSerif ? 'Sans' : 'Serif'}
            </button>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition"
            >
              <span>Visit Original Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
};
