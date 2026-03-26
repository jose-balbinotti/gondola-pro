import { useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEMPLATES, DEFAULT_POSTER_DATA, type PosterData } from "@/lib/templates";
import { Tag, Download, ArrowLeft, FileImage, FileText, QrCode, Type, Move, Save, FolderOpen, Upload, Trash2, Image as ImageIcon, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import PosterPreview, { DEFAULT_POSTER_STYLE, FONT_OPTIONS, type PosterStyle } from "@/components/poster/PosterPreview";
import { loadPresets, savePreset, deletePreset, type PosterPreset } from "@/lib/presets";

const PAPER_SIZES = [
  { value: "A4", label: "A4 (210×297mm)" },
  { value: "A5", label: "A5 (148×210mm)" },
  { value: "A3", label: "A3 (297×420mm)" },
  { value: "gondola", label: "Gôndola (faixa)" },
  { value: "10x15", label: "10×15 cm" },
];

const PDF_FORMATS: Record<string, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  A3: [297, 420],
  gondola: [297, 74],
  "10x15": [100, 150],
};

export default function EditorPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const posterRef = useRef<HTMLDivElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [data, setData] = useState<PosterData>({
    ...DEFAULT_POSTER_DATA,
    templateId: template.id,
  });

  const [showQR, setShowQR] = useState(false);
  const [posterStyle, setPosterStyle] = useState<PosterStyle>({ ...DEFAULT_POSTER_STYLE });
  const [paperSize, setPaperSize] = useState(template.size === "gondola" ? "gondola" : "A4");
  const [customBackground, setCustomBackground] = useState<string>("");
  const [bgBaseOnly, setBgBaseOnly] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<PosterPreset[]>(() => loadPresets());

  const update = useCallback((field: keyof PosterData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateStyle = useCallback(<K extends keyof PosterStyle>(field: K, value: PosterStyle[K]) => {
    setPosterStyle((prev) => ({ ...prev, [field]: value }));
  }, []);

  const stripBgForExport = () => {
    if (bgBaseOnly && customBackground && posterRef.current) {
      posterRef.current.style.backgroundImage = 'none';
      posterRef.current.style.backgroundColor = '#ffffff';
    }
  };
  const restoreBgAfterExport = () => {
    if (bgBaseOnly && customBackground && posterRef.current) {
      posterRef.current.style.backgroundImage = `url(${customBackground})`;
      posterRef.current.style.backgroundColor = '';
    }
  };

  const exportPNG = async () => {
    if (!posterRef.current) return;
    try {
      stripBgForExport();
      const canvas = await html2canvas(posterRef.current, { scale: 3, useCORS: true, backgroundColor: bgBaseOnly && customBackground ? '#ffffff' : null });
      restoreBgAfterExport();
      const link = document.createElement("a");
      link.download = `cartaz-${data.productName || "gondolapro"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "PNG exportado!", description: "Seu cartaz foi salvo." });
    } catch {
      restoreBgAfterExport();
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const exportPDF = async () => {
    if (!posterRef.current) return;
    try {
      stripBgForExport();
      const canvas = await html2canvas(posterRef.current, { scale: 3, useCORS: true, backgroundColor: bgBaseOnly && customBackground ? '#ffffff' : null });
      restoreBgAfterExport();
      const imgData = canvas.toDataURL("image/png");
      const fmt = PDF_FORMATS[paperSize] || PDF_FORMATS.A4;
      const isLandscape = fmt[0] > fmt[1];
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: fmt,
      });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`cartaz-${data.productName || "gondolapro"}.pdf`);
      toast({ title: "PDF exportado!", description: `Formato ${paperSize} – 300dpi.` });
    } catch {
      restoreBgAfterExport();
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        setCustomBackground(canvas.toDataURL("image/png"));
        toast({ title: "PDF importado como fundo!" });
      } catch {
        toast({ title: "Erro ao importar PDF", variant: "destructive" });
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCustomBackground(ev.target?.result as string);
        toast({ title: "Imagem de fundo carregada!" });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({ title: "Digite um nome para o preset", variant: "destructive" });
      return;
    }
    const result = savePreset({
      name: presetName.trim(),
      templateId: template.id,
      paperSize,
      style: posterStyle,
      backgroundImage: customBackground || undefined,
    });
    if (result) {
      setPresets(loadPresets());
      setPresetName("");
      toast({ title: `Preset "${result.name}" salvo!` });
    } else {
      toast({ title: "Limite de 20 presets atingido", variant: "destructive" });
    }
  };

  const handleLoadPreset = (preset: PosterPreset) => {
    setPosterStyle(preset.style);
    setPaperSize(preset.paperSize);
    if (preset.backgroundImage) setCustomBackground(preset.backgroundImage);
    toast({ title: `Preset "${preset.name}" carregado!` });
  };

  const handleDeletePreset = (id: string) => {
    deletePreset(id);
    setPresets(loadPresets());
    toast({ title: "Preset removido" });
  };

  const qrUrl = data.whatsappNumber
    ? `https://wa.me/55${data.whatsappNumber.replace(/\D/g, "")}`
    : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="snap-active">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Tag className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-foreground">{template.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPNG} className="snap-active gap-1.5">
              <FileImage className="w-3.5 h-3.5" /> PNG
            </Button>
            <Button size="sm" onClick={exportPDF} className="snap-active gap-1.5">
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (bgBaseOnly && customBackground && posterRef.current) {
                posterRef.current.style.backgroundImage = 'none';
                posterRef.current.style.backgroundColor = '#ffffff';
                setTimeout(() => { window.print(); setTimeout(() => { if (posterRef.current) { posterRef.current.style.backgroundImage = `url(${customBackground})`; posterRef.current.style.backgroundColor = ''; }}, 500); }, 100);
              } else { window.print(); }
            }} className="snap-active gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-4 order-2 lg:order-1">
            {/* Presets */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> Presets Salvos
              </h3>
              {presets.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {presets.map((p) => (
                    <div key={p.id} className="flex items-center gap-1 p-2 rounded-lg border border-border bg-muted/30 text-xs">
                      <button onClick={() => handleLoadPreset(p)} className="flex-1 text-left font-semibold text-foreground truncate hover:text-primary transition-colors">
                        {p.name}
                      </button>
                      <button onClick={() => handleDeletePreset(p.id)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-3">Nenhum preset salvo.</p>
              )}
              <div className="flex gap-2">
                <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Nome do preset..." className="flex-1 h-8 px-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <Button variant="outline" size="sm" onClick={handleSavePreset} className="gap-1">
                  <Save className="w-3 h-3" /> Salvar
                </Button>
              </div>
            </div>

            {/* Background Image */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Fundo Personalizado
              </h3>
              <div className="flex gap-2">
                <input ref={bgFileRef} type="file" accept="image/*,application/pdf" onChange={handleBgUpload} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => bgFileRef.current?.click()} className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Importar Fundo
                </Button>
                {customBackground && (
                  <Button variant="ghost" size="sm" onClick={() => setCustomBackground("")} className="text-destructive">Remover</Button>
                )}
              </div>
              {customBackground && (
                <>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mt-2">
                    <Switch checked={bgBaseOnly} onCheckedChange={setBgBaseOnly} />
                    Usar só como base (não imprime o fundo)
                  </label>
                  <div className="mt-2 w-16 h-22 rounded border border-border overflow-hidden">
                    <img src={customBackground} alt="Fundo" className="w-full h-full object-cover" />
                  </div>
                </>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Informações do Produto</h3>
              <div className="space-y-3">
                <Field label="Nome do Produto" value={data.productName} onChange={(v) => update("productName", v)} placeholder="Ex: Arroz Integral" />
                <Field label="Marca" value={data.brandName} onChange={(v) => update("brandName", v)} placeholder="Ex: Tio João" />
                <Field label="Gramatura / Volume" value={data.gramatura} onChange={(v) => update("gramatura", v)} placeholder="Ex: 1kg, 500ml" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-muted-foreground">Preço Antigo (R$)</label>
                    </div>
                    <input type="text" value={data.oldPrice} onChange={(e) => update("oldPrice", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-muted-foreground">Preço Novo (R$)</label>
                    </div>
                    <input type="text" value={data.newPrice} onChange={(e) => update("newPrice", e.target.value)} placeholder="Ex: 12,99" className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                {/* Price display options */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Switch checked={posterStyle.hideCurrencySymbol} onCheckedChange={(v) => updateStyle("hideCurrencySymbol", v)} />
                    Ocultar R$
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Switch checked={posterStyle.centsAlignTop} onCheckedChange={(v) => updateStyle("centsAlignTop", v)} />
                    Centavos no topo
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Switch checked={posterStyle.centsUnderline} onCheckedChange={(v) => updateStyle("centsUnderline", v)} />
                    Traço nos centavos
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Switch checked={posterStyle.gramaturaLines} onCheckedChange={(v) => updateStyle("gramaturaLines", v)} />
                    Traços na gramatura
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Desconto (%)" value={data.discount} onChange={(v) => update("discount", v)} />
                  <Field label="Validade" value={data.validity} onChange={(v) => update("validity", v)} />
                </div>
                <Field label="Descrição" value={data.description} onChange={(v) => update("description", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantidade" value={data.quantity} onChange={(v) => update("quantity", v)} placeholder="Ex: 3" />
                  <div>
                    <Field label="Unidade" value={data.unit} onChange={(v) => update("unit", v)} placeholder="un, kg, L" />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mt-1.5">
                      <Switch checked={posterStyle.unitBelowCents} onCheckedChange={(v) => updateStyle("unitBelowCents", v)} />
                      Abaixo dos centavos
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Fontes */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Fontes</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fonte geral</label>
                  <Select value={posterStyle.fontFamily} onValueChange={(v) => updateStyle("fontFamily", v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Fonte geral" /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fonte do preço</label>
                  <Select value={posterStyle.priceFontFamily || "__default__"} onValueChange={(v) => updateStyle("priceFontFamily", v === "__default__" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Mesma da geral" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Mesma da geral</SelectItem>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fonte da descrição</label>
                  <Select value={posterStyle.descriptionFontFamily || "__default__"} onValueChange={(v) => updateStyle("descriptionFontFamily", v === "__default__" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Mesma da geral" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Mesma da geral</SelectItem>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">Sombreamento Individual</label>
                  {([["shadowProduct", "Produto"], ["shadowBrand", "Marca"], ["shadowGramatura", "Gramatura"], ["shadowPrice", "Preço"], ["shadowDescription", "Descrição"]] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <Switch checked={posterStyle[key] as boolean} onCheckedChange={(v) => updateStyle(key, v)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aparência / Tipografia */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Type className="w-4 h-4" /> Tamanho dos Textos
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Mostrar texto de promoção</label>
                  <Switch checked={posterStyle.showPromoLabel} onCheckedChange={(v) => updateStyle("showPromoLabel", v)} />
                </div>
                {posterStyle.showPromoLabel && (
                  <Field
                    label="Texto da promoção (opcional)"
                    value={posterStyle.promoText}
                    onChange={(v) => updateStyle("promoText", v)}
                    placeholder="Ex: Super Oferta, Só Hoje..."
                  />
                )}
                <SliderField label={`Nome do produto – ${posterStyle.productFontSize}px`} value={posterStyle.productFontSize} min={10} max={120} onChange={(v) => updateStyle("productFontSize", v)} />
                <SliderField label={`Marca – ${posterStyle.brandFontSize}px`} value={posterStyle.brandFontSize} min={8} max={120} onChange={(v) => updateStyle("brandFontSize", v)} />
                <SliderField label={`Gramatura – ${posterStyle.gramaturaFontSize}px`} value={posterStyle.gramaturaFontSize} min={8} max={72} onChange={(v) => updateStyle("gramaturaFontSize", v)} />
                <SliderField label={`Preço (reais) – ${posterStyle.priceFontSize}px`} value={posterStyle.priceFontSize} min={24} max={200} onChange={(v) => updateStyle("priceFontSize", v)} />
                <SliderField label={`Preço (centavos/R$) – ${posterStyle.centsFontSize}px`} value={posterStyle.centsFontSize} min={12} max={120} onChange={(v) => updateStyle("centsFontSize", v)} />
                <SliderField label={`Descrição – ${posterStyle.descriptionFontSize}px`} value={posterStyle.descriptionFontSize} min={8} max={64} onChange={(v) => updateStyle("descriptionFontSize", v)} />
              </div>
            </div>

            {/* Posição */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Move className="w-4 h-4" /> Posição dos Elementos
              </h3>
              <div className="space-y-4">
                <SliderField label={`Nome Y – ${posterStyle.productOffsetY}px`} value={posterStyle.productOffsetY} min={-80} max={80} onChange={(v) => updateStyle("productOffsetY", v)} />
                <SliderField label={`Marca Y – ${posterStyle.brandOffsetY}px`} value={posterStyle.brandOffsetY} min={-80} max={80} onChange={(v) => updateStyle("brandOffsetY", v)} />
                <SliderField label={`Gramatura Y – ${posterStyle.gramaturaOffsetY}px`} value={posterStyle.gramaturaOffsetY} min={-80} max={80} onChange={(v) => updateStyle("gramaturaOffsetY", v)} />
                <SliderField label={`Preço Y – ${posterStyle.priceOffsetY}px`} value={posterStyle.priceOffsetY} min={-80} max={80} onChange={(v) => updateStyle("priceOffsetY", v)} />
                <SliderField label={`Descrição Y – ${posterStyle.descriptionOffsetY}px`} value={posterStyle.descriptionOffsetY} min={-80} max={80} onChange={(v) => updateStyle("descriptionOffsetY", v)} />
                <SliderField label={`Validade Y – ${posterStyle.validityOffsetY}px`} value={posterStyle.validityOffsetY} min={-80} max={80} onChange={(v) => updateStyle("validityOffsetY", v)} />
                <SliderField label={`Unidade X – ${posterStyle.unitOffsetX}px`} value={posterStyle.unitOffsetX} min={-120} max={120} onChange={(v) => updateStyle("unitOffsetX", v)} />
              </div>
            </div>

            {/* Tamanho de Folha */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Tamanho da Folha</h3>
              <div className="flex flex-wrap gap-2">
                {PAPER_SIZES.map((ps) => (
                  <button
                    key={ps.value}
                    onClick={() => setPaperSize(ps.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold snap-active transition-colors ${
                      paperSize === ps.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {ps.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Extras */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Extras</h3>
              <div className="space-y-3">
                <Field label="WhatsApp (DDD + Número)" value={data.whatsappNumber || ""} onChange={(v) => update("whatsappNumber", v)} placeholder="11999998888" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold snap-active transition-colors ${showQR ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    <QrCode className="w-3.5 h-3.5" /> QR Code
                  </button>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Exportar</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportPNG} className="flex-1 snap-active gap-1.5">
                  <FileImage className="w-4 h-4" /> PNG
                </Button>
              <Button onClick={exportPDF} className="flex-1 snap-active gap-1.5">
                  <Download className="w-4 h-4" /> PDF {paperSize}
                </Button>
                <Button variant="secondary" onClick={() => window.print()} className="flex-1 snap-active gap-1.5">
                  <Printer className="w-4 h-4" /> Imprimir
                </Button>
              </div>
            </div>
          </div>

          {/* Poster Preview */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-20 self-start">
            <p className="text-xs text-muted-foreground mb-2 font-mono">PREVIEW – {paperSize}</p>
            <div className="poster-shadow rounded-lg overflow-hidden inline-block w-full max-w-md mx-auto">
              <PosterPreview
                ref={posterRef}
                template={template}
                data={data}
                showQR={showQR}
                qrUrl={qrUrl}
                style={posterStyle}
                paperSize={paperSize}
                customBackground={customBackground || undefined}
              />
            </div>
          </div>
        </div>
      </div>
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

function SliderField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-2 block">{label}</label>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
