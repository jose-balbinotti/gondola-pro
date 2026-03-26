import type { PosterStyle } from "@/components/poster/PosterPreview";

export interface PosterPreset {
  id: string;
  name: string;
  templateId: string;
  paperSize: string;
  style: PosterStyle;
  backgroundImage?: string;
  createdAt: number;
}

const STORAGE_KEY = "gondolapro-presets";
const MAX_PRESETS = 20;

export function loadPresets(): PosterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePreset(preset: Omit<PosterPreset, "id" | "createdAt">): PosterPreset | null {
  const presets = loadPresets();
  if (presets.length >= MAX_PRESETS) return null;
  const newPreset: PosterPreset = {
    ...preset,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  presets.push(newPreset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  return newPreset;
}

export function deletePreset(id: string): void {
  const presets = loadPresets().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function updatePreset(id: string, updates: Partial<PosterPreset>): void {
  const presets = loadPresets().map((p) => (p.id === id ? { ...p, ...updates } : p));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}
