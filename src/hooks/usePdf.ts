// ─────────────────────────────────────────────────────────────────────────────
// usePdf.ts  –  hook com toda a lógica de captura de canvas, exportação de
//               PDF e impressão.  Compartilhado por EditorPage e BatchPage.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback } from "react";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { getBasePdfFormat, getSheetSlots } from "@/lib/paperSizes";

// ── helpers ──────────────────────────────────────────────────────────────────

export function rotateCanvas90(src: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement("canvas");
  rotated.width = src.height;
  rotated.height = src.width;

  const ctx = rotated.getContext("2d");
  if (!ctx) throw new Error("Não foi possível inicializar o canvas de rotação.");

  ctx.translate(rotated.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return rotated;
}

export type PdfImageFormat = "PNG" | "JPEG";

export interface PdfImageData {
  data: Uint8Array;
  format: PdfImageFormat;
}
export interface PdfOutputResult {
  blob: Blob;
  bytes: number;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0s";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getApproxMemoryMB(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
  return typeof memory?.usedJSHeapSize === "number"
    ? Number((memory.usedJSHeapSize / (1024 * 1024)).toFixed(1))
    : null;
}

export function savePdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function outputPdfBlob(pdf: jsPDF): PdfOutputResult {
  const blob = pdf.output("blob");
  return { blob, bytes: blob.size };
}

export async function getReusableFontEmbedCSS(el: HTMLElement): Promise<string | undefined> {
  await document.fonts?.ready;
  return htmlToImage.getFontEmbedCSS(el);
}


export function canvasToPdfImage(
  canvas: HTMLCanvasElement,
  mimeType: "image/png" | "image/jpeg" = "image/jpeg",
  quality = 0.92,
): Promise<PdfImageData> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível converter o canvas em imagem."));
          return;
        }

        try {
          resolve({
            data: new Uint8Array(await blob.arrayBuffer()),
            format: mimeType === "image/png" ? "PNG" : "JPEG",
          });
        } catch (error) {
          reject(error);
        }
      },
      mimeType,
      quality,
    );
  });
}

function getElementPixelSize(el: HTMLElement): { width: number; height: number } {
  const inlineWidth = Number.parseFloat(el.style.width);
  const inlineHeight = Number.parseFloat(el.style.height);
  const computed = window.getComputedStyle(el);
  const computedWidth = Number.parseFloat(computed.width);
  const computedHeight = Number.parseFloat(computed.height);

  const width = Number.isFinite(inlineWidth) && inlineWidth > 0 ? inlineWidth : computedWidth;
  const height = Number.isFinite(inlineHeight) && inlineHeight > 0 ? inlineHeight : computedHeight;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Elemento sem dimensões válidas para captura.");
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

async function addCanvasImageToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  rotate = false,
): Promise<void> {
  const imageCanvas = rotate ? rotateCanvas90(canvas) : canvas;

  try {
    const image = await canvasToPdfImage(imageCanvas, "image/jpeg", 0.92);
    pdf.addImage(image.data, image.format, x, y, width, height, undefined, "FAST");
  } finally {
    if (rotate) {
      imageCanvas.width = 0;
      imageCanvas.height = 0;
    }
  }
}

async function createPdfImageFromCanvas(canvas: HTMLCanvasElement, rotate = false, quality = 0.92): Promise<PdfImageData> {
  const imageCanvas = rotate ? rotateCanvas90(canvas) : canvas;

  try {
    return await canvasToPdfImage(imageCanvas, "image/jpeg", quality);
  } finally {
    if (rotate) {
      imageCanvas.width = 0;
      imageCanvas.height = 0;
    }
  }
}

function addPdfImageToAllSlots(pdf: jsPDF, image: PdfImageData, slots: ReturnType<typeof getSheetSlots>): void {
  for (const slot of slots) {
    pdf.addImage(image.data, image.format, slot.x, slot.y, slot.width, slot.height, undefined, "FAST");
  }
}

/** Abre um PDF em um iframe invisível e dispara o diálogo de impressão.
 *  Faz fallback para download se o browser bloquear. */
export function openPdfBlobPrint(pdfBlob: Blob, fallbackFilename: string): void {
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.src = pdfUrl;

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => { URL.revokeObjectURL(pdfUrl); iframe.remove(); }, 30_000);
    } catch {
      savePdfBlob(pdfBlob, fallbackFilename);
      window.setTimeout(() => { URL.revokeObjectURL(pdfUrl); iframe.remove(); }, 1_000);
    }
  };

  document.body.appendChild(iframe);
}

export function openPdfPrint(pdf: jsPDF, fallbackFilename: string): void {
  openPdfBlobPrint(pdf.output("blob"), fallbackFilename);
}

// ── tipos ─────────────────────────────────────────────────────────────────────

