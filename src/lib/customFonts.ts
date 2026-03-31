const CUSTOM_FONTS_KEY = "gondolapro-custom-fonts";

export interface CustomFont {
  name: string;   // ex: "Montserrat"
  value: string;  // ex: "'Montserrat', sans-serif"
}

/** Carrega lista de fontes salvas */
export function loadCustomFonts(): CustomFont[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FONTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Salva lista de fontes */
function saveCustomFonts(fonts: CustomFont[]) {
  localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(fonts));
}

/** Injeta link do Google Fonts no <head> se ainda não existe */
function injectGoogleFont(name: string) {
  const id = `gfont-${name.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);
}

/** Injeta todas as fontes salvas (chamar no boot) */
export function injectAllCustomFonts() {
  loadCustomFonts().forEach((f) => injectGoogleFont(f.name));
}

/** Adiciona uma nova fonte (retorna null se já existe) */
export function addCustomFont(name: string): CustomFont | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const fonts = loadCustomFonts();
  const exists = fonts.some(
    (f) => f.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) return null;
  const newFont: CustomFont = {
    name: trimmed,
    value: `'${trimmed}', sans-serif`,
  };
  fonts.push(newFont);
  saveCustomFonts(fonts);
  injectGoogleFont(trimmed);
  return newFont;
}

/** Remove uma fonte pelo name */
export function removeCustomFont(name: string) {
  const fonts = loadCustomFonts().filter(
    (f) => f.name.toLowerCase() !== name.toLowerCase()
  );
  saveCustomFonts(fonts);
}
