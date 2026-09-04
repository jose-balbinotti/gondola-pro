import { DEFAULT_POSTER_STYLE, type PosterStyle } from "@/components/poster/PosterPreview";
import type { PosterData } from "@/lib/templates";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import {
  MAX_PRESET_IMPORT_ITEMS,
  isSafeImageSource,
  sanitizePlainText,
  validatePresetImportFile,
} from "@/lib/security";

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

type PosterPresetRow = Tables<"poster_presets">;

const MAX_PRESET_NAME_LENGTH = 80;
const MAX_TEMPLATE_ID_LENGTH = 80;
const MAX_PAPER_SIZE_LENGTH = 40;
const MAX_POSTER_FIELD_LENGTH = 160;
const MAX_POSTER_DESCRIPTION_LENGTH = 320;
const MAX_FONT_FAMILY_LENGTH = 120;
const MAX_FONT_SIZE = 180;
const MIN_FONT_SIZE = 1;
const MAX_OFFSET = 600;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
}

function sanitizePosterData(value: unknown): PosterData | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const data = value as Partial<Record<keyof PosterData, unknown>>;

  return {
    templateId: sanitizePlainText(data.templateId, MAX_TEMPLATE_ID_LENGTH),
    productName: sanitizePlainText(data.productName, MAX_POSTER_FIELD_LENGTH),
    brandName: sanitizePlainText(data.brandName, MAX_POSTER_FIELD_LENGTH),
    gramatura: sanitizePlainText(data.gramatura, MAX_POSTER_FIELD_LENGTH),
    oldPrice: sanitizePlainText(data.oldPrice, MAX_POSTER_FIELD_LENGTH),
    newPrice: sanitizePlainText(data.newPrice, MAX_POSTER_FIELD_LENGTH),
    discount: sanitizePlainText(data.discount, MAX_POSTER_FIELD_LENGTH),
    validity: sanitizePlainText(data.validity, MAX_POSTER_FIELD_LENGTH),
    description: sanitizePlainText(data.description, MAX_POSTER_DESCRIPTION_LENGTH),
    quantity: sanitizePlainText(data.quantity, MAX_POSTER_FIELD_LENGTH),
    unit: sanitizePlainText(data.unit, MAX_POSTER_FIELD_LENGTH),
    logoUrl: isSafeImageSource(data.logoUrl) ? data.logoUrl.trim() : undefined,
    qrCodeUrl: isSafeImageSource(data.qrCodeUrl) ? data.qrCodeUrl.trim() : undefined,
    whatsappNumber: sanitizePlainText(data.whatsappNumber, 20).replace(/\D/g, ""),
  };
}

function sanitizeFontFamily(value: unknown, fallback: string): string {
  const sanitized = sanitizePlainText(value, MAX_FONT_FAMILY_LENGTH);
  return sanitized || fallback;
}

