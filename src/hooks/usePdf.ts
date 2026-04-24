// ─────────────────────────────────────────────────────────────────────────────
// usePdf.ts  –  hook com toda a lógica de captura de canvas, exportação de
//               PDF e impressão.  Compartilhado por EditorPage e BatchPage.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback } from "react";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { PDF_FORMATS, getBasePdfFormat, needsRotation } from "@/lib/paperSizes";

// ── helpers ──────────────────────────────────────────────────────────────────

export function rotateCanvas90(src: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement("canvas");
  rotated.width = src.height;
  rotated.height = src.width;
  const ctx = rotated.getContext("2d")!;
  ctx.translate(rotated.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return rotated;
}

/** Abre um PDF em um iframe invisível e dispara o diálogo de impressão.
 *  Faz fallback para download se o browser bloquear. */
export function openPdfPrint(pdf: jsPDF, fallbackFilename: string): void {
  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.src = pdfUrl;

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { URL.revokeObjectURL(pdfUrl); iframe.remove(); }, 30_000);
    } catch {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = fallbackFilename;
      a.click();
      setTimeout(() => { URL.revokeObjectURL(pdfUrl); iframe.remove(); }, 1_000);
    }
  };

  document.body.appendChild(iframe);
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
}

// ── hook principal ────────────────────────────────────────────────────────────

export function usePdf() {
  const { toast } = useToast();

  /** Captura um elemento DOM como HTMLCanvasElement em alta resolução */
  const captureElement = useCallback(async (
    el: HTMLElement,
    options: CapturePosterOptions,
  ): Promise<HTMLCanvasElement | null> => {
    const { bgColor, bgBaseOnly = false, customBackground = "", pixelRatio = 4 } = options;

    const elWidth = Math.round(parseFloat(el.style.width));
    const elHeight = Math.round(parseFloat(el.style.height));

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

    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 50));

    try {
      return await htmlToImage.toCanvas(clone, {
        pixelRatio,
        width: elWidth,
        height: elHeight,
        backgroundColor: bgBaseOnly && customBackground ? "#ffffff" : bgColor,
        skipAutoScale: true,
      });
    } finally {
      document.body.removeChild(wrapper);
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

      if (paperSize === "A4-duplo") {
        const rotated = rotateCanvas90(canvas);
        const imgData = rotated.toDataURL("image/png", 1.0);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 297] });
        const halfH = 297 / 2;
        pdf.addImage(imgData, "PNG", 0, 0, 210, halfH);
        pdf.addImage(imgData, "PNG", 0, halfH, 210, halfH);
        rotated.width = 0; rotated.height = 0;
        pdf.save(filename);
        toast({ title: "PDF exportado!", description: "A4 Duplo Horizontal – 2 cartazes por folha." });

      } else if (paperSize === "A4-duplo-v") {
        const imgData = canvas.toDataURL("image/png", 1.0);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 297] });
        const halfH = 297 / 2;
        pdf.addImage(imgData, "PNG", 0, 0, 210, halfH);
        pdf.addImage(imgData, "PNG", 0, halfH, 210, halfH);
        pdf.save(filename);
        toast({ title: "PDF exportado!", description: "A4 Duplo Vertical – 2 cartazes por folha." });

      } else if (paperSize === "A4-8") {
        const imgData = canvas.toDataURL("image/png", 1.0);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 297] });
        const halfW = 210 / 2;
        const quarterH = 297 / 4;
        for (let i = 0; i < 8; i++) {
          pdf.addImage(imgData, "PNG", (i % 2) * halfW, Math.floor(i / 2) * quarterH, halfW, quarterH);
        }
        pdf.save(filename);
        toast({ title: "PDF exportado!", description: "A4 (8 cartazes por folha)." });

      } else {
        const fmt = PDF_FORMATS[paperSize] ?? PDF_FORMATS.A4;
        const isLandscape = fmt[0] > fmt[1];
        const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: fmt });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        pdf.addImage(canvas.toDataURL("image/png", 1.0), "PNG", 0, 0, pdfW, pdfH);
        pdf.save(filename);
        toast({ title: "PDF exportado!", description: `Formato ${paperSize} – alta resolução.` });
      }
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
      const isLandsc = fmt[0] > fmt[1];

      if (paperSize === "A4-duplo" || paperSize === "A4-duplo-v") {
        let img = canvas;
        if (needsRotation(paperSize)) {
          img = rotateCanvas90(canvas);
        }
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 297] });
        const halfH = 297 / 2;
        const data = img.toDataURL("image/png", 1.0);
        if (needsRotation(paperSize)) { img.width = 0; img.height = 0; }
        pdf.addImage(data, "PNG", 0, 0, 210, halfH);
        pdf.addImage(data, "PNG", 0, halfH, 210, halfH);
        openPdfPrint(pdf, filename);

      } else if (paperSize === "A4-8") {
        const data = canvas.toDataURL("image/png", 1.0);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 297] });
        const halfW = 210 / 2;
        const quarterH = 297 / 4;
        for (let i = 0; i < 8; i++) {
          pdf.addImage(data, "PNG", (i % 2) * halfW, Math.floor(i / 2) * quarterH, halfW, quarterH);
        }
        openPdfPrint(pdf, filename);

      } else {
        const pdf = new jsPDF({ orientation: isLandsc ? "landscape" : "portrait", unit: "mm", format: fmt });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        pdf.addImage(canvas.toDataURL("image/png", 1.0), "PNG", 0, 0, pdfW, pdfH);
        openPdfPrint(pdf, filename);
      }

      toast({ title: "Impressão pronta!" });
    } catch {
      toast({ title: "Erro ao imprimir", variant: "destructive" });
    }
  }, [captureElement, toast]);

  return { captureElement, exportPNG, exportPDF, printPoster };
}
