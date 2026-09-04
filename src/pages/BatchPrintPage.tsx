import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import PosterPreview, { DEFAULT_POSTER_STYLE, type PosterStyle } from "@/components/poster/PosterPreview";
import { DEFAULT_POSTER_DATA, TEMPLATES, type PosterData } from "@/lib/templates";
import { PDF_FORMATS } from "@/lib/paperSizes";
import { injectAllCustomFonts } from "@/lib/customFonts";
import { useReactToPrint } from "react-to-print";

type BatchPrintSlot = {
    data: PosterData;
    style: PosterStyle;
} | null;

type BatchPrintPayload = {
    templateId: string;
    paperSize: string;
    posterPaperSize: string;
    customBackground?: string;
    sheets: BatchPrintSlot[][];
    totalPrintCount: number;
    totalSheetCount: number;
    createdAt: number;
};

type SlotLayout = {
    slot: CSSProperties;
    posterPaperSize: string;
    rotate?: boolean;
};

const getPageDimensions = (paperSize: string): [number, number] => {
    // Os formatos compostos continuam sendo impressos/salvos em uma folha A4 real.
    if (paperSize === "A4-duplo" || paperSize === "A4-duplo-v" || paperSize === "A4-8") {
        return PDF_FORMATS.A4;
    }

    return PDF_FORMATS[paperSize] ?? PDF_FORMATS.A4;
};

const getExpectedSlots = (paperSize: string) => {
    if (paperSize === "A4-8") return 8;
    if (paperSize === "A4-duplo" || paperSize === "A4-duplo-v") return 2;
    return 1;
};

const getSlotLayout = (paperSize: string, slotIdx: number, fallbackPosterPaperSize: string): SlotLayout => {
    if (paperSize === "A4-8") {
        return {
            slot: {
                left: `${(slotIdx % 2) * 50}%`,
                top: `${Math.floor(slotIdx / 2) * 25}%`,
                width: "50%",
                height: "25%",
            },
            posterPaperSize: "A4-8",
        };
    }

    if (paperSize === "A4-duplo") {
        // Dois cartazes A4 retrato rotacionados, ocupando duas metades horizontais da folha A4.
        return {
            slot: {
                left: 0,
                top: `${slotIdx * 50}%`,
                width: "100%",
                height: "50%",
            },
            posterPaperSize: "A4",
            rotate: true,
        };
    }

    if (paperSize === "A4-duplo-v") {
        // Dois cartazes horizontais, um em cada metade da folha A4.
        return {
            slot: {
                left: 0,
                top: `${slotIdx * 50}%`,
                width: "100%",
                height: "50%",
            },
            posterPaperSize: "A4-duplo-v",
        };
    }

    return {
        slot: {
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
        },
        posterPaperSize: fallbackPosterPaperSize || paperSize,
    };
};

const getPageStyle = (paperSize: string): CSSProperties => {
    const [width, height] = getPageDimensions(paperSize);

    return {
        width: `${width}mm`,
        height: `${height}mm`,
    };
};

const buildPrintCss = (paperSize = "A4") => {
    const [pageWidth, pageHeight] = getPageDimensions(paperSize);

    return `
        html, body, #root {
            margin: 0;
            padding: 0;
            min-height: 100%;
            background: #f3f4f6;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .screen-toolbar {
            position: sticky;
            top: 0;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 12px 16px;
            background: white;
            border-bottom: 1px solid #e5e7eb;
            font-family: Arial, sans-serif;
        }

        .screen-toolbar strong {
            font-size: 14px;
        }

        .screen-toolbar span {
            display: block;
            margin-top: 2px;
            color: #6b7280;
            font-size: 12px;
        }

        .screen-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        .screen-toolbar button {
            border: 0;
            border-radius: 8px;
            background: #111827;
            color: white;
            cursor: pointer;
            font-size: 13px;
            font-weight: 700;
            padding: 9px 14px;
        }

        .screen-toolbar button.secondary {
            background: #374151;
        }

        .screen-toolbar button:disabled {
            cursor: wait;
            opacity: 0.65;
        }

        .print-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            padding: 24px;
        }

        .print-page {
            position: relative;
            overflow: hidden;
            flex: 0 0 auto;
            background: white;
            box-shadow: 0 8px 30px rgba(15, 23, 42, 0.16);
            break-after: page;
            page-break-after: always;
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .print-page:last-child {
            break-after: auto;
            page-break-after: auto;
        }

        .print-slot {
            position: absolute;
            overflow: hidden;
            background: white;
        }

        .print-poster-wrapper {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .print-poster-wrapper > div {
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            aspect-ratio: auto !important;
        }

        .print-poster-wrapper.rotate-poster {
            left: 50%;
            top: 50%;
            width: 70.710678%;
            height: 141.421356%;
            transform: translate(-50%, -50%) rotate(90deg);
            transform-origin: center center;
        }

        .screen-message {
            padding: 32px;
            font-family: Arial, sans-serif;
        }

        body.exporting-pdf .screen-toolbar {
            display: none !important;
        }

        body.exporting-pdf .print-area {
            padding: 0 !important;
            gap: 0 !important;
            background: white !important;
        }

        body.exporting-pdf .print-page {
            margin: 0 !important;
            box-shadow: none !important;
        }

        @page {
            size: ${pageWidth}mm ${pageHeight}mm;
            margin: 0;
        }

        @media print {
            @page {
                size: ${pageWidth}mm ${pageHeight}mm;
                margin: 0;
            }

            html, body, #root {
                width: ${pageWidth}mm !important;
                min-height: ${pageHeight}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
            }

            .screen-toolbar,
            .screen-message {
                display: none !important;
            }

            .print-area {
                display: block !important;
                width: ${pageWidth}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
            }

            .print-page {
                width: ${pageWidth}mm !important;
                height: ${pageHeight}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: white !important;
                box-shadow: none !important;
                break-after: page;
                page-break-after: always;
            }

            .print-page:last-child {
                break-after: auto;
                page-break-after: auto;
            }
        }
    `;
};

