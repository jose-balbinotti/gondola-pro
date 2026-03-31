import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FONT_OPTIONS, type PosterStyle } from "./PosterPreview";
import { Type, Move } from "lucide-react";

interface Props {
  style: PosterStyle;
  updateStyle: <K extends keyof PosterStyle>(field: K, value: PosterStyle[K]) => void;
  compact?: boolean;
  extraFonts?: { value: string; label: string }[];
}

function SliderField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-2 block">{label}</label>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

export default function PosterStyleControls({ style, updateStyle, compact, extraFonts = [] }: Props) {
  const allFonts = [...FONT_OPTIONS, ...extraFonts];
  return (
    <div className="space-y-4">
      {/* Promo Label */}
      <div className="p-4 rounded-lg border border-border bg-background">
        <h3 className="text-sm font-bold text-foreground mb-3">Promoção</h3>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-muted-foreground">Mostrar texto de promoção</label>
          <Switch checked={style.showPromoLabel} onCheckedChange={(v) => updateStyle("showPromoLabel", v)} />
        </div>
        {style.showPromoLabel && (
          <Field
            label="Texto da promoção"
            value={style.promoText}
            onChange={(v) => updateStyle("promoText", v)}
            placeholder="Ex: Super Oferta, Só Hoje..."
          />
        )}
      </div>

      {/* Price display options */}
      <div className="p-4 rounded-lg border border-border bg-background">
        <h3 className="text-sm font-bold text-foreground mb-3">Opções de Preço</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={style.hideCurrencySymbol} onCheckedChange={(v) => updateStyle("hideCurrencySymbol", v)} />
            Ocultar R$
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={style.centsAlignTop} onCheckedChange={(v) => updateStyle("centsAlignTop", v)} />
            Centavos no topo
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={style.centsUnderline} onCheckedChange={(v) => updateStyle("centsUnderline", v)} />
            Traço nos centavos
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={style.gramaturaLines} onCheckedChange={(v) => updateStyle("gramaturaLines", v)} />
            Traços na gramatura
          </label>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Centavos eixo Y ({style.centsOffsetY})</label>
          <Slider min={-100} max={100} step={1} value={[style.centsOffsetY]} onValueChange={([v]) => updateStyle("centsOffsetY", v)} />
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={style.unitBelowCents} onCheckedChange={(v) => updateStyle("unitBelowCents", v)} />
            Unidade abaixo dos centavos
          </label>
          {style.unitBelowCents && (
            <div className="mt-2">
              <label className="text-xs text-muted-foreground">Unidade eixo Y ({style.unitOffsetY})</label>
              <Slider min={-100} max={100} step={1} value={[style.unitOffsetY]} onValueChange={([v]) => updateStyle("unitOffsetY", v)} />
            </div>
          )}
        </div>
      </div>

      {/* Fonts */}
      <div className="p-4 rounded-lg border border-border bg-background">
        <h3 className="text-sm font-bold text-foreground mb-3">Fontes</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fonte geral</label>
            <Select value={style.fontFamily} onValueChange={(v) => updateStyle("fontFamily", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{allFonts.map((f) => (<SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fonte do preço</label>
            <Select value={style.priceFontFamily || "__default__"} onValueChange={(v) => updateStyle("priceFontFamily", v === "__default__" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Mesma da geral</SelectItem>
                {allFonts.map((f) => (<SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fonte da descrição</label>
            <Select value={style.descriptionFontFamily || "__default__"} onValueChange={(v) => updateStyle("descriptionFontFamily", v === "__default__" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Mesma da geral</SelectItem>
                {allFonts.map((f) => (<SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Sombreamento Individual</label>
            {([["shadowProduct", "Produto"], ["shadowBrand", "Marca"], ["shadowGramatura", "Gramatura"], ["shadowPrice", "Preço"], ["shadowDescription", "Descrição"]] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Switch checked={style[key] as boolean} onCheckedChange={(v) => updateStyle(key, v)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Text Sizes */}
      <div className="p-4 rounded-lg border border-border bg-background">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Type className="w-4 h-4" /> Tamanho dos Textos
        </h3>
        <div className="space-y-4">
          <SliderField label={`Nome do produto – ${style.productFontSize}px`} value={style.productFontSize} min={10} max={600} onChange={(v) => updateStyle("productFontSize", v)} />
          <SliderField label={`Marca – ${style.brandFontSize}px`} value={style.brandFontSize} min={8} max={600} onChange={(v) => updateStyle("brandFontSize", v)} />
          <SliderField label={`Gramatura – ${style.gramaturaFontSize}px`} value={style.gramaturaFontSize} min={8} max={600} onChange={(v) => updateStyle("gramaturaFontSize", v)} />
          <SliderField label={`Preço (reais) – ${style.priceFontSize}px`} value={style.priceFontSize} min={24} max={600} onChange={(v) => updateStyle("priceFontSize", v)} />
          <SliderField label={`Centavos/R$ – ${style.centsFontSize}px`} value={style.centsFontSize} min={12} max={600} onChange={(v) => updateStyle("centsFontSize", v)} />
          <SliderField label={`Descrição – ${style.descriptionFontSize}px`} value={style.descriptionFontSize} min={8} max={600} onChange={(v) => updateStyle("descriptionFontSize", v)} />
          <SliderField label={`Quantidade – ${style.quantityFontSize}px`} value={style.quantityFontSize} min={12} max={600} onChange={(v) => updateStyle("quantityFontSize", v)} />
        </div>
      </div>

      {/* Position Offsets */}
      <div className="p-4 rounded-lg border border-border bg-background">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Move className="w-4 h-4" /> Posição dos Elementos
        </h3>
        <div className="space-y-4">
          <SliderField label={`Nome Y – ${style.productOffsetY}px`} value={style.productOffsetY} min={-600} max={600} onChange={(v) => updateStyle("productOffsetY", v)} />
          <SliderField label={`Marca Y – ${style.brandOffsetY}px`} value={style.brandOffsetY} min={-600} max={600} onChange={(v) => updateStyle("brandOffsetY", v)} />
          <SliderField label={`Gramatura Y – ${style.gramaturaOffsetY}px`} value={style.gramaturaOffsetY} min={-600} max={600} onChange={(v) => updateStyle("gramaturaOffsetY", v)} />
          <SliderField label={`Preço Y – ${style.priceOffsetY}px`} value={style.priceOffsetY} min={-600} max={600} onChange={(v) => updateStyle("priceOffsetY", v)} />
          <SliderField label={`Descrição Y – ${style.descriptionOffsetY}px`} value={style.descriptionOffsetY} min={-600} max={600} onChange={(v) => updateStyle("descriptionOffsetY", v)} />
          <SliderField label={`Validade Y – ${style.validityOffsetY}px`} value={style.validityOffsetY} min={-600} max={600} onChange={(v) => updateStyle("validityOffsetY", v)} />
          <SliderField label={`Unidade X – ${style.unitOffsetX}px`} value={style.unitOffsetX} min={-600} max={600} onChange={(v) => updateStyle("unitOffsetX", v)} />
        </div>
      </div>

      {/* Atacado/Varejo Position Offsets */}
      <div className="p-4 rounded-lg border border-border bg-background">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Move className="w-4 h-4" /> Posição Atacado/Varejo
        </h3>
        <div className="space-y-4">
          <SliderField label={`Quantidade X – ${style.quantityOffsetX}px`} value={style.quantityOffsetX} min={-600} max={600} onChange={(v) => updateStyle("quantityOffsetX", v)} />
          <SliderField label={`Quantidade Y – ${style.quantityOffsetY}px`} value={style.quantityOffsetY} min={-600} max={600} onChange={(v) => updateStyle("quantityOffsetY", v)} />
          <SliderField label={`Atacado X – ${style.atacadoOffsetX}px`} value={style.atacadoOffsetX} min={-600} max={600} onChange={(v) => updateStyle("atacadoOffsetX", v)} />
          <SliderField label={`Atacado Y – ${style.atacadoOffsetY}px`} value={style.atacadoOffsetY} min={-600} max={600} onChange={(v) => updateStyle("atacadoOffsetY", v)} />
          <SliderField label={`Varejo X – ${style.varejoOffsetX}px`} value={style.varejoOffsetX} min={-600} max={600} onChange={(v) => updateStyle("varejoOffsetX", v)} />
          <SliderField label={`Varejo Y – ${style.varejoOffsetY}px`} value={style.varejoOffsetY} min={-600} max={600} onChange={(v) => updateStyle("varejoOffsetY", v)} />
        </div>
      </div>
    </div>
  );
}
