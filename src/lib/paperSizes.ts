// ─────────────────────────────────────────────────────────────────────────────
// paperSizes.ts  –  fonte única de verdade para todos os formatos de papel
// ─────────────────────────────────────────────────────────────────────────────

export interface PaperSize {
  value: string;
  label: string;
}

export const PAPER_SIZES: PaperSize[] = [
  { value: "A4",             label: "A4 (210×297mm)" },
  { value: "A5",             label: "A5 (148×210mm)" },
  { value: "A3",             label: "A3 (297×420mm)" },
  { value: "A4-duplo",       label: "A4 Duplo Horizontal (2×A5)" },
  { value: "A4-duplo-v",     label: "A4 Duplo Vertical (2×metade)" },
  { value: "gondola",        label: "Gôndola (faixa)" },
  { value: "10x15",          label: "10×15 cm" },
  { value: "atacado-varejo", label: "Atacado/Varejo (A4 – 210×297mm)" },
  { value: "A4-8",           label: "A4 (8 cartazes)" },
];

/** Dimensões físicas em mm [largura, altura] para geração de PDF */
export const PDF_FORMATS: Record<string, [number, number]> = {
  A4:             [210, 297],
  A5:             [148, 210],
  A3:             [297, 420],
  "A4-duplo":     [210, 297],
  "A4-duplo-v":   [210, 297],
  gondola:        [297, 74],
  "10x15":        [100, 150],
  "atacado-varejo": [210, 297],
  "A4-8":         [210, 297],
};

/** Proporção largura/altura para o preview no canvas (800px de referência) */
export const ASPECT_RATIOS: Record<string, number> = {
  A4:             210 / 297,
  A5:             148 / 210,
  A3:             297 / 420,
  gondola:        4 / 1,
  "10x15":        10 / 15,
  "A4-duplo":     148 / 210,
  "A4-duplo-v":   210 / (297 / 2),
  "atacado-varejo": 210 / 297,
  "A4-8":         (210 / 2) / (297 / 4),
  custom:         3 / 4,
};

export const POSTER_REFERENCE_WIDTH = 800;

/** Largura física do cartaz individual capturado, não necessariamente da folha inteira. */
export const PRINT_SLOT_WIDTH_MM: Record<string, number> = {
  A4: 210,
  A5: 148,
  A3: 297,
  gondola: 297,
  "10x15": 100,
  "atacado-varejo": 210,
  "A4-duplo": 148.5,
  "A4-duplo-v": 210,
  "A4-8": 105,
};

export interface SheetSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: boolean;
}

/** Retorna o formato base do PDF para tamanhos duplos */
export function getBasePdfFormat(paperSize: string): [number, number] {
  if (paperSize === "A3-duplo") return PDF_FORMATS.A3;
  if (paperSize.startsWith("A4-duplo")) return PDF_FORMATS.A4;
  return PDF_FORMATS[paperSize] ?? PDF_FORMATS.A4;
}

/** True para qualquer variante duplo */
export function isDuploPaperSize(paperSize: string): boolean {
  return paperSize === "A4-duplo" || paperSize === "A4-duplo-v" || paperSize === "A3-duplo";
}

/** True para variantes que precisam de rotação do cartaz (duplo horizontal) */
export function needsRotation(paperSize: string): boolean {
  return paperSize === "A4-duplo" || paperSize === "A3-duplo";
}

/** Quantidade de cartazes físicos por folha no formato selecionado. */
export function getPostersPerSheet(paperSize: string): number {
  if (paperSize === "A4-8") return 8;
  if (isDuploPaperSize(paperSize)) return 2;
  return 1;
}

/** Formato usado pelo cartaz individual antes de ser posicionado na folha final. */
export function getPosterPreviewPaperSize(paperSize: string): string {
  if (paperSize === "A4-duplo") return "A4";
  if (paperSize === "A4-duplo-v") return "A4-duplo-v";
  if (paperSize === "A4-8") return "A4-8";
  return paperSize;
}

/** Calcula pixelRatio por DPI alvo, com teto para evitar canvas grande demais. */
export function getPixelRatioForDpi(paperSize: string, dpi = 300, maxPixelRatio = 4): number {
  const widthMm = PRINT_SLOT_WIDTH_MM[paperSize] ?? PRINT_SLOT_WIDTH_MM.A4;
  const targetWidthPx = (widthMm / 25.4) * dpi;
  const ratio = targetWidthPx / POSTER_REFERENCE_WIDTH;

  return Math.max(1, Math.min(maxPixelRatio, Number(ratio.toFixed(2))));
}

/** Slots físicos de impressão em uma página PDF, em milímetros. */
export function getSheetSlots(paperSize: string, pageWidth: number, pageHeight: number): SheetSlot[] {
  if (paperSize === "A4-8") {
    const cellW = pageWidth / 2;
    const cellH = pageHeight / 4;

    return Array.from({ length: 8 }, (_, index) => ({
      x: (index % 2) * cellW,
      y: Math.floor(index / 2) * cellH,
      width: cellW,
      height: cellH,
      rotate: false,
    }));
  }

  if (isDuploPaperSize(paperSize)) {
    const halfH = pageHeight / 2;

    return [0, 1].map((slot) => ({
      x: 0,
      y: slot * halfH,
      width: pageWidth,
      height: halfH,
      rotate: needsRotation(paperSize),
    }));
  }

  return [{
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    rotate: false,
  }];
}
