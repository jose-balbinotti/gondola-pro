import { MAX_CUSTOM_FONT_NAME_LENGTH, sanitizePlainText, validateGoogleFontName } from "@/lib/security";

const CUSTOM_FONTS_KEY = "gondolapro-custom-fonts";
const MAX_CUSTOM_FONTS = 20;

export interface CustomFont {
  name: string;
  value: string;
}

function normalizeFontName(name: string): string {
  return sanitizePlainText(name, MAX_CUSTOM_FONT_NAME_LENGTH).replace(/\s+/g, " ");
}

function toCustomFont(name: string): CustomFont {
  return {
    name,
    value: `'${name.replace(/'/g, "")}', sans-serif`,
  };
}

export function loadCustomFonts(): CustomFont[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FONTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    const unique = new Map<string, CustomFont>();

    for (const item of parsed) {
      const name = normalizeFontName(typeof item?.name === "string" ? item.name : "");
      if (validateGoogleFontName(name)) continue;
      unique.set(name.toLowerCase(), toCustomFont(name));
      if (unique.size >= MAX_CUSTOM_FONTS) break;
    }

    return Array.from(unique.values());
  } catch {
    return [];
  }
}

function saveCustomFonts(fonts: CustomFont[]) {
  localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(fonts.slice(0, MAX_CUSTOM_FONTS)));
}

function injectGoogleFont(name: string) {
  const normalized = normalizeFontName(name);
  if (validateGoogleFontName(normalized)) return;

  const id = `gfont-${normalized.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(normalized)}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);
}

export function injectAllCustomFonts() {
  loadCustomFonts().forEach((font) => injectGoogleFont(font.name));
}

export function addCustomFont(name: string): CustomFont | null {
  const normalized = normalizeFontName(name);
  if (validateGoogleFontName(normalized)) return null;

  const fonts = loadCustomFonts();
  const exists = fonts.some((font) => font.name.toLowerCase() === normalized.toLowerCase());
  if (exists || fonts.length >= MAX_CUSTOM_FONTS) return null;

  const newFont = toCustomFont(normalized);
  fonts.push(newFont);
  saveCustomFonts(fonts);
  injectGoogleFont(normalized);
  return newFont;
}

export function removeCustomFont(name: string) {
  const normalized = normalizeFontName(name);
  const fonts = loadCustomFonts().filter((font) => font.name.toLowerCase() !== normalized.toLowerCase());
  saveCustomFonts(fonts);
}
