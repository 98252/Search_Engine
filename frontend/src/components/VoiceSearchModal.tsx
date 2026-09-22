import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Search,
  Globe,
  Loader2,
  Check,
  Radio,
} from 'lucide-react';
import { api } from '../services/api';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (query: string) => void;
}

type EngineMode = 'auto' | 'direct_server' | 'web_speech';
type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error';

const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
];

/**
 * Encodes raw audio PCM samples into a standard 16-bit 16kHz mono WAV Blob.
 */
function exportWAV(audioBuffers: Float32Array[], inputSampleRate: number): Blob {
  let totalLength = 0;
  for (const b of audioBuffers) totalLength += b.length;
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const b of audioBuffers) {
    merged.set(b, offset);
    offset += b.length;
  }

  // Downsample to 16000 Hz if needed
  const targetSampleRate = 16000;
  let samples: Float32Array;
  if (inputSampleRate === targetSampleRate) {
    samples = merged;
  } else {
    const ratio = inputSampleRate / targetSampleRate;
    const newLength = Math.round(merged.length / ratio);
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const idx = Math.round(i * ratio);
      samples[i] = merged[Math.min(idx, merged.length - 1)];
    }
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (v: DataView, pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(pos + i, str.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let dataOffset = 44;
  for (let i = 0; i < samples.length; i++, dataOffset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(dataOffset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onTranscript,
}) => {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [engineNotice, setEngineNotice] = useState<string>('');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [volumeBars, setVolumeBars] = useState<number[]>([12, 18, 28, 20, 14]);

  // Audio & Speech References
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pcmBuffersRef = useRef<Float32Array[]>([]);
  const autoSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirectModeRef = useRef<boolean>(false);

  // Cleanly teardown audio recording & visualizer
  const stopAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    setVolumeBars([12, 18, 28, 20, 14]);
  }, []);

  // Submit recognized query to search page
  const submitQuery = useCallback(
    (textToSubmit: string) => {
      const clean = textToSubmit.trim();
      if (!clean) return;
      stopAudio();
      onTranscript(clean);
      onClose();
    },
    [onTranscript, onClose, stopAudio]
  );

  // Transcribe recorded audio buffers using the backend endpoint
  const processServerTranscription = useCallback(
    async (buffers: Float32Array[], sampleRate: number) => {
      if (!buffers || buffers.length === 0) {
        setStatus('idle');
        return;
      }

      setStatus('processing');
      setEngineNotice('Transcribing audio with Smart Search engine...');

      try {
        const wavBlob = exportWAV(buffers, sampleRate);
        const result = await api.transcribeVoice(wavBlob, selectedLang);

        if (result.transcript && result.transcript.trim()) {
          const clean = result.transcript.trim();
          setTranscript(clean);
          setStatus('idle');
          setTimeout(() => {
            submitQuery(clean);
          }, 400);
        } else {
          setStatus('idle');
          setErrorMessage(
            result.message || 'No speech recognized. Please speak closer to your microphone and try again.'
          );
        }
      } catch (err: any) {
        setStatus('idle');
        setErrorMessage(err.message || 'Could not transcribe audio. Please retry.');
      }
    },
    [selectedLang, submitQuery]
  );

  // Stop recording: evaluate transcript or send recorded audio to server
  const handleStopRecording = useCallback(() => {
    const buffers = [...pcmBuffersRef.current];
    const sampleRate = audioContextRef.current?.sampleRate || 44100;

    stopAudio();

    if (transcript.trim() || interimText.trim()) {
      submitQuery((transcript + ' ' + interimText).trim());
    } else if (buffers.length > 5) {
      // We have recorded audio -> transcribe directly on the server
      processServerTranscription(buffers, sampleRate);
    } else {
      setStatus('idle');
    }
  }, [transcript, interimText, stopAudio, submitQuery, processServerTranscription]);

  // Start recording with Dual-Engine (Web Speech + Direct Audio Recording fallback)
  const startRecording = useCallback(async () => {
    stopAudio();
    setErrorMessage(null);
    setIsPermissionDenied(false);
    setTranscript('');
    setInterimText('');
    pcmBuffersRef.current = [];
    isDirectModeRef.current = false;

    // 1. Initialize Microhone Stream & Web Audio Visualizer
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      setIsPermissionDenied(true);
      setStatus('error');
      setErrorMessage(
        'Microphone permission blocked. Please enable microphone access in your browser.'
      );
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      sourceNode.connect(analyser);

      // Script processor to buffer raw PCM audio for server transcription fallback
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        pcmBuffersRef.current.push(new Float32Array(inputData));
      };
      sourceNode.connect(processor);
      processor.connect(audioCtx.destination);

      // Visualizer loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const renderBars = () => {
        analyser.getByteFrequencyData(dataArray);
        const b1 = Math.max(12, (dataArray[2] / 255) * 64);
        const b2 = Math.max(16, (dataArray[5] / 255) * 80);
        const b3 = Math.max(22, (dataArray[9] / 255) * 96);
        const b4 = Math.max(16, (dataArray[14] / 255) * 78);
        const b5 = Math.max(12, (dataArray[20] / 255) * 60);
        setVolumeBars([b1, b2, b3, b4, b5]);
        animationFrameRef.current = requestAnimationFrame(renderBars);
      };
      renderBars();

      setStatus('recording');
      setEngineNotice('Listening... speak your query');
    } catch {
      setStatus('recording');
    }

    // 2. Initialize Browser Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = selectedLang;

        recognition.onresult = (event: any) => {
          let finalStr = '';
          let interimStr = '';
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) finalStr += res[0].transcript + ' ';
            else interimStr += res[0].transcript;
          }
          const total = (finalStr + interimStr).trim();
          setTranscript(finalStr.trim());
          setInterimText(interimStr.trim());

          if (total.length > 2) {
            if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
            autoSubmitTimeoutRef.current = setTimeout(() => {
              submitQuery(total);
            }, 1800);
          }
        };

        recognition.onerror = (event: any) => {
          // If Google Web Speech service gives a network error (e.g. Brave, localhost, firewall)
          if (event.error === 'network') {
            isDirectModeRef.current = true;
            setEngineNotice('Direct Audio Recording Active • Speak and tap Stop & Search');
            return; // Gracefully continue recording with Direct Audio PCM fallback!
          }
          if (event.error === 'no-speech') {
            return; // Normal timeout; user can still speak or stop
          }
          if (event.error === 'not-allowed') {
            setIsPermissionDenied(true);
            setErrorMessage('Microphone access denied. Please allow microphone permission.');
          }
        };

        recognition.onend = () => {
          // If in direct mode, we keep recording PCM stream until user clicks stop
          if (!isDirectModeRef.current && transcript.trim()) {
            submitQuery(transcript.trim());
          }
        };

        recognition.start();
      } catch {
        isDirectModeRef.current = true;
        setEngineNotice('Direct Audio Mode Active • Speak now');
      }
    } else {
      // Browser does not support Web Speech API -> Direct mode
      isDirectModeRef.current = true;
      setEngineNotice('Direct Audio Mode Active • Speak now');
    }
  }, [selectedLang, stopAudio, submitQuery, transcript]);

  // Modal open/close lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopAudio();
      setStatus('idle');
      setTranscript('');
      setInterimText('');
      setErrorMessage(null);
      setIsPermissionDenied(false);
      return;
    }

    const timer = setTimeout(() => {
      startRecording();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopAudio();
    };
  }, [isOpen, selectedLang]);

  if (!isOpen) return null;

  const combinedDisplay = (transcript + ' ' + interimText).trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 transition-colors">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Close voice search"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-center space-x-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Smart Voice Search
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {status === 'processing'
              ? 'Transcribing your audio...'
              : status === 'recording'
              ? engineNotice || 'Listening... Speak your query clearly'
              : 'Tap microphone to start speaking'}
          </p>
        </div>

        {/* Central Interactive Microphone & Real-Time Audio Visualizer */}
        <div className="flex flex-col items-center justify-center py-2 space-y-4">
          <div className="relative flex items-center justify-center">
            {/* Concentric pulsing rings when recording */}
            {status === 'recording' && (
              <>
                <div className="absolute w-32 h-32 rounded-full bg-red-500/15 dark:bg-red-500/20 animate-ping duration-1000" />
                <div className="absolute w-24 h-24 rounded-full bg-red-500/25 dark:bg-red-500/30 animate-pulse" />
              </>
            )}

            {/* Clickable Microphone Action Button */}
            <button
              onClick={() => {
                if (status === 'recording') {
                  handleStopRecording();
                } else {
                  startRecording();
                }
              }}
              disabled={status === 'processing'}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 transform active:scale-95 ${
                status === 'processing'
                  ? 'bg-blue-600 text-white animate-spin'
                  : status === 'recording'
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/40 scale-105 ring-4 ring-red-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700/80 ring-1 ring-slate-200 dark:ring-slate-700'
              }`}
              title={status === 'recording' ? 'Click to Stop & Search' : 'Click to start recording'}
            >
              {status === 'processing' ? (
                <Loader2 className="w-8 h-8" />
              ) : status === 'recording' ? (
                <Mic className="w-9 h-9 animate-bounce" />
              ) : (
                <MicOff className="w-8 h-8" />
              )}
            </button>
          </div>

          {/* Dynamic Audio Visualizer Bars */}
          <div className="h-10 flex items-center justify-center gap-1.5 px-4 py-1">
            {status === 'recording' ? (
              volumeBars.map((height, idx) => {
                const colors = [
                  'bg-blue-500',
                  'bg-red-500',
                  'bg-amber-500',
                  'bg-emerald-500',
                  'bg-indigo-500',
                ];
                return (
                  <div
                    key={idx}
                    style={{ height: `${Math.max(10, Math.min(height, 42))}px` }}
                    className={`w-1.5 rounded-full transition-all duration-75 ${colors[idx % colors.length]}`}
                  />
                );
              })
            ) : (
              <div className="flex items-center gap-1 opacity-40">
                <span className="w-1.5 h-2 bg-slate-400 rounded-full" />
                <span className="w-1.5 h-3 bg-slate-400 rounded-full" />
                <span className="w-1.5 h-4 bg-slate-400 rounded-full" />
                <span className="w-1.5 h-3 bg-slate-400 rounded-full" />
                <span className="w-1.5 h-2 bg-slate-400 rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Live Feedback / Transcript Display */}
        <div className="min-h-[85px] flex flex-col items-center justify-center px-4 py-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl transition-colors">
          {status === 'processing' ? (
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Transcribing audio, please wait...</span>
            </div>
          ) : combinedDisplay ? (
            <div className="space-y-1">
              <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-white leading-relaxed">
                <span>{transcript}</span>
                {interimText && (
                  <span className="text-slate-400 dark:text-slate-500 italic"> {interimText}</span>
                )}
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                Click "Search Now" or pause to execute
              </p>
            </div>
          ) : errorMessage ? (
            <div className="flex items-center space-x-2 text-rose-500 dark:text-rose-400 px-2 py-1 text-xs sm:text-sm text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : status === 'recording' ? (
            <div className="space-y-1">
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Recording your voice...
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                Speak your question, then click "Stop & Search"
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                Try saying: "Nagarpalika citizen property tax", "Hybrid search"...
              </p>
            </div>
          )}
        </div>

        {/* Action Controls & Language Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Language Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={selectedLang}
              onChange={(e) => {
                setSelectedLang(e.target.value);
                setTranscript('');
                setInterimText('');
              }}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium text-xs py-1 px-1.5 rounded-lg focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option
                  key={lang.code}
                  value={lang.code}
                  className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Retry Button */}
            {(errorMessage || status === 'idle') && (
              <button
                type="button"
                onClick={() => {
                  setTranscript('');
                  setInterimText('');
                  startRecording();
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}

            {/* Stop & Search Button (When Recording) */}
            {status === 'recording' && (
              <button
                type="button"
                onClick={handleStopRecording}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center justify-center space-x-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Stop & Search</span>
              </button>
            )}

            {/* Search Now Button (When Transcript Exists) */}
            {combinedDisplay && status !== 'recording' && (
              <button
                type="button"
                onClick={() => submitQuery(combinedDisplay)}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center justify-center space-x-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Helpful browser tips if permission was blocked */}
        {isPermissionDenied && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left text-xs text-amber-700 dark:text-amber-300">
            <p className="font-semibold mb-0.5">How to allow microphone access:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-amber-600/90 dark:text-amber-400/90">
              <li>Click the lock or site settings icon in your browser address bar.</li>
              <li>Toggle "Microphone" to <strong>Allow</strong>.</li>
              <li>Click <strong>Retry</strong> above to start speaking.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
