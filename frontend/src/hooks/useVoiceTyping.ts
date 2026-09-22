import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../services/api';

interface UseVoiceTypingOptions {
  lang?: string;
  onTranscriptChange?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  autoStopSilenceMs?: number;
}

/**
 * Encodes Float32Array PCM buffers into a 16-bit 16kHz mono WAV Blob.
 */
function exportWAV(buffers: Float32Array[], inputSampleRate: number): Blob {
  let totalLength = 0;
  for (const b of buffers) totalLength += b.length;
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    merged.set(b, offset);
    offset += b.length;
  }

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

export function useVoiceTyping({
  lang = 'en-IN',
  onTranscriptChange,
  onFinalTranscript,
  autoStopSilenceMs = 2800,
}: UseVoiceTypingOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pcmBuffersRef = useRef<Float32Array[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirectServerModeRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>('');
  const baseQueryRef = useRef<string>('');

  // Clean up all audio hardware connections
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {
        // ignore
      }
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
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
    setVoiceVolume(0);
  }, []);

  // Stop listening and finalize transcribed text
  const stopListening = useCallback(async () => {
    setIsListening(false);
    const recordedBuffers = [...pcmBuffersRef.current];
    const sampleRate = audioContextRef.current?.sampleRate || 44100;

    cleanupAudio();

    // If words were captured via Web Speech API
    const spoken = accumulatedTranscriptRef.current.trim();
    if (spoken) {
      setStatusMessage('');
      if (onFinalTranscript) {
        onFinalTranscript(spoken);
      }
      return;
    }

    // If Web Speech didn't capture words (e.g. network/Brave issue), transcribe recorded audio on server
    if (recordedBuffers.length > 5) {
      setIsProcessing(true);
      setStatusMessage('Voice typing in progress...');
      try {
        const wavBlob = exportWAV(recordedBuffers, sampleRate);
        const result = await api.transcribeVoice(wavBlob, lang);
        if (result.transcript && result.transcript.trim()) {
          const finalClean = result.transcript.trim();
          accumulatedTranscriptRef.current = finalClean;
          const fullQuery = baseQueryRef.current
            ? `${baseQueryRef.current} ${finalClean}`.trim()
            : finalClean;
          if (onTranscriptChange) {
            onTranscriptChange(fullQuery);
          }
          if (onFinalTranscript) {
            onFinalTranscript(fullQuery);
          }
          setStatusMessage('');
        } else {
          setStatusMessage('');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not transcribe voice');
      } finally {
        setIsProcessing(false);
      }
    } else {
      setStatusMessage('');
    }
  }, [cleanupAudio, lang, onFinalTranscript, onTranscriptChange]);

  // Start Voice Typing
  const startListening = useCallback(
    async (currentText: string = '') => {
      cleanupAudio();
      setErrorMessage(null);
      accumulatedTranscriptRef.current = '';
      baseQueryRef.current = currentText.trim();
      pcmBuffersRef.current = [];
      isDirectServerModeRef.current = false;

      // 1. Request microphone stream
      let stream: MediaStream;
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Microphone not supported in this browser.');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;
      } catch {
        setErrorMessage('Microphone access denied. Please allow microphone permission.');
        return;
      }

      // 2. Setup AudioContext for live volume and PCM buffer fallback
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const sourceNode = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        sourceNode.connect(analyser);

        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;
        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          pcmBuffersRef.current.push(new Float32Array(input));
        };
        sourceNode.connect(processor);
        processor.connect(audioCtx.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const trackVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setVoiceVolume(Math.min(100, Math.round((avg / 128) * 100)));
          animationFrameRef.current = requestAnimationFrame(trackVolume);
        };
        trackVolume();
      } catch {
        // Fallback without AudioContext if restricted
      }

      setIsListening(true);
      setStatusMessage('Listening... speak now to type');

      // 3. Setup Web Speech API for real-time live typing
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = lang;

          recognition.onresult = (event: any) => {
            let finalTokens = '';
            let interimTokens = '';

            for (let i = 0; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) {
                finalTokens += res[0].transcript + ' ';
              } else {
                interimTokens += res[0].transcript;
              }
            }

            const currentSpoken = (finalTokens + interimTokens).trim();
            accumulatedTranscriptRef.current = currentSpoken;

            // Live voice typing directly into input!
            const combinedText = baseQueryRef.current
              ? `${baseQueryRef.current} ${currentSpoken}`.trim()
              : currentSpoken;

            if (onTranscriptChange) {
              onTranscriptChange(combinedText);
            }

            // Auto-stop silence detector
            if (currentSpoken.length > 2) {
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
              }
              silenceTimerRef.current = setTimeout(() => {
                stopListening();
              }, autoStopSilenceMs);
            }
          };

          recognition.onerror = (event: any) => {
            if (event.error === 'network') {
              // Gracefully handle network restriction without stopping: PCM audio will transcribe on stop!
              isDirectServerModeRef.current = true;
              setStatusMessage('Voice typing active • Speak now, click mic when done');
              return;
            }
            if (event.error === 'no-speech') {
              return;
            }
            if (event.error === 'not-allowed') {
              setErrorMessage('Microphone blocked in browser settings.');
              cleanupAudio();
              setIsListening(false);
            }
          };

          recognition.onend = () => {
            if (!isDirectServerModeRef.current && isListening) {
              // If stopped but still in listening state, finalize
              setIsListening(false);
              cleanupAudio();
            }
          };

          recognition.start();
        } catch {
          isDirectServerModeRef.current = true;
          setStatusMessage('Voice typing active • Speak now, click mic when done');
        }
      } else {
        isDirectServerModeRef.current = true;
        setStatusMessage('Voice typing active • Speak now, click mic when done');
      }
    },
    [autoStopSilenceMs, cleanupAudio, lang, onTranscriptChange, stopListening, isListening]
  );

  const toggleVoiceTyping = useCallback(
    (currentText: string = '') => {
      if (isListening) {
        stopListening();
      } else {
        startListening(currentText);
      }
    },
    [isListening, startListening, stopListening]
  );

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    isListening,
    isProcessing,
    voiceVolume,
    statusMessage,
    errorMessage,
    startListening,
    stopListening,
    toggleVoiceTyping,
  };
}
