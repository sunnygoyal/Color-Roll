import { PRESET_PALETTES } from '../data/presets.js';

const STORAGE_KEY_COLORS = 'chromadice_custom_colors';
const STORAGE_KEY_SETTINGS = 'chromadice_settings';

export const DEFAULT_COLORS = PRESET_PALETTES[0].colors.map((c, i) => ({
  id: `default-${i}-${Date.now()}`,
  name: c.name,
  hex: c.hex,
}));

export const DEFAULT_SETTINGS = {
  speechEnabled: true,
  soundEffectsEnabled: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  voiceURI: '',
  voiceControlEnabled: true,
  triggerPhrase: 'next color',
};

export function loadSavedColors() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLORS);
    if (!raw) return DEFAULT_COLORS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => ({
        id: item.id || `color-${idx}-${Math.random()}`,
        name: String(item.name || 'Unnamed Color').trim(),
        hex: String(item.hex || '#3B82F6').trim(),
      }));
    }
  } catch (e) {
    console.warn('Failed to parse saved colors from localStorage', e);
  }
  return DEFAULT_COLORS;
}

export function saveColors(colors) {
  try {
    localStorage.setItem(STORAGE_KEY_COLORS, JSON.stringify(colors));
  } catch (e) {
    console.warn('Failed to save colors to localStorage', e);
  }
}

export function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      speechEnabled: parsed.speechEnabled ?? DEFAULT_SETTINGS.speechEnabled,
      soundEffectsEnabled: parsed.soundEffectsEnabled ?? DEFAULT_SETTINGS.soundEffectsEnabled,
      speechRate: typeof parsed.speechRate === 'number' ? parsed.speechRate : DEFAULT_SETTINGS.speechRate,
      speechPitch: typeof parsed.speechPitch === 'number' ? parsed.speechPitch : DEFAULT_SETTINGS.speechPitch,
      voiceURI: parsed.voiceURI || '',
      voiceControlEnabled: parsed.voiceControlEnabled ?? DEFAULT_SETTINGS.voiceControlEnabled,
      triggerPhrase: parsed.triggerPhrase || DEFAULT_SETTINGS.triggerPhrase,
    };
  } catch (e) {
    console.warn('Failed to parse settings from localStorage', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage', e);
  }
}
