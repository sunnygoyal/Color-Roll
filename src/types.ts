export interface ColorItem {
  id: string;
  name: string;
  hex: string;
}

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  colors: { name: string; hex: string }[];
}

export interface RollRecord {
  id: string;
  color: ColorItem;
  timestamp: number;
}

export interface AudioSettings {
  speechEnabled: boolean;
  soundEffectsEnabled: boolean;
  speechRate: number; // 0.8 to 1.4
  speechPitch: number; // 0.8 to 1.2
  voiceURI: string;
  voiceControlEnabled: boolean;
  triggerPhrase: string;
}
