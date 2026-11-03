let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
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
export function playDiceLandChime(enabled) {
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
export function playSpeechStartTing(enabled) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscHarmonic = ctx.createOscillator();
    const gain = ctx.createGain();

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
export function speakColorName(text, settings, onEnd) {
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

export function getAvailableVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export async function requestMicPermission() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err) {
    console.warn('Microphone permission request failed or was rejected:', err);
    return false;
  }
}

export function matchesTriggerPhrase(transcript, triggerPhrase) {
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

  if (cleanTranscript.includes(cleanTrigger)) return true;

  const normTranscript = cleanTranscript.replace(/colour/g, 'color');
  const normTrigger = cleanTrigger.replace(/colour/g, 'color');
  if (normTranscript.includes(normTrigger)) return true;

  const words = cleanTrigger.split(' ').filter(Boolean);
  if (words.length === 1) {
    const transWords = normTranscript.split(' ');
    return transWords.includes(words[0]);
  }

  return false;
}
