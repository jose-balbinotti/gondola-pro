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
  { value: "'Target2000', sans-serif", label: "Target 2000" },
];

// All numeric values are in MILLIMETERS (mm)
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
  centsUnderlineOffsetY: number;
  gramaturaLinesOffsetY: number;
  unitOffsetY: number;
  centsOffsetY: number;
  quantityFontSize: number;
  quantityOffsetX: number;
  quantityOffsetY: number;
  atacadoOffsetX: number;
  atacadoOffsetY: number;
  varejoOffsetX: number;
  varejoOffsetY: number;
}

// All values in mm
export const DEFAULT_POSTER_STYLE: PosterStyle = {
  showPromoLabel: false,
  promoText: "",
  productFontSize: 7,
  brandFontSize: 5,
  gramaturaFontSize: 4,
  priceFontSize: 15,
  centsFontSize: 7,
  descriptionFontSize: 3,
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
  centsUnderlineOffsetY: 0,
  gramaturaLinesOffsetY: 0,
  unitOffsetY: 0,
  centsOffsetY: 0,
  quantityFontSize: 15,
  quantityOffsetX: 0,
  quantityOffsetY: 0,
  atacadoOffsetX: 0,
  atacadoOffsetY: 0,
  varejoOffsetX: 0,
  varejoOffsetY: 0,
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

// Paper dimensions in mm [width, height]
export const PAPER_DIMS_MM: Record<string, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  A3: [297, 420],
  gondola: [297, 74],
  "10x15": [100, 150],
  "A4-duplo": [148, 210],
  "A4-duplo-v": [210, 148.5],
  "atacado-varejo": [210, 297],
  custom: [210, 280],
};

// CSS reference: 1mm = 96/25.4 px
export const MM_TO_PX = 96 / 25.4;

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

// Helper: mm value to CSS mm string
const mm = (v: number) => `${v}mm`;