export interface CapturePosterOptions {
  /** Cor de fundo usada se não houver imagem de fundo personalizada */
  bgColor: string;
  /** Se true, renderiza sem a imagem de fundo personalizada */
  bgBaseOnly?: boolean;
  /** Data URL da imagem de fundo personalizada */
  customBackground?: string;
  /** Escala de pixel para captura (padrão: 4) */
  pixelRatio?: number;
  /** CSS de fontes pré-embutido para evitar reprocessamento a cada captura */
  fontEmbedCSS?: string;
}

// ── hook principal ────────────────────────────────────────────────────────────

export function usePdf() {
  const { toast } = useToast();

  /** Captura um elemento DOM como HTMLCanvasElement em alta resolução */
  const captureElement = useCallback(async (
    el: HTMLElement,
    options: CapturePosterOptions,
  ): Promise<HTMLCanvasElement | null> => {
    const { bgColor, bgBaseOnly = false, customBackground = "", pixelRatio = 4, fontEmbedCSS } = options;
    const { width: elWidth, height: elHeight } = getElementPixelSize(el);

    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.transform = "none";
    clone.style.position = "absolute";
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.width = `${elWidth}px`;
    clone.style.height = `${elHeight}px`;

    if (bgBaseOnly && customBackground) {
      clone.style.backgroundImage = "none";
      clone.style.backgroundColor = "#ffffff";
    }

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `position:fixed;top:-20000px;left:-20000px;width:${elWidth}px;height:${elHeight}px;overflow:visible;z-index:-9999;`;
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    await document.fonts?.ready;
    void clone.offsetWidth;

    try {
      return await htmlToImage.toCanvas(clone, {
        pixelRatio,
        width: elWidth,
        height: elHeight,
        backgroundColor: bgBaseOnly && customBackground ? "#ffffff" : bgColor,
        fontEmbedCSS,
        skipAutoScale: true,
      });
    } finally {
      wrapper.remove();
    }
  }, []);

  /** Exporta o cartaz atual como PNG */
  const exportPNG = useCallback(async (
    el: HTMLElement | null,
    filename: string,
    options: CapturePosterOptions,
  ) => {
    if (!el) return;
    try {
      const canvas = await captureElement(el, options);
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
      canvas.width = 0;
      canvas.height = 0;
      toast({ title: "PNG exportado!", description: "Cartaz salvo em alta resolução." });
    } catch {
      toast({ title: "Erro ao exportar PNG", variant: "destructive" });
    }
  }, [captureElement, toast]);

  /** Exporta o cartaz atual como PDF respeitando o tamanho de folha */
  const exportPDF = useCallback(async (
    el: HTMLElement | null,
    paperSize: string,
    filename: string,
    options: CapturePosterOptions,
  ) => {
    if (!el) return;
    try {
      const canvas = await captureElement(el, options);
      if (!canvas) return;

      const fmt = getBasePdfFormat(paperSize);
      const isLandscape = fmt[0] > fmt[1];
      const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: fmt });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const slots = getSheetSlots(paperSize, pdfW, pdfH);
      const image = await createPdfImageFromCanvas(canvas, slots.some((slot) => slot.rotate), 0.92);
      addPdfImageToAllSlots(pdf, image, slots);

      canvas.width = 0;
      canvas.height = 0;
      savePdfBlob(outputPdfBlob(pdf).blob, filename);

      const description = slots.length > 1
        ? `${slots.length} cartazes por folha – ${paperSize}.`
        : `Formato ${paperSize} – alta resolução.`;
      toast({ title: "PDF exportado!", description });
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    }
  }, [captureElement, toast]);

  /** Envia o cartaz diretamente para a impressora */
  const printPoster = useCallback(async (
    el: HTMLElement | null,
    paperSize: string,
    filename: string,
    options: CapturePosterOptions,
  ) => {
    if (!el) return;
    try {
      const canvas = await captureElement(el, options);
      if (!canvas) {
        toast({ title: "Erro ao preparar impressão", variant: "destructive" });
        return;
      }

      const fmt = getBasePdfFormat(paperSize);
      const isLandscape = fmt[0] > fmt[1];
      const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: fmt });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const slots = getSheetSlots(paperSize, pdfW, pdfH);
      const image = await createPdfImageFromCanvas(canvas, slots.some((slot) => slot.rotate), 0.92);
      addPdfImageToAllSlots(pdf, image, slots);

      canvas.width = 0;
      canvas.height = 0;
      openPdfPrint(pdf, filename);
      toast({ title: "Impressão pronta!" });
    } catch {
      toast({ title: "Erro ao imprimir", variant: "destructive" });
    }
  }, [captureElement, toast]);

  return { captureElement, exportPNG, exportPDF, printPoster };
}
