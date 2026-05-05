import type { ReactNode } from "react";

interface PosterSheetPreviewProps {
    paperSize: string;
    className?: string;
    renderPoster: (slotIndex: number) => ReactNode;
    renderEmptySlot?: (slotIndex: number) => ReactNode;
}

export function getSheetPosterPaperSize(paperSize: string): string {
    if (paperSize === "A4-duplo" || paperSize === "A4-duplo-v" || paperSize === "A4-8") return paperSize;
    return paperSize;
}

const sheetClass = "w-full bg-background rounded-lg overflow-hidden shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.15)]";

function RotatedSlot({ children }: { children: ReactNode }) {
    return (
        <div className="relative w-full h-full overflow-hidden bg-background">
            <div className="absolute left-1/2 top-1/2" style={{ width: "70.7142857%", transform: "translate(-50%, -50%) rotate(90deg)", transformOrigin: "center" }}>
                {children}
            </div>
        </div>
    );
}

export default function PosterSheetPreview({ paperSize, className = "", renderPoster, renderEmptySlot }: PosterSheetPreviewProps) {
    if (paperSize === "A4-duplo") {
        return (
            <div className={`${sheetClass} ${className}`} style={{ aspectRatio: "210 / 297" }}>
                <div className="grid h-full grid-rows-2">
                    {[0, 1].map((slot) => <RotatedSlot key={slot}>{renderPoster(slot)}</RotatedSlot>)}
                </div>
            </div>
        );
    }

    if (paperSize === "A4-duplo-v") {
        return (
            <div className={`${sheetClass} ${className}`} style={{ aspectRatio: "210 / 297" }}>
                <div className="grid h-full grid-rows-2">
                    {[0, 1].map((slot) => <div key={slot} className="relative h-full min-h-0 overflow-hidden bg-background">{renderPoster(slot)}</div>)}
                </div>
            </div>
        );
    }

    if (paperSize === "A4-8") {
        return (
            <div className={`${sheetClass} ${className}`} style={{ aspectRatio: "210 / 297" }}>
                <div className="grid h-full grid-rows-4 grid-cols-2">
                    {Array.from({ length: 8 }).map((_, slot) => (
                        <div key={slot} className="relative h-full min-h-0 overflow-hidden bg-background">
                            {renderPoster(slot) || renderEmptySlot?.(slot)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return <div className={`${sheetClass} ${className}`}>{renderPoster(0)}</div>;
}