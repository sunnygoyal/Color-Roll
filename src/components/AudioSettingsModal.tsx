import React, { useEffect, useState, useRef } from 'react';
import { AudioSettings } from '../types.ts';
import {
  getAvailableVoices,
  isSpeechRecognitionSupported,
  requestMicPermission,
  playSpeechStartTing,
} from '../utils/audio.ts';
import { Volume2, X, Play, Mic, MicOff, Check, Loader2 } from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  onUpdateSettings: (settings: AudioSettings) => void;
  onTestVoice: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onTestVoice,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isRecordingPhrase, setIsRecordingPhrase] = useState<boolean>(false);
  const [recordedPreview, setRecordedPreview] = useState<string>('');
  const [recordError, setRecordError] = useState<string | null>(null);
  const recognitionInstanceRef = useRef<any>(null);

  const hasSpeechRec = isSpeechRecognitionSupported();

  useEffect(() => {
    const updateVoices = () => {
      const v = getAvailableVoices();
      setVoices(v);
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (recognitionInstanceRef.current) {
        try {
          recognitionInstanceRef.current.abort();
        } catch {}
      }
    };
  }, []);

  /**
   * Listen for user speaking the custom trigger phrase
   */
  const handleStartSpeakPhrase = async () => {
    setRecordError(null);
    setRecordedPreview('');

    // Ensure mic permission is granted
    const permGranted = await requestMicPermission();
    if (!permGranted) {
      setRecordError('Microphone permission was not granted. Please check browser settings.');
      return;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setRecordError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      if (recognitionInstanceRef.current) {
        try {
          recognitionInstanceRef.current.abort();
        } catch {}
      }

      const rec = new SpeechRecognitionClass();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecordingPhrase(true);
        playSpeechStartTing(true);
      };

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('')
          .trim();

        if (transcript) {
          setRecordedPreview(transcript);
        }

        // If final result
        if (event.results[0]?.isFinal) {
          const finalPhrase = transcript.trim();
          if (finalPhrase) {
            onUpdateSettings({
              ...settings,
              triggerPhrase: finalPhrase,
              voiceControlEnabled: true,
            });
            playSpeechStartTing(true);
          }
        }
      };

      rec.onerror = (e: any) => {
        console.warn('Recognition error in settings:', e);
        if (e.error === 'not-allowed') {
          setRecordError('Microphone access denied. Please allow microphone in browser.');
        } else if (e.error !== 'no-speech') {
          setRecordError(`Recognition error: ${e.error}`);
        }
        setIsRecordingPhrase(false);
      };

      rec.onend = () => {
        setIsRecordingPhrase(false);
      };

      recognitionInstanceRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.warn('Failed to start recognition in settings:', err);
      setRecordError('Could not start microphone.');
      setIsRecordingPhrase(false);
    }
  };

  const handleStopSpeakPhrase = () => {
    if (recognitionInstanceRef.current) {
      try {
        recognitionInstanceRef.current.stop();
      } catch {}
    }
    setIsRecordingPhrase(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base text-white">Audio & Voice Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Hands-Free Voice Command Section */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mic className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-sm font-bold text-white">Hands-Free Voice Roll</div>
                  <div className="text-xs text-slate-400">Listens and rolls when phrase is spoken</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    voiceControlEnabled: !settings.voiceControlEnabled,
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.voiceControlEnabled ? 'bg-emerald-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    settings.voiceControlEnabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {!hasSpeechRec && (
              <div className="text-xs text-amber-400 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/40">
                Notice: SpeechRecognition is not supported in this browser. Please use Chrome or Edge for hands-free voice control.
              </div>
            )}

            {/* Trigger Phrase Input with Speak Phrase Button */}
            {settings.voiceControlEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-850">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Trigger Phrase
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Type or click &ldquo;Speak phrase&rdquo;
                  </span>
                </div>

                {/* Phrase input + Speak button */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.triggerPhrase}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        triggerPhrase: e.target.value,
                      })
                    }
                    placeholder="e.g. Next color"
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />

                  {/* Speak Phrase Button */}
                  <button
                    type="button"
                    onClick={isRecordingPhrase ? handleStopSpeakPhrase : handleStartSpeakPhrase}
                    disabled={!hasSpeechRec}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isRecordingPhrase
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                    title="Speak the phrase to set it automatically"
                  >
                    {isRecordingPhrase ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Speak Phrase</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live recording preview / helper */}
                {isRecordingPhrase && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 text-xs text-emerald-200 flex items-center justify-between">
                    <span>Say your phrase clearly now... {recordedPreview && `("${recordedPreview}")`}</span>
                    <button
                      type="button"
                      onClick={handleStopSpeakPhrase}
                      className="text-[11px] underline text-emerald-300 hover:text-white"
                    >
                      Done
                    </button>
                  </div>
                )}

                {recordError && (
                  <div className="text-xs text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-900/40">
                    {recordError}
                  </div>
                )}

                {/* Quick phrase presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 mr-1">Quick pick:</span>
                  {['Next color', 'Next', 'Roll', 'Change color'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          triggerPhrase: preset,
                        })
                      }
                      className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        settings.triggerPhrase.toLowerCase() === preset.toLowerCase()
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Voice Speaking (TTS) Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Speak Color Name</div>
              <div className="text-xs text-slate-400">Announces color name aloud when selected</div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, speechEnabled: !settings.speechEnabled })
              }
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.speechEnabled ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.speechEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Sound FX Toggle (including landing chime & ting) */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Sound Effects & Ting</div>
              <div className="text-xs text-slate-400">Plays chime on land and &ldquo;ting&rdquo; when mic listens</div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  soundEffectsEnabled: !settings.soundEffectsEnabled,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.soundEffectsEnabled ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.soundEffectsEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Speech Rate Slider */}
          {settings.speechEnabled && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Speech Rate</span>
                <span className="font-mono text-slate-400">{settings.speechRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.1"
                value={settings.speechRate}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    speechRate: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
          )}

          {/* Available Voices Dropdown */}
          {settings.speechEnabled && voices.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Voice Selection</label>
              <select
                value={settings.voiceURI}
                onChange={(e) => onUpdateSettings({ ...settings, voiceURI: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="">Default System Voice</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Test Voice Button */}
          {settings.speechEnabled && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onTestVoice}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Test Voice Pronunciation
              </button>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
