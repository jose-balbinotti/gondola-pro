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
  "A4-duplo":     148 / 210,   // cartaz individual = A5 landscape rotacionado
  "A4-duplo-v":   210 / (297 / 2),
  "atacado-varejo": 210 / 297,
  "A4-8":         (210 / 2) / (297 / 4), // célula individual: 105×74,25mm
  custom:         3 / 4,
};

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
