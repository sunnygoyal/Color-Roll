/**
 * Color roll - Pure Standard JavaScript App
 * Runs natively in any modern browser using a simple HTTP server.
 */

import { PRESET_PALETTES, QUICK_SWATCH_COLORS } from './data/presets.js';
import { getContrastColor, normalizeHex, suggestColorName } from './utils/colors.js';
import {
  loadSavedColors,
  saveColors,
  loadSavedSettings,
  saveSettings,
} from './utils/storage.js';
import {
  speakColorName,
  playDiceLandChime,
  playSpeechStartTing,
  matchesTriggerPhrase,
  requestMicPermission,
  isSpeechRecognitionSupported,
  getAvailableVoices,
} from './utils/audio.js';

// SVG Icons (Inline for 100% offline self-contained standalone execution)
const ICONS = {
  logo: `<svg class="w-6 h-6 sm:w-7 sm:h-7 shrink-0 drop-shadow select-none transition-transform duration-300 hover:scale-105" viewBox="0 0 32 32" fill="none" aria-label="Color roll icon">
    <defs>
      <linearGradient id="cr-top-ui" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF4B72" />
        <stop offset="100%" stop-color="#FF8A3D" />
      </linearGradient>
      <linearGradient id="cr-left-ui" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7C3AED" />
        <stop offset="100%" stop-color="#3B82F6" />
      </linearGradient>
      <linearGradient id="cr-right-ui" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#059669" />
        <stop offset="100%" stop-color="#10B981" />
      </linearGradient>
    </defs>
    <g>
      <path d="M16 3.6 L26.4 9.6 C26.9 9.9 26.9 10.5 26.4 10.8 L16.4 16.5 C16.1 16.7 15.9 16.7 15.6 16.5 L5.6 10.8 C5.1 10.5 5.1 9.9 5.6 9.6 L15.6 3.6 C15.8 3.5 16.2 3.5 16 3.6 Z" fill="url(#cr-top-ui)" stroke="rgba(0,0,0,0.15)" stroke-width="0.6" stroke-linejoin="round" />
      <path d="M5.3 11.2 L15.3 16.9 C15.7 17.1 16 17.5 16 18.0 L16 27.1 C16 27.7 15.4 28.1 14.9 27.8 L4.9 22.1 C4.5 21.9 4.3 21.5 4.3 21.0 L4.3 12.1 C4.3 11.5 4.9 11.0 5.3 11.2 Z" fill="url(#cr-left-ui)" stroke="rgba(0,0,0,0.18)" stroke-width="0.6" stroke-linejoin="round" />
      <path d="M26.7 11.2 L16.7 16.9 C16.3 17.1 16 17.5 16 18.0 L16 27.1 C16 27.7 16.6 28.1 17.1 27.8 L27.1 22.1 C27.5 21.9 27.7 21.5 27.7 21.0 L27.7 12.1 C27.7 11.5 27.1 11.0 26.7 11.2 Z" fill="url(#cr-right-ui)" stroke="rgba(0,0,0,0.18)" stroke-width="0.6" stroke-linejoin="round" />
    </g>
    <path d="M16 4 L16 16.5" stroke="rgba(255,255,255,0.3)" stroke-width="0.6" stroke-linecap="round" />
    <path d="M5.8 10.2 L16 16.5 L26.2 10.2" stroke="rgba(255,255,255,0.22)" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="12" cy="8.2" r="1.15" fill="#FFFFFF" fill-opacity="0.95" />
    <circle cx="16" cy="10.5" r="1.3" fill="#FFFFFF" fill-opacity="0.98" />
    <circle cx="20" cy="12.8" r="1.15" fill="#FFFFFF" fill-opacity="0.95" />
    <circle cx="8.8" cy="16.6" r="1.15" fill="#FFFFFF" fill-opacity="0.95" />
    <circle cx="12.5" cy="22.2" r="1.15" fill="#FFFFFF" fill-opacity="0.95" />
    <circle cx="19.2" cy="16.5" r="1.1" fill="#FFFFFF" fill-opacity="0.95" />
    <circle cx="23.8" cy="14.3" r="1.1" fill="#FFFFFF" fill-opacity="0.95" />
    <circle cx="19.2" cy="22.3" r="1.1" fill="#FFFFFF" fill-opacity="0.95" />
    <circle cx="23.8" cy="20.1" r="1.1" fill="#FFFFFF" fill-opacity="0.95" />
  </svg>`,
  volume: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  volumeX: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`,
  settings: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  sliders: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
  play: `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  plus: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  rotateCw: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  rotateCcw: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  chevronUp: `<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
  chevronDown: `<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  x: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  mic: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  activity: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  maximize: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
  minimize: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`,
};

// Application State
class StateStore {
  constructor() {
    this.viewMode = 'SETUP'; // 'SETUP' | 'PLAYING'
    this.colors = loadSavedColors();
    this.settings = loadSavedSettings();
    this.currentColor = null;
    this.isChanging = false;
    this.isSettingsOpen = false;
    this.isAddModalOpen = false;

    // Add modal temporary form values
    this.newHex = '#3B82F6';
    this.newName = 'Blue';

    // Inline edit in setup list
    this.editingId = null;
    this.editNameText = '';

    // Hands-free voice states
    this.isListeningActive = false;
    this.isAudioDetected = false;
    this.lastHeardSnippet = '';
    this.isRecordingPhraseInSettings = false;

    // Cooldown timer for 2-second gap between color changes
    this.lastChangeTime = 0;

    // Internal flags
    this.isSpeaking = false;
    this.recognition = null;
    this.settingsRecognition = null;
    this.audioTimeout = null;

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.lang = 'en-US';

    rec.onstart = () => {
      this.isListeningActive = true;
      render();
    };

    rec.onsoundstart = () => {
      this.triggerAudioDetected();
    };

    rec.onspeechstart = () => {
      this.triggerAudioDetected();
    };

    rec.onspeechend = () => {
      setTimeout(() => {
        this.isAudioDetected = false;
        render();
      }, 500);
    };

    rec.onend = () => {
      this.isListeningActive = false;
      this.isAudioDetected = false;

      // Auto-restart if in playing mode and not speaking
      if (this.viewMode === 'PLAYING' && this.settings.voiceControlEnabled && !this.isSpeaking) {
        setTimeout(() => {
          if (this.viewMode === 'PLAYING' && this.settings.voiceControlEnabled && !this.isSpeaking && !this.isListeningActive) {
            try {
              rec.start();
            } catch {}
          }
        }, 200);
      }
      render();
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech') {
        console.debug('Recognition error:', e.error);
      }
    };

    rec.onresult = (event) => {
      if (this.isSpeaking || (window.speechSynthesis && window.speechSynthesis.speaking)) {
        return;
      }

      this.triggerAudioDetected();

      const targetPhrase = this.settings.triggerPhrase || 'next color';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript;
          if (transcript) {
            this.lastHeardSnippet = transcript.trim();
          }

          if (matchesTriggerPhrase(transcript, targetPhrase)) {
            this.pickNextColor();
            return;
          }
        }
      }
      render();
    };

    this.recognition = rec;
  }

  triggerAudioDetected(snippet) {
    this.isAudioDetected = true;
    if (snippet) this.lastHeardSnippet = snippet;
    if (this.audioTimeout) clearTimeout(this.audioTimeout);
    this.audioTimeout = setTimeout(() => {
      this.isAudioDetected = false;
      this.lastHeardSnippet = '';
      render();
    }, 900);
    render();
  }

  startListening() {
    if (this.viewMode !== 'PLAYING' || !this.settings.voiceControlEnabled) return;
    if (this.isSpeaking || (window.speechSynthesis && window.speechSynthesis.speaking)) return;

    try {
      if (this.recognition && !this.isListeningActive) {
        this.recognition.start();
      }
    } catch {}
  }

  stopListening() {
    try {
      if (this.recognition && this.isListeningActive) {
        this.recognition.stop();
      }
    } catch {}
    this.isListeningActive = false;
    this.isAudioDetected = false;
  }

  async startGame() {
    if (this.colors.length === 0) return;

    if (this.settings.voiceControlEnabled) {
      await requestMicPermission();
    }

    this.viewMode = 'PLAYING';
    this.lastChangeTime = Date.now();
    const initialPick = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.currentColor = initialPick;

    this.isSpeaking = true;
    this.stopListening();
    playDiceLandChime(this.settings.soundEffectsEnabled);

    const cooldownMs = (this.settings.rollCooldown ?? 2) * 1000;

    speakColorName(initialPick.name, this.settings, () => {
      // Start mic after the configured timeout has elapsed since color was selected
      const elapsed = Date.now() - this.lastChangeTime;
      const remainingWait = Math.max(cooldownMs - elapsed, 200);

      setTimeout(() => {
        this.isSpeaking = false;
        if (this.viewMode === 'PLAYING' && this.settings.voiceControlEnabled) {
          this.startListening();
          playSpeechStartTing(this.settings.soundEffectsEnabled);
        }
        render();
      }, remainingWait);
    });

    render();
  }

  pickNextColor() {
    const now = Date.now();
    const cooldownMs = (this.settings.rollCooldown ?? 2) * 1000;
    // Configurable gap between color changes: ignore multiple fast taps
    if (this.colors.length === 0 || this.isChanging || (now - this.lastChangeTime < cooldownMs)) {
      return;
    }

    this.lastChangeTime = now;
    this.isChanging = true;
    this.isSpeaking = true;
    this.stopListening();
    render();

    const previous = this.currentColor;
    let pool = this.colors;
    if (this.colors.length > 1 && previous) {
      pool = this.colors.filter((c) => c.id !== previous.id);
    }
    const nextPick = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      this.currentColor = nextPick;
      this.isChanging = false;

      playDiceLandChime(this.settings.soundEffectsEnabled);

      speakColorName(nextPick.name, this.settings, () => {
        // Start mic after the same timeout has elapsed since color was picked
        const elapsed = Date.now() - this.lastChangeTime;
        const remainingWait = Math.max(cooldownMs - elapsed, 200);

        setTimeout(() => {
          this.isSpeaking = false;
          if (this.viewMode === 'PLAYING' && this.settings.voiceControlEnabled) {
            this.startListening();
            playSpeechStartTing(this.settings.soundEffectsEnabled);
          }
          render();
        }, remainingWait);
      });

      render();
    }, 150);
  }

  repeatVoice() {
    if (this.currentColor) {
      this.isSpeaking = true;
      this.stopListening();
      render();

      speakColorName(this.currentColor.name, this.settings, () => {
        setTimeout(() => {
          this.isSpeaking = false;
          if (this.viewMode === 'PLAYING' && this.settings.voiceControlEnabled) {
            this.startListening();
            playSpeechStartTing(this.settings.soundEffectsEnabled);
          }
          render();
        }, 350);
      });
    }
  }

  updateColors(newColors) {
    this.colors = newColors;
    saveColors(newColors);
    render();
  }

  updateSettings(newSettings) {
    this.settings = newSettings;
    saveSettings(newSettings);
    if (!this.settings.voiceControlEnabled) {
      this.stopListening();
    } else if (this.viewMode === 'PLAYING' && !this.isSpeaking) {
      this.startListening();
    }
    render();
  }
}

const store = new StateStore();

// Fullscreen management helpers
function isFullscreen() {
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

function toggleFullscreen() {
  try {
    if (!isFullscreen()) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  } catch (err) {
    console.debug('Fullscreen error:', err);
  }
}

// Keep UI synchronized with fullscreen state
['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
  (evt) => {
    document.addEventListener(evt, () => {
      render();
    });
  }
);

// Attach global keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    e.target instanceof HTMLSelectElement
  ) {
    return;
  }

  if (e.code === 'Space' || e.key === 'Enter') {
    if (store.viewMode === 'PLAYING' && !store.isChanging && !store.isSettingsOpen) {
      e.preventDefault();
      store.pickNextColor();
    }
  } else if (e.key === 'e' || e.key === 'E') {
    if (!store.isSettingsOpen) {
      if (store.viewMode === 'PLAYING') {
        store.stopListening();
        store.viewMode = 'SETUP';
      } else {
        store.startGame();
      }
      render();
    }
  } else if (e.key === 'm' || e.key === 'M') {
    store.updateSettings({
      ...store.settings,
      speechEnabled: !store.settings.speechEnabled,
    });
  } else if (e.key === 'f' || e.key === 'F') {
    if (!store.isSettingsOpen && !store.isAddModalOpen) {
      e.preventDefault();
      toggleFullscreen();
    }
  }
});

/**
 * Main DOM render function
 */
function render() {
  const root = document.getElementById('root');
  if (!root) return;

  const isPlaying = store.viewMode === 'PLAYING';
  const activeBg = isPlaying && store.currentColor ? store.currentColor.hex : '#020617';
  const contrast = getContrastColor(activeBg);
  const isDarkText = isPlaying && contrast === 'dark';

  const textColor = isDarkText ? 'text-slate-950' : 'text-white';
  const subtextColor = isDarkText ? 'text-slate-800/80' : 'text-white/80';
  const navBtn = isDarkText
    ? 'bg-black/10 hover:bg-black/15 text-slate-900 border-black/15'
    : 'bg-white/10 hover:bg-white/15 text-white border-white/20';

  // Strictly lock document scroll when in playing mode so no scrollbars or rubber-banding appear
  if (isPlaying) {
    document.documentElement.classList.add('overflow-hidden', 'h-screen', 'no-scroll');
    document.body.classList.add('overflow-hidden', 'h-screen', 'no-scroll');
    document.documentElement.style.backgroundColor = activeBg;
    document.body.style.backgroundColor = activeBg;
  } else {
    document.documentElement.classList.remove('overflow-hidden', 'h-screen', 'no-scroll');
    document.body.classList.remove('overflow-hidden', 'h-screen', 'no-scroll');
    document.documentElement.style.backgroundColor = '#020617';
    document.body.style.backgroundColor = '#020617';
  }

  root.style.backgroundColor = isPlaying ? activeBg : '#020617';

  root.innerHTML = `
    <div
      style="background-color: ${isPlaying ? activeBg : '#020617'};"
      class="${
        isPlaying
          ? 'fixed inset-0 w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-hidden no-scroll flex flex-col justify-between transition-colors duration-500 ease-out select-none'
          : 'min-h-screen flex flex-col justify-between transition-colors duration-500 ease-out select-none bg-slate-950 text-slate-100'
      }">
      <!-- Top Bar -->
      <header onclick="event.stopPropagation()" class="shrink-0 w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-4 transition-colors z-30 ${
        isPlaying
          ? isDarkText
            ? 'border-b border-black/10 bg-black/5'
            : 'border-b border-white/10 bg-black/15'
          : 'border-b border-slate-800 bg-slate-950/80'
      }">
        <div class="flex items-center gap-2 sm:gap-2.5">
          ${ICONS.logo}
          <span class="text-base sm:text-lg font-black tracking-tight ${textColor}">
            Color roll
          </span>

          ${
            isPlaying && store.settings.voiceControlEnabled
              ? `
            <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              store.isAudioDetected
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-md animate-pulse scale-105'
                : store.isListeningActive
                ? isDarkText
                  ? 'bg-emerald-950/15 border-emerald-600/30 text-emerald-950'
                  : 'bg-emerald-400/20 border-emerald-300/40 text-emerald-200'
                : 'opacity-50 border-current'
            }">
              <span class="${store.isAudioDetected ? 'animate-bounce text-white' : store.isListeningActive ? 'text-emerald-500' : ''}">
                ${ICONS.mic}
              </span>
              <span>
                ${
                  store.isAudioDetected
                    ? store.lastHeardSnippet
                      ? `Hearing: "${store.lastHeardSnippet}"`
                      : 'Hearing audio...'
                    : store.isListeningActive
                    ? `Say "${store.settings.triggerPhrase || 'next color'}"`
                    : 'Mic starting...'
                }
              </span>
            </div>
          `
              : ''
          }
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <!-- Fullscreen button -->
          <button
            id="btn-toggle-fullscreen"
            class="p-2 rounded-xl border transition-colors cursor-pointer ${navBtn}"
            title="${isFullscreen() ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}"
            aria-label="${isFullscreen() ? 'Exit fullscreen' : 'Enter fullscreen'}"
          >
            ${isFullscreen() ? ICONS.minimize : ICONS.maximize}
          </button>

          <button
            id="btn-toggle-voice"
            class="p-2 rounded-xl border transition-colors cursor-pointer ${
              store.settings.speechEnabled
                ? navBtn
                : 'bg-rose-950/30 border-rose-900/40 text-rose-400'
            }"
            title="${store.settings.speechEnabled ? 'Mute speech (M)' : 'Unmute speech (M)'}"
          >
            ${store.settings.speechEnabled ? ICONS.volume : ICONS.volumeX}
          </button>

          <button
            id="btn-open-settings"
            class="p-2 rounded-xl border transition-colors cursor-pointer ${navBtn}"
            title="Audio & hands-free preferences"
          >
            ${ICONS.settings}
          </button>

          ${
            isPlaying
              ? `
            <button
              id="btn-edit-colors"
              class="px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${navBtn}"
            >
              ${ICONS.sliders}
              <span>Edit Colors</span>
            </button>
          `
              : ''
          }
        </div>
      </header>

      <!-- Main Screen -->
      <main class="flex-1 w-full overflow-hidden flex flex-col items-center justify-center relative">
        ${
          !isPlaying
            ? renderSetupView()
            : `
          <!-- Full Screen Play View: tap anywhere to roll next color -->
          <div id="play-stage" class="flex-1 w-full h-full overflow-hidden flex flex-col items-center justify-center px-6 py-4 cursor-pointer relative select-none touch-manipulation">
            <div class="text-center space-y-3 sm:space-y-4 max-w-4xl mx-auto my-auto transition-transform duration-200 pointer-events-none">
              <h1 class="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none ${textColor}" style="text-wrap: balance;">
                ${store.currentColor ? store.currentColor.name : 'Ready'}
              </h1>

              <div class="pt-1 sm:pt-2">
                <span class="text-sm sm:text-base md:text-lg font-mono uppercase tracking-widest font-semibold ${subtextColor}">
                  ${store.currentColor ? store.currentColor.hex : ''}
                </span>
              </div>
            </div>
          </div>
        `
        }
      </main>

      <!-- Add Color Modal -->
      ${store.isAddModalOpen ? renderAddModal() : ''}

      <!-- Settings Modal -->
      ${store.isSettingsOpen ? renderSettingsModal() : ''}
    </div>
  `;

  bindEvents();
}

/**
 * Render Setup Color List View
 */
function renderSetupView() {
  return `
    <div class="w-full max-w-2xl mx-auto px-4 pt-4 pb-28">
      <div class="space-y-2.5">
        ${store.colors
          .map((c, index) => {
            const contrast = getContrastColor(c.hex);
            const isEditing = store.editingId === c.id;

            return `
            <div class="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors">
              <!-- Swatch with native picker -->
              <div class="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-sm border border-white/10 group">
                <input
                  type="color"
                  value="${c.hex}"
                  data-color-id="${c.id}"
                  class="input-change-color absolute -inset-4 w-20 h-20 opacity-0 cursor-pointer"
                  title="Change this color"
                />
                <div class="w-full h-full flex items-center justify-center" style="background-color: ${c.hex}">
                  <span class="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity ${
                    contrast === 'dark' ? 'text-black' : 'text-white'
                  }">✎</span>
                </div>
              </div>

              <!-- Name & Hex -->
              <div class="flex-1 min-w-0">
                ${
                  isEditing
                    ? `
                  <div class="flex items-center gap-1.5">
                    <input
                      type="text"
                      id="inline-edit-input"
                      value="${store.editNameText}"
                      class="w-full bg-slate-950 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                    />
                    <button data-save-id="${c.id}" class="btn-save-inline text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg cursor-pointer">
                      Save
                    </button>
                  </div>
                `
                    : `
                  <div data-edit-id="${c.id}" class="btn-start-inline-edit cursor-pointer group flex items-baseline gap-2 truncate" title="Click to rename">
                    <span class="text-sm font-semibold text-slate-100 group-hover:text-blue-400 truncate">
                      ${c.name}
                    </span>
                    <span class="text-[11px] font-mono text-slate-500 uppercase">
                      ${c.hex}
                    </span>
                  </div>
                `
                }
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-1 shrink-0">
                <button
                  data-speak-name="${c.name}"
                  class="btn-speak-item p-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
                  title="Hear pronunciation"
                >
                  ${ICONS.volume}
                </button>

                <div class="flex flex-col">
                  <button
                    data-move-up="${index}"
                    ${index === 0 ? 'disabled' : ''}
                    class="btn-move-up text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer p-0.5"
                    title="Move up"
                  >
                    ${ICONS.chevronUp}
                  </button>
                  <button
                    data-move-down="${index}"
                    ${index === store.colors.length - 1 ? 'disabled' : ''}
                    class="btn-move-down text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer p-0.5"
                    title="Move down"
                  >
                    ${ICONS.chevronDown}
                  </button>
                </div>

                <button
                  data-delete-id="${c.id}"
                  ${store.colors.length <= 1 ? 'disabled' : ''}
                  class="btn-delete-color p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-20 transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
                  title="Remove color"
                >
                  ${ICONS.trash}
                </button>
              </div>
            </div>
          `;
          })
          .join('')}

        <!-- Add Color button at end of list -->
        <button
          id="btn-open-add-modal"
          class="w-full py-3 px-4 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer group"
        >
          <div class="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
            ${ICONS.plus}
          </div>
          <span>Add Color</span>
        </button>
      </div>

      <!-- Two Fixed Bottom Buttons -->
      <div class="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-3.5 shadow-2xl">
        <div class="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            id="btn-reset-defaults"
            class="px-4 py-3 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            ${ICONS.rotateCcw}
            <span>Reset Defaults</span>
          </button>

          <button
            id="btn-start-game"
            ${store.colors.length === 0 ? 'disabled' : ''}
            class="flex-1 py-3 px-6 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
          >
            ${ICONS.play}
            <span>Start Game</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Add Color Modal Overlay
 */