const PosterPreview = forwardRef<HTMLDivElement, Props>(
  ({ template, data, showQR, qrUrl, style, paperSize, customBackground }, ref) => {
    const dims = PAPER_DIMS_MM[paperSize] || PAPER_DIMS_MM[template.size] || PAPER_DIMS_MM.A4;
    const [widthMM, heightMM] = dims;
    const ratio = widthMM / heightMM;

    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

    useEffect(() => {
      const el = outerRef.current;
      if (!el) return;
      const innerWidthPx = widthMM * MM_TO_PX;
      const observer = new ResizeObserver((entries) => {
        const w = entries[0].contentRect.width;
        setScale(w / innerWidthPx);
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [widthMM]);

    const { reais, centavos } = splitPrice(data.newPrice);
    const hasPrice = !!(reais || centavos);
    const isAtacadoVarejo = paperSize === "atacado-varejo";
    const { reais: atacadoReais, centavos: atacadoCentavos } = splitPrice(data.oldPrice);
    const hasAtacadoPrice = !!(atacadoReais || atacadoCentavos);

    const SHADOW = "0.8mm 0.8mm 1.6mm rgba(0,0,0,0.7), 0.3mm 0.3mm 0.5mm rgba(0,0,0,0.9)";
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

    // Render a price block (reused for standard, atacado, and varejo)
    const renderPriceBlock = (r: string, c: string, extraTransform?: string) => (
      <div style={{
        display: 'flex',
        color: template.priceColor,
        fontFamily: priceFont,
        textShadow: sPrice,
        transform: extraTransform || smsSkew(pFont),
        alignItems: 'flex-end',
        minHeight: mm(style.priceFontSize),
        overflow: 'visible',
      }}>
        {!style.hideCurrencySymbol && (
          <span style={{ fontWeight: 900, fontSize: mm(style.centsFontSize), lineHeight: 1, alignSelf: 'flex-end' }}>R$</span>
        )}
        <span style={{ fontWeight: 900, fontSize: mm(style.priceFontSize), lineHeight: 1, alignSelf: 'flex-end' }}>{r}</span>
        <span style={{ fontWeight: 900, fontSize: mm(style.centsFontSize), lineHeight: 1, alignSelf: 'flex-end' }}>,</span>
        <span style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: style.centsAlignTop ? 'flex-start' : 'flex-end',
          alignSelf: style.centsAlignTop ? 'flex-start' : 'stretch',
          lineHeight: 1,
          transform: `translateY(${mm(style.centsOffsetY)})`,
        }}>
          <span style={{
            fontWeight: 900,
            fontSize: mm(style.centsFontSize),
            lineHeight: 1,
            borderBottom: style.centsUnderline ? `0.8mm solid ${template.priceColor}` : 'none',
            paddingBottom: style.centsUnderline ? '0.3mm' : '0',
          }}>{c}</span>
          {data.unit && style.unitBelowCents && (
            <span style={{
              color: template.textColor,
              opacity: 0.7,
              fontSize: mm(Math.round(style.centsFontSize * 0.5 * 10) / 10),
              lineHeight: 1,
              whiteSpace: 'nowrap',
              marginTop: mm(Math.round(style.centsFontSize * 0.08 * 10) / 10),
              transform: `translateX(${mm(style.unitOffsetX)}) translateY(${mm(style.unitOffsetY)})`,
            }}>{data.unit}</span>
          )}
        </span>
      </div>
    );

    const renderUnitDefault = () => (
      data.unit && !style.unitBelowCents ? (
        <span style={{
          fontSize: mm(3),
          marginTop: mm(1),
          opacity: 0.7,
          color: template.textColor,
          transform: `translateX(${mm(style.unitOffsetX)})`,
          display: 'inline-block',
        }}>{data.unit}</span>
      ) : null
    );

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
          data-width-mm={widthMM}
          data-height-mm={heightMM}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: mm(widthMM),
            height: mm(heightMM),
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: mm(6),
            background: hasBgImage ? `url(${bgImage}) center/cover no-repeat` : template.bgColor,
            fontFamily: mainFont,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Diagonal accent */}
          {template.layout === "diagonal" && !isAtacadoVarejo && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderLeft: "32mm solid transparent",
              borderTop: `32mm solid ${template.accentColor}`,
            }} />
          )}

          {isAtacadoVarejo ? (
            <>
              {/* TERÇO SUPERIOR — Produto, Marca, Gramatura */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '33.33%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `${mm(4)} ${mm(6)}`,
                boxSizing: 'border-box',
              }}>
                {style.showPromoLabel && (
                  <div style={{ fontSize: mm(3), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: mm(1), color: template.accentColor }}>
                    ★ {style.promoText || 'Promoção'} ★
                  </div>
                )}
                {data.productName && (
                  <div style={{ fontWeight: 900, lineHeight: 1.1, padding: `0 ${mm(2)}`, color: template.textColor, fontSize: mm(style.productFontSize), transform: `translateY(${mm(style.productOffsetY)}) ${smsSkew(style.fontFamily) || ''}`, textShadow: sProd }}>{data.productName}</div>
                )}
                {data.brandName && (
                  <div style={{ fontWeight: 600, lineHeight: 1.1, padding: `0 ${mm(2)}`, color: template.textColor, fontSize: mm(style.brandFontSize), transform: `translateY(${mm(style.brandOffsetY)}) ${smsSkew(style.fontFamily) || ''}`, opacity: 0.85, textShadow: sBrand }}>{data.brandName}</div>
                )}
                {data.gramatura && (
                  <div style={{ fontWeight: 500, lineHeight: 1.1, padding: `0 ${mm(2)}`, color: template.textColor, fontSize: mm(style.gramaturaFontSize), transform: `translateY(${mm(style.gramaturaOffsetY)}) ${smsSkew(style.fontFamily) || ''}`, opacity: 0.7, textShadow: sGram }}>{data.gramatura}</div>
                )}
                {data.description && (
                  <div style={{ marginTop: mm(1), opacity: 0.8, color: template.textColor, fontSize: mm(style.descriptionFontSize), fontFamily: descFont, textShadow: sDesc, transform: `translateY(${mm(style.descriptionOffsetY)}) ${smsSkew(dFont) || ''}` }}>{data.description}</div>
                )}
              </div>

              {/* TERÇO MÉDIO — Quantidade (esquerda) + Preço Atacado (direita) */}
              <div style={{
                position: 'absolute',
                top: '33.33%',
                left: 0,
                width: '100%',
                height: '33.33%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${mm(4)} ${mm(8)}`,
                boxSizing: 'border-box',
              }}>
                {data.quantity && (
                  <div style={{
                    flex: '0 0 40%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: template.priceColor,
                    fontFamily: mainFont,
                    transform: `translate(${mm(style.quantityOffsetX)}, ${mm(style.quantityOffsetY)})`,
                  }}>
                    <span style={{ fontSize: mm(style.quantityFontSize), fontWeight: 900, lineHeight: 1 }}>{data.quantity}</span>
                  </div>
                )}
                {hasAtacadoPrice && (
                  <div style={{
                    flex: '0 0 55%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transform: `translate(${mm(style.atacadoOffsetX)}, ${mm(style.atacadoOffsetY)})`,
                  }}>
                    {renderPriceBlock(atacadoReais, atacadoCentavos)}
                    {renderUnitDefault()}
                  </div>
                )}
              </div>

              {/* TERÇO INFERIOR — Preço Varejo (direita) + Validade */}
              <div style={{
                position: 'absolute',
                top: '66.66%',
                left: 0,
                width: '100%',
                height: '33.33%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
                padding: `${mm(4)} ${mm(8)}`,
                boxSizing: 'border-box',
              }}>
                {hasPrice && (
                  <div style={{ width: '55%', display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translate(${mm(style.varejoOffsetX)}, ${mm(style.varejoOffsetY)})` }}>
                    {renderPriceBlock(reais, centavos)}
                    {renderUnitDefault()}
                  </div>
                )}
                {data.validity && (
                  <div style={{ fontSize: mm(2.5), marginTop: mm(2), opacity: 0.6, fontFamily: "'JetBrains Mono', monospace", color: template.textColor, transform: `translateY(${mm(style.validityOffsetY)})`, width: '100%', textAlign: 'center' }}>
                    Válido até {data.validity}
                  </div>
                )}
                {showQR && qrUrl && (
                  <div style={{ marginTop: mm(2), padding: mm(1.5), background: '#ffffff', borderRadius: mm(1), display: 'inline-block', alignSelf: 'center' }}>
                    <QRCodeSVG value={qrUrl} size={56} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Header tag */}
              {style.showPromoLabel && (
                <div style={{
                  fontSize: mm(3),
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  marginBottom: mm(2),
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
                  padding: `0 ${mm(2)}`,
                  color: template.textColor,
                  fontSize: mm(style.productFontSize),
                  transform: `translateY(${mm(style.productOffsetY)}) ${smsSkew(style.fontFamily) || ''}`,
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
                  padding: `0 ${mm(2)}`,
                  color: template.textColor,
                  fontSize: mm(style.brandFontSize),
                  transform: `translateY(${mm(style.brandOffsetY)}) ${smsSkew(style.fontFamily) || ''}`,
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
                  padding: `0 ${mm(2)}`,
                  marginBottom: mm(2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  color: template.textColor,
                  fontSize: mm(style.gramaturaFontSize),
                  transform: `translateY(${mm(style.gramaturaOffsetY)}) ${smsSkew(style.fontFamily) || ''}`,
                  opacity: 0.7,
                  textShadow: sGram,
                }}>
                  {style.gramaturaLines && (
                    <div style={{
                      width: '33%',
                      height: '0px',
                      borderTop: `0.5mm solid ${template.textColor}`,
                      opacity: 0.5,
                      marginRight: mm(2),
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
                      borderTop: `0.5mm solid ${template.textColor}`,
                      opacity: 0.5,
                      marginLeft: mm(2),
                      flexShrink: 0,
                    }} />
                  )}
                </div>
              )}

              {/* Description */}
              {data.description && (
                <div style={{
                  marginBottom: mm(2),
                  opacity: 0.8,
                  color: template.textColor,
                  fontSize: mm(style.descriptionFontSize),
                  fontFamily: descFont,
                  textShadow: sDesc,
                  transform: `translateY(${mm(style.descriptionOffsetY)}) ${smsSkew(dFont) || ''}`,
                }}>
                  {data.description}
                </div>
              )}

              {/* Standard price section */}
              {hasPrice && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: `translateY(${mm(style.priceOffsetY)})`,
                }}>
                  {data.oldPrice && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: mm(3),
                      marginBottom: mm(1),
                    }}>
                      <span style={{
                        fontSize: mm(4),
                        textDecoration: 'line-through',
                        opacity: 0.6,
                        color: template.textColor,
                      }}>
                        {!style.hideCurrencySymbol && 'R$ '}{data.oldPrice}
                      </span>
                    </div>
                  )}

                  {renderPriceBlock(reais, centavos, smsSkew(pFont))}
                  {renderUnitDefault()}
                </div>
              )}

              {/* Discount badge */}
              {data.discount && (
                <div style={{
                  display: 'inline-block',
                  marginTop: mm(3),
                  padding: `${mm(1.5)} ${mm(4)}`,
                  borderRadius: '9999px',
                  fontSize: mm(3.5),
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
                  fontSize: mm(2.5),
                  marginTop: mm(3),
                  opacity: 0.6,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: template.textColor,
                  transform: `translateY(${mm(style.validityOffsetY)})`,
                }}>
                  Válido até {data.validity}
                </div>
              )}

              {/* QR Code */}
              {showQR && qrUrl && (
                <div style={{
                  marginTop: mm(3),
                  padding: mm(1.5),
                  background: '#ffffff',
                  borderRadius: mm(1),
                  display: 'inline-block',
                }}>
                  <QRCodeSVG value={qrUrl} size={56} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

PosterPreview.displayName = "PosterPreview";
export default PosterPreview;
