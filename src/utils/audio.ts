import { AudioSettings } from '../types.ts';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Pleasant melodic landing chime when the color settles
 */
export function playDiceLandChime(enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);

      gain.gain.setValueAtTime(0.06, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.03 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.36);
    });
  } catch (err) {
    console.debug('Audio landing sound skipped', err);
  }
}

/**
 * Crisp high-pitched "ting" sound when speech input starts listening
 */
export function playSpeechStartTing(enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscHarmonic = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pure crisp bell "ting" tone (2093 Hz - High C7 and overtone)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2093, now);

    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(4186, now);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    oscHarmonic.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    oscHarmonic.start(now);

    osc.stop(now + 0.31);
    oscHarmonic.stop(now + 0.31);
  } catch (err) {
    console.debug('Ting sound skipped', err);
  }
}

/**
 * Speaks the chosen color name via Web Speech API, with completion callback
 */
export function speakColorName(
  text: string,
  settings: AudioSettings,
  onEnd?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  if (!settings.speechEnabled) {
    if (onEnd) setTimeout(onEnd, 100);
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.speechRate || 1.0;
    utterance.pitch = settings.speechPitch || 1.0;

    let callbackFired = false;
    const fireEnd = () => {
      if (!callbackFired) {
        callbackFired = true;
        if (onEnd) onEnd();
      }
    };

    utterance.onend = fireEnd;
    utterance.onerror = fireEnd;

    // Safety timeout in case browser TTS hangs without firing onend
    setTimeout(() => {
      fireEnd();
    }, 3500);

    if (settings.voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (matched) {
        utterance.voice = matched;
      }
    }

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 80);
  } catch (err) {
    console.warn('Speech synthesis error', err);
    if (onEnd) onEnd();
  }
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Check if browser supports SpeechRecognition
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Request microphone permission explicitly via getUserMedia
 */
export async function requestMicPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop tracks immediately, permission is cached for the origin
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err) {
    console.warn('Microphone permission request failed or was rejected:', err);
    return false;
  }
}

/**
 * Flexible phrase matcher for voice command triggers
 */
export function matchesTriggerPhrase(transcript: string, triggerPhrase: string): boolean {
  if (!transcript || !triggerPhrase) return false;

  const cleanTranscript = transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanTrigger = triggerPhrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTrigger) return false;

  // Exact or substring match
  if (cleanTranscript.includes(cleanTrigger)) return true;

  // Handle color / colour spelling variation
  const normTranscript = cleanTranscript.replace(/colour/g, 'color');
  const normTrigger = cleanTrigger.replace(/colour/g, 'color');
  if (normTranscript.includes(normTrigger)) return true;

  // Check word match if single word
  const words = cleanTrigger.split(' ').filter(Boolean);
  if (words.length === 1) {
    const transWords = normTranscript.split(' ');
    return transWords.includes(words[0]);
  }

  return false;
}
