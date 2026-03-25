import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { PosterTemplate, PosterData } from "@/lib/templates";

export const FONT_OPTIONS = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Arial Black', sans-serif", label: "Arial Black" },
  { value: "'Impact', sans-serif", label: "Impact" },
  { value: "'Georgia', serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "'Verdana', sans-serif", label: "Verdana" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans MS" },
  { value: "'Lucida Console', monospace", label: "Lucida Console" },
  { value: "'Tahoma', sans-serif", label: "Tahoma" },
  { value: "'Palatino Linotype', serif", label: "Palatino" },
  { value: "'Book Antiqua', serif", label: "Book Antiqua" },
  { value: "'Garamond', serif", label: "Garamond" },
  { value: "'Century Gothic', sans-serif", label: "Century Gothic" },
  { value: "'Copperplate', fantasy", label: "Copperplate" },
  { value: "'Rockwell', serif", label: "Rockwell" },
  { value: "'Franklin Gothic Medium', sans-serif", label: "Franklin Gothic" },
  { value: "'Cambria', serif", label: "Cambria" },
  { value: "'Segoe UI', sans-serif", label: "Segoe UI" },
  { value: "'Calibri', sans-serif", label: "Calibri" },
  { value: "'Consolas', monospace", label: "Consolas" },
];

export interface PosterStyle {
  showPromoLabel: boolean;
  promoText: string;
  productFontSize: number;
  brandFontSize: number;
  gramaturaFontSize: number;
  priceFontSize: number;
  centsFontSize: number;
  descriptionFontSize: number;
  productOffsetY: number;
  brandOffsetY: number;
  gramaturaOffsetY: number;
  priceOffsetY: number;
  validityOffsetY: number;
  unitOffsetX: number;
  fontFamily: string;
  priceFontFamily: string;
  descriptionFontFamily: string;
  shadowProduct: boolean;
  shadowBrand: boolean;
  shadowGramatura: boolean;
  shadowPrice: boolean;
  shadowDescription: boolean;
}

export const DEFAULT_POSTER_STYLE: PosterStyle = {
  showPromoLabel: false,
  promoText: "",
  productFontSize: 28,
  brandFontSize: 18,
  gramaturaFontSize: 14,
  priceFontSize: 56,
  centsFontSize: 28,
  descriptionFontSize: 12,
  productOffsetY: 0,
  brandOffsetY: 0,
  gramaturaOffsetY: 0,
  priceOffsetY: 0,
  validityOffsetY: 0,
  unitOffsetX: 0,
  fontFamily: "'Arial Black', sans-serif",
  priceFontFamily: "",
  descriptionFontFamily: "",
  shadowProduct: false,
  shadowBrand: false,
  shadowGramatura: false,
  shadowPrice: false,
  shadowDescription: false,
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

function splitPrice(price: string): { reais: string; centavos: string } {
  if (!price) return { reais: "0", centavos: "00" };
  const clean = price.replace("R$", "").trim();
  const parts = clean.split(/[,\.]/);
  return { reais: parts[0] || "0", centavos: parts[1] || "00" };
}

const PosterPreview = forwardRef<HTMLDivElement, Props>(
  ({ template, data, showQR, qrUrl, style, paperSize }, ref) => {
    const aspect = ASPECT_RATIOS[paperSize] || ASPECT_RATIOS[template.size] || "aspect-[3/4]";
    const { reais, centavos } = splitPrice(data.newPrice);

    const SHADOW = "3px 3px 6px rgba(0,0,0,0.7), 1px 1px 2px rgba(0,0,0,0.9)";
    const sProd = style.shadowProduct ? SHADOW : "none";
    const sBrand = style.shadowBrand ? SHADOW : "none";
    const sGram = style.shadowGramatura ? SHADOW : "none";
    const sPrice = style.shadowPrice ? SHADOW : "none";
    const sDesc = style.shadowDescription ? SHADOW : "none";
    const pFont = style.priceFontFamily || style.fontFamily;
    const dFont = style.descriptionFontFamily || style.fontFamily;

    return (
      <div
        ref={ref}
        className={`relative ${aspect} w-full flex flex-col items-center justify-center text-center p-6`}
        style={{ background: template.bgColor, fontFamily: style.fontFamily }}
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
          className="font-black leading-tight px-2"
          style={{
            color: template.textColor,
            fontSize: `${style.productFontSize}px`,
            transform: `translateY(${style.productOffsetY}px)`,
            textShadow: sProd,
          }}
        >
          {data.productName || "Nome do Produto"}
        </div>

        {/* Brand */}
        <div
          className="font-semibold leading-tight px-2"
          style={{
            color: template.textColor,
            fontSize: `${style.brandFontSize}px`,
            transform: `translateY(${style.brandOffsetY}px)`,
            opacity: 0.85,
            textShadow: sBrand,
          }}
        >
          {data.brandName || "Marca"}
        </div>

        {/* Gramatura */}
        <div
          className="font-medium leading-tight px-2 mb-2"
          style={{
            color: template.textColor,
            fontSize: `${style.gramaturaFontSize}px`,
            transform: `translateY(${style.gramaturaOffsetY}px)`,
            opacity: 0.7,
            textShadow: sGram,
          }}
        >
          {data.gramatura || "000g / 000ml"}
        </div>

        {/* Description */}
        {data.description && (
          <div className="mb-2 opacity-80" style={{ color: template.textColor, fontSize: `${style.descriptionFontSize}px`, fontFamily: dFont, textShadow: sDesc }}>
            {data.description}
          </div>
        )}

        {/* Price section */}
        <div
          className="flex flex-col items-center"
          style={{ transform: `translateY(${style.priceOffsetY}px)` }}
        >
          <div className="flex items-center justify-center gap-3 mb-1">
            {data.oldPrice && (
              <span className="text-base line-through opacity-60" style={{ color: template.textColor }}>
                R$ {data.oldPrice}
              </span>
            )}
          </div>
          {/* Split price: R$ reais , centavos */}
          <div className="flex items-baseline" style={{ color: template.priceColor, fontFamily: pFont, textShadow: sPrice }}>
            <span className="font-black" style={{ fontSize: `${style.centsFontSize}px` }}>R$</span>
            <span className="font-black" style={{ fontSize: `${style.priceFontSize}px`, lineHeight: 1 }}>
              {reais}
            </span>
            <span className="font-black" style={{ fontSize: `${style.centsFontSize}px` }}>
              ,{centavos}
            </span>
          </div>
          {data.unit && (
            <span className="text-xs mt-1 opacity-70" style={{ color: template.textColor, transform: `translateX(${style.unitOffsetX}px)`, display: 'inline-block' }}>/{data.unit}</span>
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
          <div className="text-[10px] mt-3 opacity-60 font-mono" style={{ color: template.textColor, transform: `translateY(${style.validityOffsetY}px)` }}>
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