const waitForAssets = async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    if (document.fonts?.ready) {
        await document.fonts.ready;
    }

    await Promise.all(
        Array.from(document.images)
            .filter((img) => !img.complete)
            .map((img) => new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            })),
    );
};

export default function BatchPrintPage() {
    const [payload, setPayload] = useState<BatchPrintPayload | null>(null);
    const [error, setError] = useState("");
    const [savingPdf, setSavingPdf] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const mode = params.get("mode") || "print";
    const printCss = useMemo(() => buildPrintCss(payload?.paperSize), [payload?.paperSize]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: "cartazes",
        ignoreGlobalStyles: true,
        pageStyle: printCss,
    });

    const handleSavePdf = async () => {
        if (!payload || !printRef.current || savingPdf) return;

        setSavingPdf(true);
        document.body.classList.add("exporting-pdf");

        try {
            await waitForAssets();

            const [pageWidth, pageHeight] = getPageDimensions(payload.paperSize);
            const orientation = pageWidth > pageHeight ? "landscape" : "portrait";
            const pdf = new jsPDF({ orientation, unit: "mm", format: [pageWidth, pageHeight] });
            const pages = Array.from(printRef.current.querySelectorAll<HTMLElement>(".print-page"));

            for (let index = 0; index < pages.length; index++) {
                if (index > 0) pdf.addPage([pageWidth, pageHeight], orientation);

                const dataUrl = await toPng(pages[index], {
                    cacheBust: true,
                    pixelRatio: 2,
                    backgroundColor: "#ffffff",
                    style: {
                        margin: "0",
                        boxShadow: "none",
                    },
                });

                pdf.addImage(dataUrl, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
            }

            pdf.save("cartazes.pdf");
        } catch (err) {
            console.error("Erro ao salvar PDF:", err);
            setError("Não foi possível salvar o PDF. Tente usar o botão Imprimir e escolha 'Salvar como PDF' no navegador.");
        } finally {
            document.body.classList.remove("exporting-pdf");
            setSavingPdf(false);
        }
    };

    useEffect(() => {
        injectAllCustomFonts();

        const key = params.get("key");
        if (!key) {
            setError("Chave de impressão não informada.");
            return;
        }

        const raw = localStorage.getItem(key);
        if (!raw) {
            setError("Dados da impressão não encontrados. Volte ao lote e tente novamente.");
            return;
        }

        try {
            setPayload(JSON.parse(raw) as BatchPrintPayload);
        } catch {
            setError("Não foi possível ler os dados da impressão.");
        }
    }, [params]);

    useEffect(() => {
        if (!payload || mode !== "print") return;

        let cancelled = false;
        waitForAssets().then(() => {
            if (!cancelled) window.focus();
        });

        return () => {
            cancelled = true;
        };
    }, [payload, mode]);

    if (error) {
        return <div className="screen-message">{error}</div>;
    }

    if (!payload) {
        return <div className="screen-message">Preparando impressão...</div>;
    }

    const template = TEMPLATES.find((item) => item.id === payload.templateId) || TEMPLATES[0];
    const expectedSlots = getExpectedSlots(payload.paperSize);
    const fallbackPosterPaperSize = payload.posterPaperSize || payload.paperSize;

    return (
        <>
            <style>{printCss}</style>

            <div className="screen-toolbar">
                <div>
                    <strong>Preview de impressão/PDF</strong>
                    <span>
                        {payload.totalPrintCount} cartazes em {payload.totalSheetCount} folha(s) — formato {payload.paperSize}.
                    </span>
                </div>
                <div className="screen-actions">
                    <button type="button" className="secondary" onClick={handleSavePdf} disabled={savingPdf}>
                        {savingPdf ? "Gerando PDF..." : "Salvar PDF"}
                    </button>
                    <button type="button" onClick={handlePrint} disabled={savingPdf}>
                        Imprimir
                    </button>
                </div>
            </div>

            <main ref={printRef} className="print-area">
                {payload.sheets.map((sheet, pageIdx) => {
                    const slots = Array.from({ length: expectedSlots }, (_, slotIdx) => sheet[slotIdx] || null);

                    return (
                        <section
                            key={`${payload.paperSize}-${pageIdx}-${sheet.map((item) => item?.data?.productName || "empty").join("-")}`}
                            className="print-page"
                            style={getPageStyle(payload.paperSize)}
                        >
                            {slots.map((slot, slotIdx) => {
                                const layout = getSlotLayout(payload.paperSize, slotIdx, fallbackPosterPaperSize);

                                return (
                                    <div
                                        key={`${pageIdx}-${slotIdx}-${slot?.data?.productName || "empty"}-${slot?.data?.newPrice || ""}-${slot?.data?.oldPrice || ""}`}
                                        className="print-slot"
                                        style={layout.slot}
                                    >
                                        {slot && (
                                            <div className={`print-poster-wrapper${layout.rotate ? " rotate-poster" : ""}`}>
                                                <PosterPreview
                                                    template={template}
                                                    data={{ ...DEFAULT_POSTER_DATA, ...slot.data, templateId: payload.templateId }}
                                                    showQR={false}
                                                    qrUrl=""
                                                    style={{ ...DEFAULT_POSTER_STYLE, ...slot.style }}
                                                    paperSize={layout.posterPaperSize}
                                                    customBackground={payload.customBackground}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </section>
                    );
                })}
            </main>
        </>
    );
}
