import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, Globe, Sparkles, CornerDownLeft, AlertCircle } from 'lucide-react';
import { useVoiceTyping } from '../hooks/useVoiceTyping';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (spokenText: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)' },
  { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)' },
  { code: 'mr-IN', name: 'मराठी (Marathi)' },
];

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onTranscript,
}) => {
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [liveText, setLiveText] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const voiceTyping = useVoiceTyping({
    lang: selectedLang,
    onTranscriptChange: (text) => {
      setLiveText(text);
    },
    onFinalTranscript: (text) => {
      setLiveText(text);
      if (text.trim()) {
        setTimeout(() => {
          onTranscript(text.trim());
          onClose();
        }, 500);
      }
    },
    autoStopSilenceMs: 2500,
  });

  // Start listening automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      setLiveText('');
      const timer = setTimeout(() => {
        voiceTyping.startListening('');
      }, 200);
      return () => clearTimeout(timer);
    } else {
      voiceTyping.stopListening();
    }
  }, [isOpen, selectedLang]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleManualSubmit = () => {
    if (liveText.trim()) {
      voiceTyping.stopListening();
      onTranscript(liveText.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center transition-all transform scale-100"
      >
        {/* Background Ambient Glow */}
        <div
          className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-500 ${
            voiceTyping.isListening ? 'bg-red-500' : 'bg-blue-500'
          }`}
        />
        <div
          className={`absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-500 ${
            voiceTyping.isListening ? 'bg-yellow-500' : 'bg-purple-500'
          }`}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Language Selector Header */}
        <div className="flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <Globe className="w-3.5 h-3.5 text-blue-500" />
          <select
            value={selectedLang}
            onChange={(e) => {
              setSelectedLang(e.target.value);
              voiceTyping.stopListening();
            }}
            className="bg-transparent border-none outline-none cursor-pointer font-medium text-slate-700 dark:text-slate-200 text-xs"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Indicator */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {voiceTyping.isListening
              ? liveText
                ? 'Listening...'
                : 'Speak now...'
              : voiceTyping.isProcessing
              ? 'Processing speech...'
              : 'Voice Search'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 min-h-[20px]">
            {voiceTyping.errorMessage ? (
              <span className="text-red-500 dark:text-red-400 flex items-center justify-center gap-1">
                <AlertCircle className="w-4 h-4 inline" /> {voiceTyping.errorMessage}
              </span>
            ) : voiceTyping.statusMessage || (liveText ? 'Say your search terms' : 'Try saying "Nagarpalika citizen services" or "property tax"')}
          </p>
        </div>

        {/* Live Transcript Display Box */}
        <div className="w-full min-h-[90px] max-h-[140px] overflow-y-auto my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center text-center">
          {liveText ? (
            <p className="text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed break-words">
              "{liveText}"
            </p>
          ) : (
            <p className="text-sm italic text-slate-400 dark:text-slate-500">
              Your words will appear here as you speak...
            </p>
          )}
        </div>

        {/* Pulsing Animated Google / AI Mic Orb */}
        <div className="relative my-6 flex items-center justify-center">
          {/* Dynamic Voice Volume Rings */}
          {voiceTyping.isListening && (
            <>
              <div
                className="absolute rounded-full bg-red-500/20 animate-ping pointer-events-none"
                style={{
                  width: `${90 + Math.min(voiceTyping.voiceVolume * 1.2, 70)}px`,
                  height: `${90 + Math.min(voiceTyping.voiceVolume * 1.2, 70)}px`,
                  animationDuration: '1.8s',
                }}
              />
              <div
                className="absolute rounded-full bg-blue-500/15 pointer-events-none transition-all duration-75"
                style={{
                  width: `${85 + Math.min(voiceTyping.voiceVolume * 0.9, 50)}px`,
                  height: `${85 + Math.min(voiceTyping.voiceVolume * 0.9, 50)}px`,
                }}
              />
            </>
          )}

          {/* Core Mic Button */}
          <button
            type="button"
            onClick={() => {
              if (voiceTyping.isListening) {
                voiceTyping.stopListening();
              } else {
                voiceTyping.startListening('');
              }
            }}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 transform active:scale-95 ${
              voiceTyping.isListening
                ? 'bg-gradient-to-tr from-red-500 via-rose-500 to-pink-500 text-white shadow-red-500/30 scale-105 ring-4 ring-red-400/40'
                : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-blue-500/30 hover:scale-105'
            }`}
            title={voiceTyping.isListening ? 'Click to pause' : 'Click to speak'}
          >
            {voiceTyping.isListening ? (
              <Mic className="w-9 h-9 animate-pulse" />
            ) : (
              <Mic className="w-9 h-9" />
            )}
          </button>
        </div>

        {/* Dynamic Audio Visualizer Bars */}
        <div className="flex items-center justify-center gap-1.5 h-8 my-2">
          {[40, 70, 100, 80, 50].map((h, i) => {
            const dynamicHeight = voiceTyping.isListening
              ? Math.max(6, Math.min(32, Math.round((voiceTyping.voiceVolume / 100) * h + 8)))
              : 6;
            return (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  voiceTyping.isListening
                    ? i % 2 === 0
                      ? 'bg-blue-500 dark:bg-blue-400'
                      : 'bg-red-500 dark:bg-red-400'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                style={{ height: `${dynamicHeight}px` }}
              />
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="w-full flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>AI Multilingual Voice Parser</span>
          </div>

          {liveText ? (
            <button
              onClick={handleManualSubmit}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition flex items-center gap-1.5"
            >
              <span>Search</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">Click mic to toggle</span>
          )}
        </div>
      </div>
    </div>
  );
};
