import { forwardRef, useRef, useState, useEffect, useImperativeHandle } from "react";
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
  { value: "SuperMarketSlant", label: "Super Market Slant" },
  { value: "'Balmy', cursive", label: "Balmy" },
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
  hideCurrencySymbol: boolean;
  centsAlignTop: boolean;
  centsUnderline: boolean;
  gramaturaLines: boolean;
  unitBelowCents: boolean;
  descriptionOffsetY: number;
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
  hideCurrencySymbol: false,
  centsAlignTop: false,
  centsUnderline: false,
  gramaturaLines: false,
  unitBelowCents: false,
  descriptionOffsetY: 0,
};

interface Props {
  template: PosterTemplate;
  data: PosterData;
  showQR: boolean;
  qrUrl: string;
  style: PosterStyle;
  paperSize: string;
  customBackground?: string;
}

// Fixed reference width for rendering. All px values in styles are relative to this.
// The poster always renders at this internal width and is CSS-scaled to fit the container.
const REFERENCE_WIDTH = 800;

const ASPECT_RATIOS: Record<string, number> = {
  A4: 210 / 297,
  A5: 148 / 210,
  A3: 297 / 420,
  gondola: 4 / 1,
  "10x15": 10 / 15,
  custom: 3 / 4,
};

function splitPrice(price: string): { reais: string; centavos: string } {
  if (!price) return { reais: "", centavos: "" };
  const clean = price.replace("R$", "").trim();
  if (!clean) return { reais: "", centavos: "" };
  const parts = clean.split(/[,\.]/);
  return { reais: parts[0] || "0", centavos: parts[1] || "00" };
}

const SUPER_MARKET_SLANT_FONT = "'Dancing Script', cursive";

function isSMS(font: string) { return font === "SuperMarketSlant"; }
function resolveSMS(font: string) { return isSMS(font) ? SUPER_MARKET_SLANT_FONT : font; }

