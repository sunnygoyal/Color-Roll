export function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastColor(hex: string): 'dark' | 'light' {
  try {
    const lum = getLuminance(hex);
    return lum > 0.4 ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function normalizeHex(color: string): string {
  if (!color) return '#3B82F6';
  let hex = color.trim();
  if (!hex.startsWith('#')) hex = '#' + hex;
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toUpperCase();
}

// Basic list of reference colors to suggest a friendly name if user picks via color picker
const KNOWN_COLORS: { name: string; r: number; g: number; b: number }[] = [
  { name: 'Crimson', r: 220, g: 20, b: 60 },
  { name: 'Red', r: 239, g: 68, b: 68 },
  { name: 'Coral', r: 251, g: 113, b: 133 },
  { name: 'Orange', r: 249, g: 115, b: 22 },
  { name: 'Amber', r: 245, g: 158, b: 11 },
  { name: 'Yellow', r: 234, g: 179, b: 8 },
  { name: 'Lime', r: 132, g: 204, b: 22 },
  { name: 'Green', r: 34, g: 197, b: 94 },
  { name: 'Emerald', r: 16, g: 185, b: 129 },
  { name: 'Teal', r: 20, g: 184, b: 166 },
  { name: 'Cyan', r: 6, g: 182, b: 212 },
  { name: 'Sky Blue', r: 14, g: 165, b: 233 },
  { name: 'Blue', r: 59, g: 130, b: 246 },
  { name: 'Indigo', r: 99, g: 102, b: 241 },
  { name: 'Violet', r: 139, g: 92, b: 246 },
  { name: 'Purple', r: 168, g: 85, b: 247 },
  { name: 'Fuchsia', r: 217, g: 70, b: 239 },
  { name: 'Pink', r: 236, g: 72, b: 153 },
  { name: 'Rose', r: 244, g: 63, b: 94 },
  { name: 'Gold', r: 212, g: 175, b: 55 },
  { name: 'Turquoise', r: 64, g: 224, b: 208 },
  { name: 'Lavender', r: 230, g: 230, b: 250 },
  { name: 'Navy', r: 0, g: 0, b: 128 },
  { name: 'Mint', r: 152, g: 255, b: 152 },
  { name: 'Peach', r: 255, g: 218, b: 185 },
  { name: 'White', r: 255, g: 255, b: 255 },
  { name: 'Charcoal', r: 51, g: 65, b: 85 },
  { name: 'Black', r: 15, g: 23, b: 42 },
];

export function suggestColorName(hex: string): string {
  try {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    let minDistance = Infinity;
    let closestName = 'Custom Color';

    for (const color of KNOWN_COLORS) {
      // Euclidean distance in RGB space
      const dist = Math.sqrt(
        Math.pow(r - color.r, 2) + Math.pow(g - color.g, 2) + Math.pow(b - color.b, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestName = color.name;
      }
    }

    return closestName;
  } catch {
    return 'Custom Color';
  }
}