function sanitizePosterStyle(value: unknown): PosterStyle {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_POSTER_STYLE };
  const style = value as Partial<Record<keyof PosterStyle, unknown>>;

  return {
    ...DEFAULT_POSTER_STYLE,
    showPromoLabel: style.showPromoLabel === true,
    promoText: sanitizePlainText(style.promoText, 80),
    productFontSize: clampNumber(style.productFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_POSTER_STYLE.productFontSize),
    brandFontSize: clampNumber(style.brandFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_POSTER_STYLE.brandFontSize),
    gramaturaFontSize: clampNumber(style.gramaturaFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_POSTER_STYLE.gramaturaFontSize),
    priceFontSize: clampNumber(style.priceFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_POSTER_STYLE.priceFontSize),
    centsFontSize: clampNumber(style.centsFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_POSTER_STYLE.centsFontSize),
    descriptionFontSize: clampNumber(style.descriptionFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_POSTER_STYLE.descriptionFontSize),
    productOffsetY: clampNumber(style.productOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.productOffsetY),
    brandOffsetY: clampNumber(style.brandOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.brandOffsetY),
    gramaturaOffsetY: clampNumber(style.gramaturaOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.gramaturaOffsetY),
    priceOffsetY: clampNumber(style.priceOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.priceOffsetY),
    validityOffsetY: clampNumber(style.validityOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.validityOffsetY),
    unitOffsetX: clampNumber(style.unitOffsetX, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.unitOffsetX),
    fontFamily: sanitizeFontFamily(style.fontFamily, DEFAULT_POSTER_STYLE.fontFamily),
    priceFontFamily: sanitizeFontFamily(style.priceFontFamily, DEFAULT_POSTER_STYLE.priceFontFamily),
    descriptionFontFamily: sanitizeFontFamily(style.descriptionFontFamily, DEFAULT_POSTER_STYLE.descriptionFontFamily),
    shadowProduct: style.shadowProduct === true,
    shadowBrand: style.shadowBrand === true,
    shadowGramatura: style.shadowGramatura === true,
    shadowPrice: style.shadowPrice === true,
    shadowDescription: style.shadowDescription === true,
    hideCurrencySymbol: style.hideCurrencySymbol === true,
    centsAlignTop: style.centsAlignTop === true,
    centsUnderline: style.centsUnderline === true,
    gramaturaStyle: style.gramaturaStyle === "solid" || style.gramaturaStyle === "dashed" || style.gramaturaStyle === "dotted" ? style.gramaturaStyle : null,
    unitBelowCents: style.unitBelowCents === true,
    descriptionOffsetY: clampNumber(style.descriptionOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.descriptionOffsetY),
    centsUnderlineOffsetY: clampNumber(style.centsUnderlineOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.centsUnderlineOffsetY),
    gramaturaLinesOffsetY: clampNumber(style.gramaturaLinesOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.gramaturaLinesOffsetY),
    unitOffsetY: clampNumber(style.unitOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.unitOffsetY),
    centsOffsetY: clampNumber(style.centsOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.centsOffsetY),
    quantityFontSize: clampNumber(style.quantityFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_POSTER_STYLE.quantityFontSize),
    quantityOffsetX: clampNumber(style.quantityOffsetX, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.quantityOffsetX),
    quantityOffsetY: clampNumber(style.quantityOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.quantityOffsetY),
    atacadoOffsetX: clampNumber(style.atacadoOffsetX, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.atacadoOffsetX),
    atacadoOffsetY: clampNumber(style.atacadoOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.atacadoOffsetY),
    varejoOffsetX: clampNumber(style.varejoOffsetX, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.varejoOffsetX),
    varejoOffsetY: clampNumber(style.varejoOffsetY, -MAX_OFFSET, MAX_OFFSET, DEFAULT_POSTER_STYLE.varejoOffsetY),
  };
}

function sanitizeImportedPreset(value: unknown): PosterPreset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const preset = value as Partial<Record<keyof PosterPreset, unknown>>;
  const name = sanitizePlainText(preset.name, MAX_PRESET_NAME_LENGTH);
  const templateId = sanitizePlainText(preset.templateId, MAX_TEMPLATE_ID_LENGTH);
  const paperSize = sanitizePlainText(preset.paperSize, MAX_PAPER_SIZE_LENGTH);

  if (!name || !templateId || !paperSize) return null;

  return {
    id: crypto.randomUUID(),
    name,
    templateId,
    paperSize,
    style: sanitizePosterStyle(preset.style),
    backgroundImage: isSafeImageSource(preset.backgroundImage) ? preset.backgroundImage.trim() : undefined,
    posterData: sanitizePosterData(preset.posterData),
    createdAt: Date.now(),
  };
}

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function toJson<T>(value: T): Json {
  return value as Json;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

// ── localStorage (fallback / cache) ──

export function loadPresetsLocal(): PosterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as PosterPreset[] : [];
  } catch {
    return [];
  }
}

