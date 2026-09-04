export const MAX_BACKGROUND_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_BACKGROUND_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_PRESET_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_PRESET_IMPORT_ITEMS = 500;
export const MAX_CUSTOM_FONT_NAME_LENGTH = 60;
export const MAX_TEXT_INPUT_BYTES = 512 * 1024;
export const MAX_CSV_IMPORT_BYTES = 2 * 1024 * 1024;

const SAFE_GOOGLE_FONT_NAME = /^[\p{L}\p{N} ._-]{1,60}$/u;
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

export type AllowedFileRule = {
  allowedTypes: readonly string[];
  maxBytes: number;
  label: string;
};

function removeUnsafeControlChars(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      const isCommonWhitespace = code === 9 || code === 10 || code === 13;
      const isControlChar = code < 32 || code === 127;
      return isCommonWhitespace || !isControlChar;
    })
    .join("");
}

export function sanitizePlainText(value: unknown, maxLength: number): string {
  return removeUnsafeControlChars(String(value ?? ""))
    .trim()
    .slice(0, maxLength);
}

export function getStringByteLength(value: string): number {
  return new Blob([value]).size;
}

export function validateTextPayloadSize(value: string, maxBytes: number): string | null {
  if (getStringByteLength(value) > maxBytes) {
    return `O conteúdo é muito grande. Limite: ${formatSecurityBytes(maxBytes)}.`;
  }

  return null;
}

export function isAllowedImageType(type: string): boolean {
  return ["image/png", "image/jpeg", "image/webp"].includes(type);
}

export function validateFile(file: File, rule: AllowedFileRule): string | null {
  if (file.size <= 0) {
    return `${rule.label} vazio ou inválido.`;
  }

  if (file.size > rule.maxBytes) {
    return `${rule.label} muito grande. Limite: ${formatSecurityBytes(rule.maxBytes)}.`;
  }

  if (!rule.allowedTypes.includes(file.type)) {
    return `${rule.label} em formato não permitido.`;
  }

  return null;
}

export function validateBackgroundFile(file: File): string | null {
  if (file.type === "application/pdf") {
    return validateFile(file, {
      allowedTypes: ["application/pdf"],
      maxBytes: MAX_BACKGROUND_PDF_BYTES,
      label: "PDF de fundo",
    });
  }

  return validateFile(file, {
    allowedTypes: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: MAX_BACKGROUND_IMAGE_BYTES,
    label: "Imagem de fundo",
  });
}

export function validateCsvFile(file: File): string | null {
  const typeAllowed = file.type === "text/csv"
    || file.type === "application/vnd.ms-excel"
    || file.type === "text/plain"
    || file.name.toLowerCase().endsWith(".csv");

  if (!typeAllowed) {
    return "Envie um arquivo CSV válido.";
  }

  if (file.size <= 0) {
    return "CSV vazio ou inválido.";
  }

  if (file.size > MAX_CSV_IMPORT_BYTES) {
    return `CSV muito grande. Limite: ${formatSecurityBytes(MAX_CSV_IMPORT_BYTES)}.`;
  }

  return null;
}

export function validatePresetImportFile(file: File): string | null {
  const typeAllowed = file.type === "application/json"
    || file.type === "text/json"
    || file.name.toLowerCase().endsWith(".json");

  if (!typeAllowed) {
    return "Envie um arquivo JSON de presets válido.";
  }

  if (file.size <= 0) {
    return "Arquivo de presets vazio ou inválido.";
  }

  if (file.size > MAX_PRESET_IMPORT_BYTES) {
    return `Arquivo de presets muito grande. Limite: ${formatSecurityBytes(MAX_PRESET_IMPORT_BYTES)}.`;
  }

  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) reject(new Error("file_read_failed"));
      else resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

export function isSafeImageSource(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const source = value.trim();

  if (!source) return false;
  if (source.length > MAX_BACKGROUND_IMAGE_BYTES * 2) return false;
  if (source.startsWith("/")) return true;
  if (source.startsWith("blob:")) return true;
  if (IMAGE_DATA_URL_PATTERN.test(source)) return true;

  try {
    const url = new URL(source);
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost");
  } catch {
    return false;
  }
}

export function validateGoogleFontName(value: string): string | null {
  const normalized = sanitizePlainText(value, MAX_CUSTOM_FONT_NAME_LENGTH);

  if (!normalized) return "Informe o nome da fonte.";
  if (!SAFE_GOOGLE_FONT_NAME.test(normalized)) {
    return "Use apenas letras, números, espaços, ponto, hífen ou sublinhado no nome da fonte.";
  }

  return null;
}

export function formatSecurityBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}
