import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { PosterTemplate, PosterData } from "@/lib/templates";

export interface PosterStyle {
  showPromoLabel: boolean;
  promoText: string;
  productFontSize: number;
  priceFontSize: number;
  descriptionFontSize: number;
  productOffsetY: number;
  priceOffsetY: number;
}

export const DEFAULT_POSTER_STYLE: PosterStyle = {
  showPromoLabel: true,
  promoText: "",
  productFontSize: 28,
  priceFontSize: 56,
  descriptionFontSize: 12,
  productOffsetY: 0,
  priceOffsetY: 0,
};

interface Props {
  template: PosterTemplate;
  data: PosterData;
  showQR: boolean;
  qrUrl: string;
  style: PosterStyle;
  paperSize: string;
}

const ASPECT_RATIOS: Record<string, string> = {
  A4: "aspect-[210/297]",
  A5: "aspect-[148/210]",
  A3: "aspect-[297/420]",
  gondola: "aspect-[4/1]",
  "10x15": "aspect-[10/15]",
  custom: "aspect-[3/4]",
};

const PosterPreview = forwardRef<HTMLDivElement, Props>(
  ({ template, data, showQR, qrUrl, style, paperSize }, ref) => {
    const aspect = ASPECT_RATIOS[paperSize] || ASPECT_RATIOS[template.size] || "aspect-[3/4]";

    return (
      <div
        ref={ref}
        className={`relative ${aspect} w-full flex flex-col items-center justify-center text-center p-6`}
        style={{ background: template.bgColor }}
      >
        {/* Diagonal accent */}
        {template.layout === "diagonal" && (
          <div className="absolute top-0 right-0 w-0 h-0" style={{
            borderLeft: "120px solid transparent",
            borderTop: `120px solid ${template.accentColor}`,
          }} />
        )}

        {/* Header tag */}
        {style.showPromoLabel && (
          <div className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: template.accentColor }}>
            ★ {style.promoText || (template.category === 'leve-pague' ? `Leve ${data.quantity || '3'}` : 'Promoção')} ★
          </div>
        )}

        {/* Product Name */}
        <div
          className="font-black leading-tight mb-3 px-2"
          style={{
            color: template.textColor,
            fontSize: `${style.productFontSize}px`,
            transform: `translateY(${style.productOffsetY}px)`,
          }}
        >
          {data.productName || "Nome do Produto"}
        </div>

        {/* Description */}
        {data.description && (
          <div className="mb-2 opacity-80" style={{ color: template.textColor, fontSize: `${style.descriptionFontSize}px` }}>
            {data.description}
          </div>
        )}

        {/* Price section */}
        <div
          className="flex flex-col items-center"
          style={{ transform: `translateY(${style.priceOffsetY}px)` }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            {data.oldPrice && (
              <span className="text-base line-through opacity-60" style={{ color: template.textColor }}>
                R$ {data.oldPrice}
              </span>
            )}
          </div>
          <div className="text-price" style={{ color: template.priceColor, fontSize: `${style.priceFontSize}px` }}>
            R$ {data.newPrice || "0,00"}
          </div>
          {data.unit && (
            <span className="text-xs mt-1 opacity-70" style={{ color: template.textColor }}>/{data.unit}</span>
          )}
        </div>

        {/* Discount badge */}
        {data.discount && (
          <div className="inline-block mt-3 px-4 py-1.5 rounded-full text-sm font-black" style={{ background: template.accentColor, color: template.bgColor }}>
            {data.discount}% OFF
          </div>
        )}

        {/* Validity */}
        {data.validity && (
          <div className="text-[10px] mt-3 opacity-60 font-mono" style={{ color: template.textColor }}>
            Válido até {data.validity}
          </div>
        )}

        {/* QR Code */}
        {showQR && qrUrl && (
          <div className="mt-3 p-1.5 bg-background rounded inline-block">
            <QRCodeSVG value={qrUrl} size={56} />
          </div>
        )}
      </div>
    );
  }
);

PosterPreview.displayName = "PosterPreview";
export default PosterPreview;