function savePresetsLocal(presets: PosterPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// ── Supabase helpers ──

function rowToPreset(row: PosterPresetRow): PosterPreset {
  return {
    id: row.id,
    name: sanitizePlainText(row.name, MAX_PRESET_NAME_LENGTH),
    templateId: sanitizePlainText(row.template_id, MAX_TEMPLATE_ID_LENGTH),
    paperSize: sanitizePlainText(row.paper_size, MAX_PAPER_SIZE_LENGTH),
    style: sanitizePosterStyle(row.style),
    backgroundImage: isSafeImageSource(row.background_image) ? row.background_image.trim() : undefined,
    posterData: row.poster_data ? sanitizePosterData(row.poster_data) : undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// ── Public API (async, syncs with DB) ──

export async function loadPresetsFromDB(): Promise<PosterPreset[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return loadPresetsLocal();

    const { data, error } = await supabase
      .from("poster_presets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error || !data) throw error;
    const presets = data.map(rowToPreset);
    savePresetsLocal(presets);
    return presets;
  } catch {
    return loadPresetsLocal();
  }
}

export async function savePresetToDB(
  preset: Omit<PosterPreset, "id" | "createdAt">,
): Promise<PosterPreset | null> {
  const deviceId = getDeviceId();
  const userId = await getCurrentUserId();

  if (!userId) return savePresetLocalOnly(preset);

  const sanitizedName = sanitizePlainText(preset.name, MAX_PRESET_NAME_LENGTH);
  const sanitizedTemplateId = sanitizePlainText(preset.templateId, MAX_TEMPLATE_ID_LENGTH);
  const sanitizedPaperSize = sanitizePlainText(preset.paperSize, MAX_PAPER_SIZE_LENGTH);

  if (!sanitizedName || !sanitizedTemplateId || !sanitizedPaperSize) {
    throw new Error("invalid_preset_data");
  }

  const sanitizedPosterData = preset.posterData ? sanitizePosterData(preset.posterData) : undefined;

  const { data, error } = await supabase.rpc("create_poster_preset", {
    _device_id: deviceId,
    _name: sanitizedName,
    _template_id: sanitizedTemplateId,
    _paper_size: sanitizedPaperSize,
    _style: toJson(sanitizePosterStyle(preset.style)),
    _background_image: isSafeImageSource(preset.backgroundImage) ? preset.backgroundImage.trim() : null,
    _poster_data: sanitizedPosterData ? toJson(sanitizedPosterData) : null,
  });

  if (error) throw error;
  if (!data) return null;

  const newPreset = rowToPreset(data);
  const locals = loadPresetsLocal();
  locals.unshift(newPreset);
  savePresetsLocal(locals);
  return newPreset;
}

export async function deletePresetFromDB(id: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      await supabase.from("poster_presets").delete().eq("id", id).eq("user_id", userId);
    }
  } catch {
    // local fallback below keeps UI consistent even when DB delete is unavailable
  }
  const presets = loadPresetsLocal().filter((p) => p.id !== id);
  savePresetsLocal(presets);
}


export function getPresetSaveErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message.includes("plan_limit_exceeded:max_presets")) {
    return "Você atingiu o limite de presets do seu plano atual. Exclua um preset antigo ou solicite a mudança de plano.";
  }

  if (message.includes("not_authorized")) {
    return "Sua sessão não está autorizada para salvar presets no banco.";
  }

  if (message.includes("invalid_preset_data")) {
    return "O preset possui dados inválidos ou incompletos.";
  }

  if (message.includes("Arquivo de presets") || message.includes("JSON de presets")) {
    return message;
  }

  return "Não foi possível salvar o preset no banco. Tente novamente.";
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
  const validationError = validatePresetImportFile(file);
  if (validationError) return Promise.reject(new Error(validationError));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result ?? ""));
        if (!Array.isArray(imported)) throw new Error("Formato inválido. O arquivo precisa conter uma lista de presets.");

        const existing = loadPresetsLocal();
        const existingNames = new Set(existing.map((preset) => preset.name.toLowerCase()));
        const nextPresets = [...existing];
        let importedCount = 0;

        for (const rawPreset of imported.slice(0, MAX_PRESET_IMPORT_ITEMS)) {
          const sanitizedPreset = sanitizeImportedPreset(rawPreset);
          if (!sanitizedPreset) continue;

          const key = sanitizedPreset.name.toLowerCase();
          if (existingNames.has(key)) continue;

          nextPresets.push(sanitizedPreset);
          existingNames.add(key);
          importedCount += 1;
        }

        if (importedCount === 0) {
          throw new Error("Nenhum preset válido encontrado no arquivo.");
        }

        savePresetsLocal(nextPresets);
        resolve(nextPresets);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Erro ao ler arquivo de presets."));
    reader.readAsText(file);
  });
}
