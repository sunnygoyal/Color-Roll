/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ColorItem, AudioSettings } from './types.ts';
import {
  loadSavedColors,
  saveColors,
  loadSavedSettings,
  saveSettings,
} from './utils/storage.ts';
import {
  speakColorName,
  playDiceLandChime,
  playSpeechStartTing,
  matchesTriggerPhrase,
  requestMicPermission,
} from './utils/audio.ts';
import { getContrastColor } from './utils/colors.ts';
import { ColorEditor } from './components/ColorEditor.tsx';
import { AudioSettingsModal } from './components/AudioSettingsModal.tsx';
import {
  Settings,
  Sliders,
  Volume2,
  VolumeX,
  RotateCw,
  Mic,
  Activity,
} from 'lucide-react';

type SpeechRecognitionType = any;

export default function App() {
  // App views: 'SETUP' (color list) or 'PLAYING' (full-screen color roll)
  const [viewMode, setViewMode] = useState<'SETUP' | 'PLAYING'>('SETUP');
  const [colors, setColors] = useState<ColorItem[]>(() => loadSavedColors());
  const [settings, setSettings] = useState<AudioSettings>(() => loadSavedSettings());
  const [currentColor, setCurrentColor] = useState<ColorItem | null>(null);
  const [isChanging, setIsChanging] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Real-time audio detection states for visual feedback
  const [isListeningActive, setIsListeningActive] = useState<boolean>(false);
  const [isAudioDetected, setIsAudioDetected] = useState<boolean>(false);
  const [lastHeardSnippet, setLastHeardSnippet] = useState<string>('');

  // References for asynchronous speech recognition lifecycle
  const currentColorRef = useRef<ColorItem | null>(currentColor);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const shouldListenRef = useRef<boolean>(false);
  const settingsRef = useRef<AudioSettings>(settings);
  const audioDetectedTimeoutRef = useRef<any>(null);

  useEffect(() => {
    currentColorRef.current = currentColor;
  }, [currentColor]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Persist colors whenever modified
  const handleUpdateColors = (newColors: ColorItem[]) => {
    setColors(newColors);
    saveColors(newColors);
  };

  // Persist settings
  const handleUpdateSettings = (newSettings: AudioSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  /**
   * Helper to mark sound detected and clear after a delay
   */
  const triggerAudioDetected = useCallback((snippet?: string) => {
    setIsAudioDetected(true);
    if (snippet) {
      setLastHeardSnippet(snippet);
    }
    if (audioDetectedTimeoutRef.current) {
      clearTimeout(audioDetectedTimeoutRef.current);
    }
    audioDetectedTimeoutRef.current = setTimeout(() => {
      setIsAudioDetected(false);
      setLastHeardSnippet('');
    }, 900);
  }, []);

  /**
   * Helper to start listening safely (only when speech output is NOT active)
   */
  const startListening = useCallback(() => {
    if (!shouldListenRef.current) return;
    if (isSpeakingRef.current) return;
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) return;

    try {
      if (recognitionRef.current && !isListeningRef.current) {
        recognitionRef.current.start();
      }
    } catch {
      // Recognition might already be starting or transitioning
    }
  }, []);

  /**
   * Helper to stop listening safely
   */
  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.stop();
      }
    } catch {
      // Ignore
    }
    isListeningRef.current = false;
    setIsListeningActive(false);
    setIsAudioDetected(false);
  }, []);

  /**
   * Randomly picks the next color with the strict guarantee:
   * "Same color will not get picked twice in succession"
   */
  const pickNextColor = useCallback(() => {
    if (colors.length === 0 || isChanging) return;

    setIsChanging(true);

    // Stop speech input immediately while color changes and voice announces
    isSpeakingRef.current = true;
    stopListening();

    // Filter out previous color if more than 1 color exists
    const previous = currentColorRef.current;
    let pool = colors;
    if (colors.length > 1 && previous) {
      pool = colors.filter((c) => c.id !== previous.id);
    }

    const nextPick = pool[Math.floor(Math.random() * pool.length)];

    // Smooth transition
    setTimeout(() => {
      setCurrentColor(nextPick);
      setIsChanging(false);

      // Play soft landing chime
      playDiceLandChime(settingsRef.current.soundEffectsEnabled);

      // Speak color name aloud
      speakColorName(nextPick.name, settingsRef.current, () => {
        // Wait for voice output to completely finish (plus 350ms buffer)
        setTimeout(() => {
          isSpeakingRef.current = false;
          if (shouldListenRef.current && !window.speechSynthesis?.speaking) {
            startListening();
            // Ting sound plays ONLY when speech input actually starts AFTER voice finishes
            playSpeechStartTing(settingsRef.current.soundEffectsEnabled);
          }
        }, 350);
      });
    }, 150);
  }, [colors, isChanging, startListening, stopListening]);

  /**
   * Start game: switch from SETUP to PLAYING, request mic, announce first color,
   * then enable speech recognition with "ting"
   */
  const handleStartGame = async () => {
    if (colors.length === 0) return;

    // Explicitly prompt for mic permission if voice control is enabled
    if (settings.voiceControlEnabled) {
      await requestMicPermission();
    }

    setViewMode('PLAYING');

    const initialPick = colors[Math.floor(Math.random() * colors.length)];
    setCurrentColor(initialPick);

    // Stop listening during initial announcement
    isSpeakingRef.current = true;
    stopListening();

    playDiceLandChime(settings.soundEffectsEnabled);

    speakColorName(initialPick.name, settings, () => {
      // Wait for voice output to completely finish before starting speech input
      setTimeout(() => {
        isSpeakingRef.current = false;
        if (shouldListenRef.current && !window.speechSynthesis?.speaking) {
          startListening();
          // Ting plays when speech input starts AFTER voice output finishes
          playSpeechStartTing(settingsRef.current.soundEffectsEnabled);
        }
      }, 350);
    });
  };

  // Re-pronounce current color name
  const handleRepeatVoice = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentColor) {
      isSpeakingRef.current = true;
      stopListening();

      speakColorName(currentColor.name, settings, () => {
        setTimeout(() => {
          isSpeakingRef.current = false;
          if (shouldListenRef.current && !window.speechSynthesis?.speaking) {
            startListening();
            playSpeechStartTing(settingsRef.current.soundEffectsEnabled);
          }
        }, 350);
      });
    }
  };

  /**
   * Initialize and manage SpeechRecognition instance with interimResults & audio detection
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition API not available in this browser');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true; // Crucial for instant responsive recognition
    recognition.maxAlternatives = 5;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListeningActive(true);
    };

    // Detect when user speaks or makes sound
    recognition.onsoundstart = () => {
      triggerAudioDetected();
    };

    recognition.onspeechstart = () => {
      triggerAudioDetected();
    };

    recognition.onspeechend = () => {
      // Allow slight fade out
      setTimeout(() => setIsAudioDetected(false), 500);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListeningActive(false);
      setIsAudioDetected(false);

      // Keep speech input running if user is playing and not currently speaking
      if (shouldListenRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (
            shouldListenRef.current &&
            !isSpeakingRef.current &&
            !isListeningRef.current &&
            !window.speechSynthesis?.speaking
          ) {
            try {
              recognition.start();
            } catch {
              // Ignore restart error
            }
          }
        }, 200);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.debug('Speech recognition event:', event.error);
      }
      if (event.error === 'not-allowed') {
        setIsListeningActive(false);
      }
    };

    recognition.onresult = (event: any) => {
      if (isSpeakingRef.current || (typeof window !== 'undefined' && window.speechSynthesis?.speaking)) {
        return;
      }

      triggerAudioDetected();

      const targetPhrase = settingsRef.current.triggerPhrase || 'next color';

      // Scan all results in this batch
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript;
          if (transcript) {
            setLastHeardSnippet(transcript.trim());
          }

          if (matchesTriggerPhrase(transcript, targetPhrase)) {
            // Trigger next color immediately!
            pickNextColor();
            return;
          }
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    };
  }, [pickNextColor, triggerAudioDetected]);

  /**
   * Coordinate shouldListen flag based on viewMode and settings
   */
  useEffect(() => {
    const isPlaying = viewMode === 'PLAYING';
    const isVoiceControlOn = settings.voiceControlEnabled;
    shouldListenRef.current = isPlaying && isVoiceControlOn;

    if (shouldListenRef.current) {
      if (!isSpeakingRef.current && !window.speechSynthesis?.speaking) {
        startListening();
      }
    } else {
      stopListening();
    }
  }, [viewMode, settings.voiceControlEnabled, startListening, stopListening]);

  // Keyboard shortcut: Space or Enter to pick next color
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === 'Enter') {
        if (viewMode === 'PLAYING' && !isChanging && !isSettingsOpen) {
          e.preventDefault();
          pickNextColor();
        }
      } else if (e.key === 'e' || e.key === 'E') {
        if (!isSettingsOpen) {
          setViewMode((prev) => (prev === 'PLAYING' ? 'SETUP' : 'PLAYING'));
        }
      } else if (e.key === 'm' || e.key === 'M') {
        handleUpdateSettings({
          ...settings,
          speechEnabled: !settings.speechEnabled,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, isChanging, isSettingsOpen, pickNextColor, settings]);

  // Compute contrast on active background in PLAYING mode
  const activeBg = viewMode === 'PLAYING' && currentColor ? currentColor.hex : '#020617';
  const contrast = getContrastColor(activeBg);
  const isDarkText = viewMode === 'PLAYING' && contrast === 'dark';

  const textColorClass = isDarkText ? 'text-slate-950' : 'text-white';
  const subtextColorClass = isDarkText ? 'text-slate-800/80' : 'text-white/80';
  const navBtnClass = isDarkText
    ? 'bg-black/10 hover:bg-black/15 text-slate-900 border-black/15'
    : 'bg-white/10 hover:bg-white/15 text-white border-white/20';

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-500 ease-out select-none ${
        viewMode === 'PLAYING' ? '' : 'bg-slate-950 text-slate-100'
      }`}
      style={{
        backgroundColor: viewMode === 'PLAYING' ? activeBg : undefined,
      }}
    >
      {/* Top Bar */}
      <header
        className={`w-full px-5 sm:px-8 py-4 flex items-center justify-between gap-4 transition-colors z-30 ${
          viewMode === 'PLAYING'
            ? isDarkText
              ? 'border-b border-black/10 bg-black/5'
              : 'border-b border-white/10 bg-black/15'
            : 'border-b border-slate-800 bg-slate-950/80'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className={`text-lg font-black tracking-tight ${textColorClass}`}>
            Color roll
          </span>

          {/* Hands-Free Voice Indicator in Playing Mode */}
          {viewMode === 'PLAYING' && settings.voiceControlEnabled && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                isAudioDetected
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-md animate-pulse scale-105'
                  : isListeningActive
                  ? isDarkText
                    ? 'bg-emerald-950/15 border-emerald-600/30 text-emerald-950'
                    : 'bg-emerald-400/20 border-emerald-300/40 text-emerald-200'
                  : 'opacity-50 border-current'
              }`}
              title={`Say "${settings.triggerPhrase || 'next color'}" to roll`}
            >
              <Mic
                className={`w-3.5 h-3.5 ${
                  isAudioDetected
                    ? 'animate-bounce text-white'
                    : isListeningActive
                    ? 'text-emerald-500'
                    : ''
                }`}
              />
              <span>
                {isAudioDetected
                  ? lastHeardSnippet
                    ? `Hearing: "${lastHeardSnippet}"`
                    : 'Hearing audio...'
                  : isListeningActive
                  ? `Say "${settings.triggerPhrase || 'next color'}"`
                  : 'Mic starting...'}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Voice Mute Toggle */}
          <button
            type="button"
            onClick={() =>
              handleUpdateSettings({
                ...settings,
                speechEnabled: !settings.speechEnabled,
              })
            }
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              settings.speechEnabled
                ? navBtnClass
                : 'bg-rose-950/30 border-rose-900/40 text-rose-400'
            }`}
            title={settings.speechEnabled ? 'Mute speech (M)' : 'Unmute speech (M)'}
            aria-label="Toggle voice"
          >
            {settings.speechEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Audio Settings Dialog trigger */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${navBtnClass}`}
            title="Audio & hands-free preferences"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Edit Colors button when in PLAYING mode */}
          {viewMode === 'PLAYING' && (
            <button
              type="button"
              onClick={() => setViewMode('SETUP')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${navBtnClass}`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Colors</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative w-full">
        {viewMode === 'SETUP' ? (
          /* INITIAL SETUP VIEW */
          <ColorEditor
            colors={colors}
            onUpdateColors={handleUpdateColors}
            onStartGame={handleStartGame}
            onPreviewSpeak={(name) => speakColorName(name, settings)}
          />
        ) : (
          /* PLAY VIEW: WHOLE BACKGROUND IS THE COLOR */
          <div
            onClick={pickNextColor}
            className="flex-1 w-full flex flex-col items-center justify-center px-4 py-8 cursor-pointer relative"
          >
            {/* Center: Selected Color Name and Hex */}
            <div className="text-center space-y-3 max-w-2xl mx-auto my-auto transition-transform duration-200">
              <h1
                className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none ${textColorClass}`}
                style={{ textWrap: 'balance' }}
              >
                {currentColor?.name || 'Ready'}
              </h1>

              <div className="flex items-center justify-center gap-3 pt-2">
                <span
                  className={`text-sm sm:text-base font-mono uppercase tracking-widest font-semibold ${subtextColorClass}`}
                >
                  {currentColor?.hex}
                </span>

                <button
                  type="button"
                  onClick={handleRepeatVoice}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${navBtnClass}`}
                  title="Hear name again"
                  aria-label="Hear pronunciation again"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Next Color Action Button with Voice Detection Pulse Effect */}
            <div
              className="mt-auto mb-6 w-full max-w-xs flex flex-col items-center gap-2.5 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Outer Pulse Waves when speech input is active and detecting audio */}
              {isListeningActive && isAudioDetected && (
                <>
                  <span className="absolute -inset-2.5 rounded-3xl bg-emerald-400/40 animate-ping pointer-events-none" />
                  <span className="absolute -inset-4 rounded-3xl bg-emerald-500/20 animate-pulse pointer-events-none" />
                </>
              )}

              {/* Next Color Button */}
              <button
                type="button"
                onClick={pickNextColor}
                disabled={isChanging || colors.length === 0}
                className={`relative w-full py-4 px-8 rounded-2xl font-black text-lg sm:text-xl shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-3 ${
                  isDarkText
                    ? 'bg-slate-950 text-white hover:bg-slate-900 shadow-black/20'
                    : 'bg-white text-slate-950 hover:bg-slate-100 shadow-black/40'
                } ${
                  /* Pulse effect around Next Color button when detecting voice */
                  isAudioDetected
                    ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-transparent shadow-emerald-500/50 scale-[1.03]'
                    : isListeningActive
                    ? 'ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-transparent'
                    : ''
                }`}
              >
                <RotateCw
                  className={`w-5 h-5 ${isChanging ? 'animate-spin' : ''}`}
                />
                <span>Next Color</span>
              </button>

              {/* Status and Instructions */}
              <div className="flex flex-col items-center text-center gap-1">
                {settings.voiceControlEnabled ? (
                  <div
                    className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isAudioDetected
                        ? 'text-emerald-400 font-bold scale-105'
                        : isDarkText
                        ? 'text-slate-950/90'
                        : 'text-white/90'
                    }`}
                  >
                    {isAudioDetected ? (
                      <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                    ) : (
                      <Mic
                        className={`w-3.5 h-3.5 ${
                          isListeningActive ? 'text-emerald-400 animate-pulse' : 'opacity-60'
                        }`}
                      />
                    )}
                    <span>
                      {isAudioDetected
                        ? lastHeardSnippet
                          ? `Heard &ldquo;${lastHeardSnippet}&rdquo;...`
                          : 'Detecting speech...'
                        : `Say "${settings.triggerPhrase || 'next color'}" to roll`}
                    </span>
                  </div>
                ) : (
                  <span className={`text-[11px] font-medium tracking-wide ${subtextColorClass}`}>
                    Tap screen or press Space
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Audio & Speech Settings Modal */}
      <AudioSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onTestVoice={() =>
          speakColorName(
            currentColor ? currentColor.name : 'Color roll',
            settings
          )
        }
      />
    </div>
  );
}
