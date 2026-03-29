import type { PosterStyle } from "@/components/poster/PosterPreview";
import type { PosterData } from "@/lib/templates";
import { supabase } from "@/integrations/supabase/client";

// Convert legacy px-based style values to mm (1mm ≈ 3.7795px)
const PX_TO_MM = 25.4 / 96;
function migrateStyleToMM(style: PosterStyle): PosterStyle {
  // Heuristic: if priceFontSize > 20, values are likely in px
  if (style.priceFontSize > 20) {
    const convertSize = (v: number) => Math.round(v * PX_TO_MM * 10) / 10;
    const convertOffset = (v: number) => Math.round(v * PX_TO_MM * 10) / 10;
    return {
      ...style,
      productFontSize: convertSize(style.productFontSize),
      brandFontSize: convertSize(style.brandFontSize),
      gramaturaFontSize: convertSize(style.gramaturaFontSize),
      priceFontSize: convertSize(style.priceFontSize),
      centsFontSize: convertSize(style.centsFontSize),
      descriptionFontSize: convertSize(style.descriptionFontSize),
      quantityFontSize: convertSize(style.quantityFontSize),
      productOffsetY: convertOffset(style.productOffsetY),
      brandOffsetY: convertOffset(style.brandOffsetY),
      gramaturaOffsetY: convertOffset(style.gramaturaOffsetY),
      priceOffsetY: convertOffset(style.priceOffsetY),
      validityOffsetY: convertOffset(style.validityOffsetY),
      unitOffsetX: convertOffset(style.unitOffsetX),
      unitOffsetY: convertOffset(style.unitOffsetY),
      descriptionOffsetY: convertOffset(style.descriptionOffsetY),
      centsOffsetY: convertOffset(style.centsOffsetY),
      quantityOffsetX: convertOffset(style.quantityOffsetX),
      quantityOffsetY: convertOffset(style.quantityOffsetY),
      atacadoOffsetX: convertOffset(style.atacadoOffsetX),
      atacadoOffsetY: convertOffset(style.atacadoOffsetY),
      varejoOffsetX: convertOffset(style.varejoOffsetX),
      varejoOffsetY: convertOffset(style.varejoOffsetY),
    };
  }
  return style;
}

export interface PosterPreset {
  id: string;
  name: string;
  templateId: string;
  paperSize: string;
  style: PosterStyle;
  backgroundImage?: string;
  posterData?: PosterData;
  createdAt: number;
}

const STORAGE_KEY = "gondolapro-presets";
const DEVICE_ID_KEY = "gondolapro-device-id";
const MAX_PRESETS = 50;

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── localStorage (fallback / cache) ──

export function loadPresetsLocal(): PosterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresetsLocal(presets: PosterPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// ── Supabase helpers ──

function rowToPreset(row: any): PosterPreset {
  return {
    id: row.id,
    name: row.name,
    templateId: row.template_id,
    paperSize: row.paper_size,
    style: row.style as PosterStyle,
    backgroundImage: row.background_image || undefined,
    posterData: row.poster_data as PosterData | undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// ── Public API (async, syncs with DB) ──

export async function loadPresetsFromDB(): Promise<PosterPreset[]> {
  try {
    const deviceId = getDeviceId();
    const { data, error } = await supabase
      .from("poster_presets" as any)
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false });
    if (error || !data) throw error;
    const presets = (data as any[]).map(rowToPreset);
    savePresetsLocal(presets);
    return presets;
  } catch {
    return loadPresetsLocal();
  }
}

export async function savePresetToDB(
  preset: Omit<PosterPreset, "id" | "createdAt">
): Promise<PosterPreset | null> {
  const deviceId = getDeviceId();

  // Check limit
  const existing = await loadPresetsFromDB();
  if (existing.length >= MAX_PRESETS) return null;

  try {
    const { data, error } = await supabase
      .from("poster_presets" as any)
      .insert({
        device_id: deviceId,
        name: preset.name,
        template_id: preset.templateId,
        paper_size: preset.paperSize,
        style: preset.style as any,
        background_image: preset.backgroundImage || null,
        poster_data: preset.posterData as any || null,
      } as any)
      .select()
      .single();
    if (error || !data) throw error;
    const newPreset = rowToPreset(data);
    // Update local cache
    const locals = loadPresetsLocal();
    locals.unshift(newPreset);
    savePresetsLocal(locals);
    return newPreset;
  } catch {
    // fallback to localStorage only
    return savePresetLocalOnly(preset);
  }
}

export async function deletePresetFromDB(id: string): Promise<void> {
  try {
    await supabase.from("poster_presets" as any).delete().eq("id", id);
  } catch {
    // ignore
  }
  const presets = loadPresetsLocal().filter((p) => p.id !== id);
  savePresetsLocal(presets);
}

// ── Synchronous localStorage-only (legacy compat) ──

export function loadPresets(): PosterPreset[] {
  return loadPresetsLocal();
}

export function savePreset(preset: Omit<PosterPreset, "id" | "createdAt">): PosterPreset | null {
  return savePresetLocalOnly(preset);
}

function savePresetLocalOnly(preset: Omit<PosterPreset, "id" | "createdAt">): PosterPreset | null {
  const presets = loadPresetsLocal();
  if (presets.length >= MAX_PRESETS) return null;
  const newPreset: PosterPreset = {
    ...preset,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  presets.unshift(newPreset);
  savePresetsLocal(presets);
  return newPreset;
}

export function deletePreset(id: string): void {
  const presets = loadPresetsLocal().filter((p) => p.id !== id);
  savePresetsLocal(presets);
}

export function updatePreset(id: string, updates: Partial<PosterPreset>): void {
  const presets = loadPresetsLocal().map((p) => (p.id === id ? { ...p, ...updates } : p));
  savePresetsLocal(presets);
}

// ── Export / Import JSON ──

export function exportPresetsToJSON(presets: PosterPreset[]): void {
  const blob = new Blob([JSON.stringify(presets, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gondolapro-presets-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importPresetsFromJSON(file: File): Promise<PosterPreset[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string) as PosterPreset[];
        if (!Array.isArray(imported)) throw new Error("Invalid format");
        // Merge with existing, avoid duplicates by name
        const existing = loadPresetsLocal();
        const existingNames = new Set(existing.map((p) => p.name));
        let added = 0;
        for (const p of imported) {
          if (existing.length >= MAX_PRESETS) break;
          if (!existingNames.has(p.name)) {
            existing.push({ ...p, id: crypto.randomUUID(), createdAt: Date.now() });
            existingNames.add(p.name);
            added++;
          }
        }
        savePresetsLocal(existing);
        resolve(existing);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