const PosterPreview = forwardRef<HTMLDivElement, Props>(
  ({ template, data, showQR, qrUrl, style, paperSize, customBackground }, ref) => {
    const ratio = ASPECT_RATIOS[paperSize] || ASPECT_RATIOS[template.size] || 3 / 4;
    const referenceHeight = REFERENCE_WIDTH / ratio;

    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Forward the inner ref (fixed-size poster) so html2canvas captures at reference dimensions
    useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

    // Observe outer container width and compute CSS scale
    useEffect(() => {
      const el = outerRef.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        const w = entries[0].contentRect.width;
        setScale(w / REFERENCE_WIDTH);
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const { reais, centavos } = splitPrice(data.newPrice);
    const hasPrice = !!(reais || centavos);

    const SHADOW = "3px 3px 6px rgba(0,0,0,0.7), 1px 1px 2px rgba(0,0,0,0.9)";
    const sProd = style.shadowProduct ? SHADOW : "none";
    const sBrand = style.shadowBrand ? SHADOW : "none";
    const sGram = style.shadowGramatura ? SHADOW : "none";
    const sPrice = style.shadowPrice ? SHADOW : "none";
    const sDesc = style.shadowDescription ? SHADOW : "none";
    const pFont = style.priceFontFamily || style.fontFamily;
    const dFont = style.descriptionFontFamily || style.fontFamily;

    const mainFont = resolveSMS(style.fontFamily);
    const priceFont = resolveSMS(pFont);
    const descFont = resolveSMS(dFont);

    const smsSkew = (font: string) => isSMS(font) ? "skewX(-12deg)" : undefined;

    const bgImage = customBackground || template.backgroundImage;
    const hasBgImage = !!bgImage;

    return (
      <div
        ref={outerRef}
        style={{
          width: '100%',
          aspectRatio: `${ratio}`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          ref={innerRef}
          data-print-poster
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${REFERENCE_WIDTH}px`,
            height: `${referenceHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
            background: hasBgImage ? `url(${bgImage}) center/cover no-repeat` : template.bgColor,
            fontFamily: mainFont,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Diagonal accent */}
          {template.layout === "diagonal" && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderLeft: "120px solid transparent",
              borderTop: `120px solid ${template.accentColor}`,
            }} />
          )}

          {/* Header tag */}
          {style.showPromoLabel && (
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginBottom: '8px',
              color: template.accentColor,
            }}>
              ★ {style.promoText || (template.category === 'leve-pague' ? `Leve ${data.quantity || '3'}` : 'Promoção')} ★
            </div>
          )}

          {/* Product Name */}
          {data.productName && (
            <div style={{
              fontWeight: 900,
              lineHeight: 1.1,
              padding: '0 8px',
              color: template.textColor,
              fontSize: `${style.productFontSize}px`,
              transform: `translateY(${style.productOffsetY}px) ${smsSkew(style.fontFamily) || ''}`,
              textShadow: sProd,
            }}>
              {data.productName}
            </div>
          )}

          {/* Brand */}
          {data.brandName && (
            <div style={{
              fontWeight: 600,
              lineHeight: 1.1,
              padding: '0 8px',
              color: template.textColor,
              fontSize: `${style.brandFontSize}px`,
              transform: `translateY(${style.brandOffsetY}px) ${smsSkew(style.fontFamily) || ''}`,
              opacity: 0.85,
              textShadow: sBrand,
            }}>
              {data.brandName}
            </div>
          )}

          {/* Gramatura with optional lines */}
          {(data.gramatura || style.gramaturaLines) && (
            <div style={{
              fontWeight: 500,
              lineHeight: 1.1,
              padding: '0 8px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              color: template.textColor,
              fontSize: `${style.gramaturaFontSize}px`,
              transform: `translateY(${style.gramaturaOffsetY}px) ${smsSkew(style.fontFamily) || ''}`,
              opacity: 0.7,
              textShadow: sGram,
            }}>
              {style.gramaturaLines && (
                <div style={{
                  width: '33%',
                  height: '0px',
                  borderTop: `2px solid ${template.textColor}`,
                  opacity: 0.5,
                  marginRight: '8px',
                  flexShrink: 0,
                }} />
              )}
              {data.gramatura && (
                <span style={{ whiteSpace: 'nowrap' }}>{data.gramatura}</span>
              )}
              {style.gramaturaLines && (
                <div style={{
                  width: '33%',
                  height: '0px',
                  borderTop: `2px solid ${template.textColor}`,
                  opacity: 0.5,
                  marginLeft: '8px',
                  flexShrink: 0,
                }} />
              )}
            </div>
          )}

          {/* Description */}
          {data.description && (
            <div style={{
              marginBottom: '8px',
              opacity: 0.8,
              color: template.textColor,
              fontSize: `${style.descriptionFontSize}px`,
              fontFamily: descFont,
              textShadow: sDesc,
              transform: `translateY(${style.descriptionOffsetY}px) ${smsSkew(dFont) || ''}`,
            }}>
              {data.description}
            </div>
          )}

          {/* Price section */}
          {hasPrice && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: `translateY(${style.priceOffsetY}px)`,
            }}>
              {data.oldPrice && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '4px',
                }}>
                  <span style={{
                    fontSize: '16px',
                    textDecoration: 'line-through',
                    opacity: 0.6,
                    color: template.textColor,
                  }}>
                    {!style.hideCurrencySymbol && 'R$ '}{data.oldPrice}
                  </span>
                </div>
              )}

              {/* Split price */}
              <div style={{
                display: 'flex',
                color: template.priceColor,
                fontFamily: priceFont,
                textShadow: sPrice,
                transform: smsSkew(pFont),
                alignItems: 'flex-end',
                height: `${style.priceFontSize}px`,
              }}>
                {!style.hideCurrencySymbol && (
                  <span style={{ fontWeight: 900, fontSize: `${style.centsFontSize}px`, lineHeight: 1, alignSelf: 'flex-end' }}>R$</span>
                )}
                <span style={{ fontWeight: 900, fontSize: `${style.priceFontSize}px`, lineHeight: 1, alignSelf: 'flex-end' }}>
                  {reais}
                </span>
                <span style={{ fontWeight: 900, fontSize: `${style.centsFontSize}px`, lineHeight: 1, alignSelf: 'flex-end' }}>
                  ,
                </span>
                <span style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: style.centsAlignTop ? 'flex-start' : 'flex-end',
                  alignSelf: 'stretch',
                  lineHeight: 1,
                }}>
                  <span style={{
                    fontWeight: 900,
                    fontSize: `${style.centsFontSize}px`,
                    lineHeight: 1,
                    borderBottom: style.centsUnderline ? `3px solid ${template.priceColor}` : 'none',
                    paddingBottom: style.centsUnderline ? '1px' : '0',
                  }}>
                    {centavos}
                  </span>
                  {data.unit && style.unitBelowCents && (
                    <span style={{
                      color: template.textColor,
                      opacity: 0.7,
                      fontSize: `${Math.max(Math.min(style.centsFontSize * 0.45, style.priceFontSize * 0.22), 9)}px`,
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                      transform: `translateX(${style.unitOffsetX}px)`,
                    }}>{data.unit}</span>
                  )}
                </span>
              </div>

              {/* Unit - default position */}
              {data.unit && !style.unitBelowCents && (
                <span style={{
                  fontSize: '12px',
                  marginTop: '4px',
                  opacity: 0.7,
                  color: template.textColor,
                  transform: `translateX(${style.unitOffsetX}px)`,
                  display: 'inline-block',
                }}>{data.unit}</span>
              )}
            </div>
          )}

          {/* Discount badge */}
          {data.discount && (
            <div style={{
              display: 'inline-block',
              marginTop: '12px',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: 900,
              background: template.accentColor,
              color: template.bgColor,
            }}>
              {data.discount}% OFF
            </div>
          )}

          {/* Validity */}
          {data.validity && (
            <div style={{
              fontSize: '10px',
              marginTop: '12px',
              opacity: 0.6,
              fontFamily: "'JetBrains Mono', monospace",
              color: template.textColor,
              transform: `translateY(${style.validityOffsetY}px)`,
            }}>
              Válido até {data.validity}
            </div>
          )}

          {/* QR Code */}
          {showQR && qrUrl && (
            <div style={{
              marginTop: '12px',
              padding: '6px',
              background: '#ffffff',
              borderRadius: '4px',
              display: 'inline-block',
            }}>
              <QRCodeSVG value={qrUrl} size={56} />
            </div>
          )}
        </div>
      </div>
    );
  }
);

PosterPreview.displayName = "PosterPreview";
export default PosterPreview;