function renderAddModal() {
  const contrast = getContrastColor(store.newHex);

  return `
    <div id="modal-overlay-add" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 text-slate-100" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 class="font-bold text-base text-white">Add Color</h3>
          <button id="btn-close-add-modal" class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
            ${ICONS.x}
          </button>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-400">Pick a predefined shade</label>
          <div class="flex flex-wrap gap-1.5">
            ${QUICK_SWATCH_COLORS.map(
              (swatch) => `
              <button
                type="button"
                data-swatch-hex="${swatch.hex}"
                data-swatch-name="${swatch.name}"
                class="btn-quick-swatch w-7 h-7 rounded-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer relative ${
                  store.newHex.toLowerCase() === swatch.hex.toLowerCase()
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105'
                    : 'opacity-85 hover:opacity-100'
                }"
                style="background-color: ${swatch.hex}"
                title="${swatch.name} (${swatch.hex})"
              ></button>
            `
            ).join('')}
          </div>
        </div>

        <form id="form-add-color" class="space-y-4 pt-1">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-400">Custom color & picker</label>
            <div class="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div class="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-inner">
                <input
                  type="color"
                  id="modal-native-picker"
                  value="${store.newHex}"
                  class="absolute -inset-4 w-24 h-24 cursor-pointer opacity-0"
                />
                <div class="w-full h-full flex items-center justify-center font-bold text-xs" style="background-color: ${store.newHex}">
                  <div class="w-2.5 h-2.5 rounded-full ${contrast === 'dark' ? 'bg-black/60' : 'bg-white/80'}"></div>
                </div>
              </div>
              <label for="modal-native-picker" class="text-xs font-mono text-slate-300 font-medium cursor-pointer uppercase pr-2 hover:text-white">
                ${store.newHex} (Click swatch to pick)
              </label>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-400">Color name</label>
            <div class="flex items-center gap-2">
              <input
                type="text"
                id="modal-color-name"
                value="${store.newName}"
                placeholder="e.g. Sunflower Yellow"
                class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
                maxlength="30"
              />
              <button
                type="button"
                id="btn-preview-new-voice"
                class="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0"
                title="Hear how name sounds"
              >
                ${ICONS.volume}
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              id="btn-cancel-add-modal"
              class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer"
            >
              Add Color
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Render Audio & Voice Settings Modal
 */
function renderSettingsModal() {
  const hasSpeechRec = isSpeechRecognitionSupported();
  const voices = getAvailableVoices();

  return `
    <div id="modal-overlay-settings" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-blue-400">${ICONS.volume}</span>
            <h3 class="font-bold text-base text-white">Audio & Voice Settings</h3>
          </div>
          <button id="btn-close-settings-modal" class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
            ${ICONS.x}
          </button>
        </div>

        <div class="space-y-5">
          <!-- Hands-Free Voice Section -->
          <div class="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="text-emerald-400">${ICONS.mic}</span>
                <div>
                  <div class="text-sm font-bold text-white">Hands-Free Voice Roll</div>
                  <div class="text-xs text-slate-400">Listens and rolls when phrase is spoken</div>
                </div>
              </div>
              <button
                id="toggle-hands-free"
                class="w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  store.settings.voiceControlEnabled ? 'bg-emerald-600' : 'bg-slate-800'
                }"
              >
                <div class="w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  store.settings.voiceControlEnabled ? 'left-7' : 'left-1'
                }"></div>
              </button>
            </div>

            ${
              store.settings.voiceControlEnabled
                ? `
              <div class="space-y-3 pt-2 border-t border-slate-800">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-semibold text-slate-300">Trigger Phrase</label>
                  <span class="text-[11px] text-slate-500">Type or click &ldquo;Speak phrase&rdquo;</span>
                </div>

                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    id="settings-trigger-phrase"
                    value="${store.settings.triggerPhrase}"
                    placeholder="e.g. Next color"
                    class="flex-1 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />

                  <button
                    id="btn-record-phrase"
                    class="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      store.isRecordingPhraseInSettings
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }"
                  >
                    ${ICONS.mic}
                    <span>${store.isRecordingPhraseInSettings ? 'Listening...' : 'Speak Phrase'}</span>
                  </button>
                </div>

                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                  <span class="text-[10px] text-slate-500 mr-1">Quick pick:</span>
                  ${['Next color', 'Next', 'Roll', 'Change color']
                    .map(
                      (preset) => `
                    <button
                      type="button"
                      data-pick-trigger="${preset}"
                      class="btn-pick-trigger text-[11px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        store.settings.triggerPhrase.toLowerCase() === preset.toLowerCase()
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }"
                    >
                      ${preset}
                    </button>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Speak Color Name Toggle -->
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-white">Speak Color Name</div>
              <div class="text-xs text-slate-400">Announces color aloud when selected</div>
            </div>
            <button
              id="toggle-speech-enabled"
              class="w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                store.settings.speechEnabled ? 'bg-blue-600' : 'bg-slate-800'
              }"
            >
              <div class="w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                store.settings.speechEnabled ? 'left-7' : 'left-1'
              }"></div>
            </button>
          </div>

          <!-- Sound FX & Ting Toggle -->
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-white">Sound Effects & Ting</div>
              <div class="text-xs text-slate-400">Plays landing chime and &ldquo;ting&rdquo; when mic opens</div>
            </div>
            <button
              id="toggle-sfx-enabled"
              class="w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                store.settings.soundEffectsEnabled ? 'bg-blue-600' : 'bg-slate-800'
              }"
            >
              <div class="w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                store.settings.soundEffectsEnabled ? 'left-7' : 'left-1'
              }"></div>
            </button>
          </div>

          <!-- Configurable Timeout & Mic Delay -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-slate-300">Roll Gap & Mic Delay</span>
              <span class="font-mono text-emerald-400 font-bold" id="cooldown-display">${(store.settings.rollCooldown ?? 2).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              id="input-cooldown"
              min="0.5"
              max="5"
              step="0.5"
              value="${store.settings.rollCooldown ?? 2}"
              class="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div class="flex justify-between text-[10px] text-slate-500">
              <span>0.5s</span>
              <span>2.0s</span>
              <span>5.0s</span>
            </div>
            <div class="text-[11px] text-slate-400">
              Multiple fast taps within this timeout are ignored, and the mic restarts after this delay.
            </div>
          </div>

          <!-- Speech Rate -->
          ${
            store.settings.speechEnabled
              ? `
            <div class="space-y-2 pt-2 border-t border-slate-800">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-300">Speech Rate</span>
                <span class="font-mono text-slate-400">${store.settings.speechRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                id="input-speech-rate"
                min="0.6"
                max="1.4"
                step="0.1"
                value="${store.settings.speechRate}"
                class="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div class="flex justify-between text-[10px] text-slate-500">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
          `
              : ''
          }

          <!-- Voices dropdown -->
          ${
            store.settings.speechEnabled && voices.length > 0
              ? `
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-300">Voice Selection</label>
              <select
                id="select-voice"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              >
                <option value="">Default System Voice</option>
                ${voices
                  .map(
                    (v) => `
                  <option value="${v.voiceURI}" ${store.settings.voiceURI === v.voiceURI ? 'selected' : ''}>
                    ${v.name} (${v.lang})
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>
          `
              : ''
          }

          <!-- Test Voice Button -->
          ${
            store.settings.speechEnabled
              ? `
            <button
              id="btn-test-voice-pronunciation"
              class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              ${ICONS.play}
              <span>Test Voice Pronunciation</span>
            </button>
          `
              : ''
          }
        </div>

        <div class="pt-2">
          <button
            id="btn-done-settings"
            class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Bind DOM Event Listeners
 */
function bindEvents() {
  // Header: Toggle Fullscreen
  const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
  if (btnToggleFullscreen) {
    btnToggleFullscreen.onclick = () => {
      toggleFullscreen();
    };
  }

  // Header: Toggle voice
  const btnToggleVoice = document.getElementById('btn-toggle-voice');
  if (btnToggleVoice) {
    btnToggleVoice.onclick = () => {
      store.updateSettings({
        ...store.settings,
        speechEnabled: !store.settings.speechEnabled,
      });
    };
  }

  // Header: Open Settings
  const btnOpenSettings = document.getElementById('btn-open-settings');
  if (btnOpenSettings) {
    btnOpenSettings.onclick = () => {
      store.isSettingsOpen = true;
      render();
    };
  }

  // Header: Edit colors
  const btnEditColors = document.getElementById('btn-edit-colors');
  if (btnEditColors) {
    btnEditColors.onclick = () => {
      store.stopListening();
      store.viewMode = 'SETUP';
      render();
    };
  }

  // Play Stage: Click anywhere on the screen to roll next color
  const playStage = document.getElementById('play-stage');
  if (playStage) {
    playStage.onclick = () => {
      store.pickNextColor();
    };
  }

  // Setup: Start Game
  const btnStartGame = document.getElementById('btn-start-game');
  if (btnStartGame) {
    btnStartGame.onclick = () => store.startGame();
  }

  // Setup: Reset Defaults
  const btnResetDefaults = document.getElementById('btn-reset-defaults');
  if (btnResetDefaults) {
    btnResetDefaults.onclick = () => {
      const defaultSix = PRESET_PALETTES[0].colors.map((c, i) => ({
        id: `default-${i}-${Date.now()}`,
        name: c.name,
        hex: c.hex,
      }));
      store.updateColors(defaultSix);
    };
  }

  // Setup: Open Add Modal
  const btnOpenAddModal = document.getElementById('btn-open-add-modal');
  if (btnOpenAddModal) {
    btnOpenAddModal.onclick = () => {
      const available =
        QUICK_SWATCH_COLORS.find(
          (swatch) => !store.colors.some((c) => c.hex.toLowerCase() === swatch.hex.toLowerCase())
        ) || QUICK_SWATCH_COLORS[0];

      store.newHex = available.hex;
      store.newName = available.name;
      store.isAddModalOpen = true;
      render();
    };
  }

  // Setup: Change color in row
  document.querySelectorAll('.input-change-color').forEach((el) => {
    el.onchange = (e) => {
      const id = e.target.getAttribute('data-color-id');
      const hex = normalizeHex(e.target.value);
      store.updateColors(store.colors.map((c) => (c.id === id ? { ...c, hex } : c)));
    };
  });

  // Setup: Delete color
  document.querySelectorAll('.btn-delete-color').forEach((el) => {
    el.onclick = (e) => {
      const id = e.currentTarget.getAttribute('data-delete-id');
      if (store.colors.length <= 1) return;
      store.updateColors(store.colors.filter((c) => c.id !== id));
    };
  });

  // Setup: Speak preview
  document.querySelectorAll('.btn-speak-item').forEach((el) => {
    el.onclick = (e) => {
      const name = e.currentTarget.getAttribute('data-speak-name');
      speakColorName(name, store.settings);
    };
  });

  // Setup: Reorder Up
  document.querySelectorAll('.btn-move-up').forEach((el) => {
    el.onclick = (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-move-up'), 10);
      if (idx > 0) {
        const arr = [...store.colors];
        const [moved] = arr.splice(idx, 1);
        arr.splice(idx - 1, 0, moved);
        store.updateColors(arr);
      }
    };
  });

  // Setup: Reorder Down
  document.querySelectorAll('.btn-move-down').forEach((el) => {
    el.onclick = (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-move-down'), 10);
      if (idx < store.colors.length - 1) {
        const arr = [...store.colors];
        const [moved] = arr.splice(idx, 1);
        arr.splice(idx + 1, 0, moved);
        store.updateColors(arr);
      }
    };
  });

  // Setup: Start inline edit
  document.querySelectorAll('.btn-start-inline-edit').forEach((el) => {
    el.onclick = (e) => {
      const id = e.currentTarget.getAttribute('data-edit-id');
      const item = store.colors.find((c) => c.id === id);
      if (item) {
        store.editingId = id;
        store.editNameText = item.name;
        render();
        const input = document.getElementById('inline-edit-input');
        if (input) input.focus();
      }
    };
  });

  // Setup: Save inline edit
  const btnSaveInline = document.querySelector('.btn-save-inline');
  if (btnSaveInline) {
    btnSaveInline.onclick = (e) => {
      const id = e.currentTarget.getAttribute('data-save-id');
      const input = document.getElementById('inline-edit-input');
      const val = input ? input.value.trim() : '';
      if (val) {
        store.updateColors(store.colors.map((c) => (c.id === id ? { ...c, name: val } : c)));
      }
      store.editingId = null;
      render();
    };
  }

  // Add Modal: Close / Cancel
  const btnCloseAdd = document.getElementById('btn-close-add-modal');
  const btnCancelAdd = document.getElementById('btn-cancel-add-modal');
  const overlayAdd = document.getElementById('modal-overlay-add');
  const closeAdd = () => {
    store.isAddModalOpen = false;
    render();
  };
  if (btnCloseAdd) btnCloseAdd.onclick = closeAdd;
  if (btnCancelAdd) btnCancelAdd.onclick = closeAdd;
  if (overlayAdd) overlayAdd.onclick = closeAdd;

  // Add Modal: Quick swatches
  document.querySelectorAll('.btn-quick-swatch').forEach((el) => {
    el.onclick = (e) => {
      store.newHex = e.currentTarget.getAttribute('data-swatch-hex');
      store.newName = e.currentTarget.getAttribute('data-swatch-name');
      render();
    };
  });

  // Add Modal: Native picker
  const modalPicker = document.getElementById('modal-native-picker');
  if (modalPicker) {
    modalPicker.onchange = (e) => {
      store.newHex = e.target.value;
      store.newName = suggestColorName(e.target.value);
      render();
    };
  }

  // Add Modal: Color name input
  const modalNameInput = document.getElementById('modal-color-name');
  if (modalNameInput) {
    modalNameInput.oninput = (e) => {
      store.newName = e.target.value;
    };
  }

  // Add Modal: Voice preview
  const btnPreviewNewVoice = document.getElementById('btn-preview-new-voice');
  if (btnPreviewNewVoice) {
    btnPreviewNewVoice.onclick = () => {
      speakColorName(store.newName || 'Color', store.settings);
    };
  }

  // Add Modal: Form Submit
  const formAdd = document.getElementById('form-add-color');
  if (formAdd) {
    formAdd.onsubmit = (e) => {
      e.preventDefault();
      const trimmed = store.newName.trim();
      if (!trimmed) return;

      const newItem = {
        id: `color-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: trimmed,
        hex: normalizeHex(store.newHex),
      };

      store.colors.push(newItem);
      saveColors(store.colors);
      store.isAddModalOpen = false; // Overlay closes immediately upon selecting/adding
      render();
    };
  }

  // Settings Modal: Close
  const btnCloseSettings = document.getElementById('btn-close-settings-modal');
  const btnDoneSettings = document.getElementById('btn-done-settings');
  const overlaySettings = document.getElementById('modal-overlay-settings');
  const closeSettings = () => {
    store.isSettingsOpen = false;
    render();
  };
  if (btnCloseSettings) btnCloseSettings.onclick = closeSettings;
  if (btnDoneSettings) btnDoneSettings.onclick = closeSettings;
  if (overlaySettings) overlaySettings.onclick = closeSettings;

  // Settings: Hands-free toggle
  const toggleHandsFree = document.getElementById('toggle-hands-free');
  if (toggleHandsFree) {
    toggleHandsFree.onclick = () => {
      store.updateSettings({
        ...store.settings,
        voiceControlEnabled: !store.settings.voiceControlEnabled,
      });
    };
  }

  // Settings: Speech enabled toggle
  const toggleSpeech = document.getElementById('toggle-speech-enabled');
  if (toggleSpeech) {
    toggleSpeech.onclick = () => {
      store.updateSettings({
        ...store.settings,
        speechEnabled: !store.settings.speechEnabled,
      });
    };
  }

  // Settings: SFX toggle
  const toggleSfx = document.getElementById('toggle-sfx-enabled');
  if (toggleSfx) {
    toggleSfx.onclick = () => {
      store.updateSettings({
        ...store.settings,
        soundEffectsEnabled: !store.settings.soundEffectsEnabled,
      });
    };
  }

  // Settings: Trigger phrase input
  const inputTriggerPhrase = document.getElementById('settings-trigger-phrase');
  if (inputTriggerPhrase) {
    inputTriggerPhrase.oninput = (e) => {
      store.settings.triggerPhrase = e.target.value;
      saveSettings(store.settings);
    };
  }

  // Settings: Pick trigger phrase preset
  document.querySelectorAll('.btn-pick-trigger').forEach((el) => {
    el.onclick = (e) => {
      const phrase = e.currentTarget.getAttribute('data-pick-trigger');
      store.updateSettings({
        ...store.settings,
        triggerPhrase: phrase,
      });
    };
  });

  // Settings: Record phrase button
  const btnRecordPhrase = document.getElementById('btn-record-phrase');
  if (btnRecordPhrase) {
    btnRecordPhrase.onclick = async () => {
      const perm = await requestMicPermission();
      if (!perm) return;

      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) return;

      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        store.isRecordingPhraseInSettings = true;
        render();

        rec.onstart = () => {
          playSpeechStartTing(true);
        };

        rec.onresult = (event) => {
          const phrase = Array.from(event.results)
            .map((r) => r[0].transcript)
            .join('')
            .trim();

          if (phrase) {
            store.settings.triggerPhrase = phrase;
            saveSettings(store.settings);
            render();
          }
        };

        rec.onend = () => {
          store.isRecordingPhraseInSettings = false;
          playSpeechStartTing(true);
          render();
        };

        rec.onerror = () => {
          store.isRecordingPhraseInSettings = false;
          render();
        };

        rec.start();
      } catch {
        store.isRecordingPhraseInSettings = false;
        render();
      }
    };
  }

  // Settings: Cooldown & Mic Delay
  const inputCooldown = document.getElementById('input-cooldown');
  if (inputCooldown) {
    inputCooldown.oninput = (e) => {
      const val = parseFloat(e.target.value);
      store.settings.rollCooldown = val;
      saveSettings(store.settings);
      const display = document.getElementById('cooldown-display');
      if (display) {
        display.textContent = `${val.toFixed(1)}s`;
      }
    };
  }

  // Settings: Speech Rate
  const inputRate = document.getElementById('input-speech-rate');
  if (inputRate) {
    inputRate.oninput = (e) => {
      store.settings.speechRate = parseFloat(e.target.value);
      saveSettings(store.settings);
      render();
    };
  }

  // Settings: Voice select
  const selectVoice = document.getElementById('select-voice');
  if (selectVoice) {
    selectVoice.onchange = (e) => {
      store.updateSettings({
        ...store.settings,
        voiceURI: e.target.value,
      });
    };
  }

  // Settings: Test voice
  const btnTestVoice = document.getElementById('btn-test-voice-pronunciation');
  if (btnTestVoice) {
    btnTestVoice.onclick = () => {
      speakColorName(
        store.currentColor ? store.currentColor.name : 'Color roll',
        store.settings
      );
    };
  }
}

// Initial render
render();
