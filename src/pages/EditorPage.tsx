import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TEMPLATES, DEFAULT_POSTER_DATA, type PosterData } from "@/lib/templates";
import { Tag, Download, ArrowLeft, FileImage, FileText, QrCode, Type, Move, Save, FolderOpen, Upload, Trash2, Image as ImageIcon, Printer, BookOpen, Edit, FileDown, FileUp } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import PosterPreview, { DEFAULT_POSTER_STYLE, FONT_OPTIONS, MM_TO_PX, type PosterStyle } from "@/components/poster/PosterPreview";
import { loadPresets, savePresetToDB, deletePresetFromDB, loadPresetsFromDB, exportPresetsToJSON, importPresetsFromJSON, type PosterPreset } from "@/lib/presets";

const PAPER_SIZES = [
  { value: "A4", label: "A4 (210×297mm)" },
  { value: "A5", label: "A5 (148×210mm)" },
  { value: "A3", label: "A3 (297×420mm)" },
  { value: "A4-duplo", label: "A4 Duplo Rotacionado (2×A5)" },
  { value: "A4-duplo-v", label: "A4 Duplo Vertical (2×metade)" },
  { value: "gondola", label: "Gôndola (faixa)" },
  { value: "10x15", label: "10×15 cm" },
  { value: "atacado-varejo", label: "Atacado/Varejo (A4 – 210×297mm)" },
];

const PDF_FORMATS: Record<string, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  A3: [297, 420],
  "A4-duplo": [210, 297],
  "A4-duplo-v": [210, 297],
  gondola: [297, 74],
  "10x15": [100, 150],
  "atacado-varejo": [210, 297],
};

export default function EditorPage() {
  const openPdfPrint = useCallback((pdf: jsPDF, fallbackFilename: string) => {
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = pdfUrl;

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
          iframe.remove();
        }, 30000);
      } catch {
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = fallbackFilename;
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
          iframe.remove();
        }, 1000);
      }
    };

    document.body.appendChild(iframe);
  }, []);
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

  // Load presets from DB on mount
  useEffect(() => {
    loadPresetsFromDB().then(setPresets);
  }, []);

  const update = useCallback((field: keyof PosterData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateStyle = useCallback(<K extends keyof PosterStyle>(field: K, value: PosterStyle[K]) => {
    setPosterStyle((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Background stripping is now handled inside capturePosterCanvas via clone

  const capturePosterCanvas = async () => {
    if (!posterRef.current) return null;

    const el = posterRef.current;
    const clone = el.cloneNode(true) as HTMLElement;

    // Remove the scale transform — render at native mm size
    clone.style.transform = 'none';
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '0';
    // Keep mm-based width/height from the original

    if (bgBaseOnly && customBackground) {
      clone.style.backgroundImage = 'none';
      clone.style.backgroundColor = '#ffffff';
    }

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '-20000px';
    wrapper.style.left = '-20000px';
    wrapper.style.overflow = 'visible';
    wrapper.style.zIndex = '-9999';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    await new Promise(r => setTimeout(r, 100));

    // Get actual rendered pixel dimensions of the mm-based element
    const rect = clone.getBoundingClientRect();

    try {
      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        backgroundColor: bgBaseOnly && customBackground ? '#ffffff' : null,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
      return canvas;
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const exportPNG = async () => {
    try {
      const canvas = await capturePosterCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `cartaz-${data.productName || "gondolapro"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "PNG exportado!", description: "Seu cartaz foi salvo em alta resolução." });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  // Rotate a canvas 90° clockwise and return a new canvas
  const rotateCanvas90 = (src: HTMLCanvasElement): HTMLCanvasElement => {
    const rotated = document.createElement("canvas");
    rotated.width = src.height;
    rotated.height = src.width;
    const ctx = rotated.getContext("2d")!;
    ctx.translate(rotated.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(src, 0, 0);
    return rotated;
  };

  const exportPDF = async () => {
    try {
      const canvas = await capturePosterCanvas();
      if (!canvas) return;

      if (paperSize === "A4-duplo") {
        const rotated = rotateCanvas90(canvas);
        const imgData = rotated.toDataURL("image/png", 1.0);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 297] });
        const halfH = 297 / 2;
        pdf.addImage(imgData, "PNG", 0, 0, 210, halfH);
        pdf.addImage(imgData, "PNG", 0, halfH, 210, halfH);
        rotated.width = 0; rotated.height = 0;
        pdf.save(`cartaz-${data.productName || "gondolapro"}.pdf`);
        toast({ title: "PDF exportado!", description: "A4 Duplo Rotacionado – 2 cartazes por folha." });
      } else if (paperSize === "A4-duplo-v") {
        const imgData = canvas.toDataURL("image/png", 1.0);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 297] });
        const halfH = 297 / 2;
        pdf.addImage(imgData, "PNG", 0, 0, 210, halfH);
        pdf.addImage(imgData, "PNG", 0, halfH, 210, halfH);
        pdf.save(`cartaz-${data.productName || "gondolapro"}.pdf`);
        toast({ title: "PDF exportado!", description: "A4 Duplo Vertical – 2 cartazes por folha." });
      } else {
        const imgData = canvas.toDataURL("image/png", 1.0);
        const fmt = PDF_FORMATS[paperSize] || PDF_FORMATS.A4;
        const isLandscape = fmt[0] > fmt[1];
        const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: fmt });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
        pdf.save(`cartaz-${data.productName || "gondolapro"}.pdf`);
        toast({ title: "PDF exportado!", description: `Formato ${paperSize} – alta resolução.` });
      }
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const handleDirectPrint = async () => {
    try {
      const canvas = await capturePosterCanvas();
      if (!canvas) {
        toast({ title: "Erro ao preparar impressão", variant: "destructive" });
        return;
      }

      const fmt = PDF_FORMATS[paperSize] || PDF_FORMATS.A4;
      const isLandscape = fmt[0] > fmt[1];

      if (paperSize === "A4-duplo" || paperSize === "A4-duplo-v") {
        let imgCanvas = canvas;
        if (paperSize === "A4-duplo") {
          imgCanvas = rotateCanvas90(canvas);
        }
        const imgData = imgCanvas.toDataURL("image/jpeg", 0.92);
        if (paperSize === "A4-duplo") { imgCanvas.width = 0; imgCanvas.height = 0; }

        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 297] });
        const halfH = 297 / 2;
        pdf.addImage(imgData, "JPEG", 0, 0, 210, halfH);
        pdf.addImage(imgData, "JPEG", 0, halfH, 210, halfH);
        openPdfPrint(pdf, `cartaz-duplo-${data.productName || "gondolapro"}.pdf`);
        toast({ title: "Impressão pronta!" });
        return;
      }

      // Gera PDF sem bordas/margens — imagem preenche 100% da página
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: fmt });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
      openPdfPrint(pdf, `cartaz-${data.productName || "gondolapro"}.pdf`);
      toast({ title: "Impressão pronta!" });
    } catch {
      toast({ title: "Erro ao imprimir", variant: "destructive" });
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

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast({ title: "Digite um nome para o preset", variant: "destructive" });
      return;
    }
    const result = await savePresetToDB({
      name: presetName.trim(),
      templateId: template.id,
      paperSize,
      style: posterStyle,
      backgroundImage: customBackground || undefined,
      posterData: { ...data },
    });
    if (result) {
      const updated = await loadPresetsFromDB();
      setPresets(updated);
      setPresetName("");
      toast({ title: `Preset "${result.name}" salvo!` });
    } else {
      toast({ title: "Limite de presets atingido", variant: "destructive" });
    }
  };

  const handleLoadPreset = (preset: PosterPreset) => {
    setPosterStyle(preset.style);
    setPaperSize(preset.paperSize);
    if (preset.backgroundImage) setCustomBackground(preset.backgroundImage);
    if (preset.posterData) setData(preset.posterData);
    toast({ title: `Preset "${preset.name}" carregado!` });
  };

  const handleDeletePreset = async (id: string) => {
    await deletePresetFromDB(id);
    const updated = await loadPresetsFromDB();
    setPresets(updated);
    toast({ title: "Preset removido" });
  };

  const handleExportPresets = () => {
    if (presets.length === 0) {
      toast({ title: "Nenhum preset para exportar", variant: "destructive" });
      return;
    }
    exportPresetsToJSON(presets);
    toast({ title: `${presets.length} presets exportados!` });
  };

  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImportPresets = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await importPresetsFromJSON(file);
      setPresets(updated);
      // Sync imported to DB
      for (const p of updated) {
        await savePresetToDB({ name: p.name, templateId: p.templateId, paperSize: p.paperSize, style: p.style, backgroundImage: p.backgroundImage, posterData: p.posterData });
      }
      const fromDB = await loadPresetsFromDB();
      setPresets(fromDB);
      toast({ title: "Presets importados com sucesso!" });
    } catch {
      toast({ title: "Erro ao importar arquivo", variant: "destructive" });
    }
    e.target.value = "";
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
            <Button variant="outline" size="sm" onClick={handleDirectPrint} className="snap-active gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-6">
        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="mb-6 w-full max-w-md">
            <TabsTrigger value="editor" className="flex-1 gap-1.5">
              <Edit className="w-3.5 h-3.5" /> Editor
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex-1 gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Cartazes Salvos ({presets.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB: Editor */}
          <TabsContent value="editor">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor Panel */}
              <div className="space-y-4 order-2 lg:order-1">
                {/* Save current as preset */}
                <div className="p-4 rounded-lg border border-border bg-background">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Salvar Cartaz como Preset
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Salve o cartaz atual com todos os dados preenchidos para reutilizar depois.
                  </p>
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
                    <Field label="Nome do Produto" value={data.productName} onChange={(v) => update("productName", v)} placeholder="Ex: Arroz Integral" fieldKey="productName" />
                    <Field label="Marca" value={data.brandName} onChange={(v) => update("brandName", v)} placeholder="Ex: Tio João" fieldKey="brandName" />
                    <Field label="Gramatura / Volume" value={data.gramatura} onChange={(v) => update("gramatura", v)} placeholder="Ex: 1kg, 500ml" fieldKey="gramatura" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-muted-foreground">{paperSize === "atacado-varejo" ? "Preço Atacado (R$)" : "Preço Antigo (R$)"}</label>
                        </div>
                        <input type="text" value={data.oldPrice} onChange={(e) => update("oldPrice", e.target.value)} onFocus={() => { if (data.oldPrice === DEFAULT_POSTER_DATA.oldPrice) update("oldPrice", ""); }} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-muted-foreground">{paperSize === "atacado-varejo" ? "Preço Varejo (R$)" : "Preço Novo (R$)"}</label>
                        </div>
                        <input type="text" value={data.newPrice} onChange={(e) => update("newPrice", e.target.value)} onFocus={() => { if (data.newPrice === DEFAULT_POSTER_DATA.newPrice) update("newPrice", ""); }} placeholder="Ex: 12,99" className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
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
                    <div className="mt-2">
                      <label className="text-xs text-muted-foreground">Centavos eixo Y ({posterStyle.centsOffsetY}mm)</label>
                      <Slider min={-30} max={30} step={0.5} value={[posterStyle.centsOffsetY]} onValueChange={([v]) => updateStyle("centsOffsetY", v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Desconto (%)" value={data.discount} onChange={(v) => update("discount", v)} />
                      <Field label="Validade" value={data.validity} onChange={(v) => update("validity", v)} />
                    </div>
                    <Field label="Descrição" value={data.description} onChange={(v) => update("description", v)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Quantidade" value={data.quantity} onChange={(v) => update("quantity", v)} placeholder="Ex: 3" />
                      <div>
                        <Field label="Unidade" value={data.unit} onChange={(v) => update("unit", v)} placeholder="un, kg, L" fieldKey="unit" />
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mt-1.5">
                          <Switch checked={posterStyle.unitBelowCents} onCheckedChange={(v) => updateStyle("unitBelowCents", v)} />
                          Abaixo dos centavos
                        </label>
                        {posterStyle.unitBelowCents && (
                          <div className="mt-2">
                           <label className="text-xs text-muted-foreground">Unidade eixo Y ({posterStyle.unitOffsetY}mm)</label>
                            <Slider min={-30} max={30} step={0.5} value={[posterStyle.unitOffsetY]} onValueChange={([v]) => updateStyle("unitOffsetY", v)} />
                          </div>
                        )}
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
                    <SliderField label={`Nome do produto – ${posterStyle.productFontSize}mm`} value={posterStyle.productFontSize} min={1} max={50} onChange={(v) => updateStyle("productFontSize", v)} />
                    <SliderField label={`Marca – ${posterStyle.brandFontSize}mm`} value={posterStyle.brandFontSize} min={1} max={50} onChange={(v) => updateStyle("brandFontSize", v)} />
                    <SliderField label={`Gramatura – ${posterStyle.gramaturaFontSize}mm`} value={posterStyle.gramaturaFontSize} min={1} max={30} onChange={(v) => updateStyle("gramaturaFontSize", v)} />
                    <SliderField label={`Preço (reais) – ${posterStyle.priceFontSize}mm`} value={posterStyle.priceFontSize} min={3} max={80} onChange={(v) => updateStyle("priceFontSize", v)} />
                    <SliderField label={`Preço (centavos/R$) – ${posterStyle.centsFontSize}mm`} value={posterStyle.centsFontSize} min={2} max={50} onChange={(v) => updateStyle("centsFontSize", v)} />
                    <SliderField label={`Descrição – ${posterStyle.descriptionFontSize}mm`} value={posterStyle.descriptionFontSize} min={1} max={30} onChange={(v) => updateStyle("descriptionFontSize", v)} />
                    {paperSize === "atacado-varejo" && (
                      <SliderField label={`Quantidade – ${posterStyle.quantityFontSize}mm`} value={posterStyle.quantityFontSize} min={2} max={80} onChange={(v) => updateStyle("quantityFontSize", v)} />
                    )}
                  </div>
                </div>

                {/* Posição */}
                <div className="p-4 rounded-lg border border-border bg-background">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Move className="w-4 h-4" /> Posição dos Elementos
                  </h3>
                  <div className="space-y-4">
                    <SliderField label={`Nome Y – ${posterStyle.productOffsetY}mm`} value={posterStyle.productOffsetY} min={-50} max={50} onChange={(v) => updateStyle("productOffsetY", v)} />
                    <SliderField label={`Marca Y – ${posterStyle.brandOffsetY}mm`} value={posterStyle.brandOffsetY} min={-50} max={50} onChange={(v) => updateStyle("brandOffsetY", v)} />
                    <SliderField label={`Gramatura Y – ${posterStyle.gramaturaOffsetY}mm`} value={posterStyle.gramaturaOffsetY} min={-50} max={50} onChange={(v) => updateStyle("gramaturaOffsetY", v)} />
                    <SliderField label={`Preço Y – ${posterStyle.priceOffsetY}mm`} value={posterStyle.priceOffsetY} min={-50} max={50} onChange={(v) => updateStyle("priceOffsetY", v)} />
                    <SliderField label={`Descrição Y – ${posterStyle.descriptionOffsetY}mm`} value={posterStyle.descriptionOffsetY} min={-50} max={50} onChange={(v) => updateStyle("descriptionOffsetY", v)} />
                    <SliderField label={`Validade Y – ${posterStyle.validityOffsetY}mm`} value={posterStyle.validityOffsetY} min={-50} max={50} onChange={(v) => updateStyle("validityOffsetY", v)} />
                    <SliderField label={`Unidade X – ${posterStyle.unitOffsetX}mm`} value={posterStyle.unitOffsetX} min={-50} max={50} onChange={(v) => updateStyle("unitOffsetX", v)} />
                    {paperSize === "atacado-varejo" && (
                      <>
                        <SliderField label={`Quantidade X – ${posterStyle.quantityOffsetX}mm`} value={posterStyle.quantityOffsetX} min={-100} max={100} onChange={(v) => updateStyle("quantityOffsetX", v)} />
                        <SliderField label={`Quantidade Y – ${posterStyle.quantityOffsetY}mm`} value={posterStyle.quantityOffsetY} min={-100} max={100} onChange={(v) => updateStyle("quantityOffsetY", v)} />
                        <SliderField label={`Atacado X – ${posterStyle.atacadoOffsetX}mm`} value={posterStyle.atacadoOffsetX} min={-100} max={100} onChange={(v) => updateStyle("atacadoOffsetX", v)} />
                        <SliderField label={`Atacado Y – ${posterStyle.atacadoOffsetY}mm`} value={posterStyle.atacadoOffsetY} min={-100} max={100} onChange={(v) => updateStyle("atacadoOffsetY", v)} />
                        <SliderField label={`Varejo X – ${posterStyle.varejoOffsetX}mm`} value={posterStyle.varejoOffsetX} min={-100} max={100} onChange={(v) => updateStyle("varejoOffsetX", v)} />
                        <SliderField label={`Varejo Y – ${posterStyle.varejoOffsetY}mm`} value={posterStyle.varejoOffsetY} min={-100} max={100} onChange={(v) => updateStyle("varejoOffsetY", v)} />
                      </>
                    )}
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
                    <Button variant="secondary" onClick={handleDirectPrint} className="flex-1 snap-active gap-1.5">
                      <Printer className="w-4 h-4" /> Imprimir
                    </Button>
                  </div>
                </div>
              </div>

              {/* Poster Preview */}
              <div className="order-1 lg:order-2 lg:sticky lg:top-20 self-start w-full">
                <p className="text-xs text-muted-foreground mb-2 font-mono">PREVIEW – {paperSize}</p>
                <div className={`poster-shadow rounded-lg overflow-hidden inline-block w-full mx-auto ${
                  paperSize === "gondola" ? "max-w-2xl" :
                  paperSize === "A3" ? "max-w-lg" :
                  paperSize === "A4-duplo" ? "max-w-md" :
                  paperSize === "A4-duplo-v" ? "max-w-sm" :
                  paperSize === "10x15" ? "max-w-xs" :
                  "max-w-md"
                }`}>
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
          </TabsContent>

          {/* TAB: Cartazes Salvos */}
          <TabsContent value="saved">
            {/* Export / Import toolbar */}
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={handleExportPresets} className="gap-1.5">
                <FileDown className="w-4 h-4" /> Exportar JSON
              </Button>
              <input ref={importFileRef} type="file" accept=".json" onChange={handleImportPresets} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()} className="gap-1.5">
                <FileUp className="w-4 h-4" /> Importar JSON
              </Button>
            </div>

            {presets.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Nenhum cartaz salvo</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Crie um cartaz na aba Editor, preencha os dados e clique em "Salvar" para guardar como preset reutilizável.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {presets.map((preset) => {
                  const presetTemplate = TEMPLATES.find((t) => t.id === preset.templateId) || TEMPLATES[0];
                  const presetData: PosterData = preset.posterData || { ...DEFAULT_POSTER_DATA, templateId: preset.templateId };
                  return (
                    <div key={preset.id} className="rounded-xl border border-border bg-background overflow-hidden group hover:shadow-lg transition-shadow">
                      {/* Mini preview */}
                      <div className="w-full aspect-[3/4] overflow-hidden">
                        <PosterPreview
                          template={presetTemplate}
                          data={presetData}
                          showQR={false}
                          qrUrl=""
                          style={preset.style}
                          paperSize={preset.paperSize}
                          customBackground={preset.backgroundImage}
                        />
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground truncate flex-1">{preset.name}</h4>
                          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{preset.paperSize}</span>
                        </div>
                        {preset.posterData && (
                          <p className="text-xs text-muted-foreground truncate">
                            {preset.posterData.productName || "Sem produto"} – R$ {preset.posterData.newPrice || "0,00"}
                          </p>
                        )}
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => handleLoadPreset(preset)}>
                            <Edit className="w-3 h-3" /> Carregar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive px-2" onClick={() => handleDeletePreset(preset.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const DEFAULT_FIELD_VALUES: Record<string, string> = {
  productName: DEFAULT_POSTER_DATA.productName,
  brandName: DEFAULT_POSTER_DATA.brandName,
  gramatura: DEFAULT_POSTER_DATA.gramatura,
  oldPrice: DEFAULT_POSTER_DATA.oldPrice,
  newPrice: DEFAULT_POSTER_DATA.newPrice,
  unit: DEFAULT_POSTER_DATA.unit,
};

function Field({ label, value, onChange, placeholder, fieldKey }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; fieldKey?: string }) {
  const handleFocus = () => {
    if (fieldKey && DEFAULT_FIELD_VALUES[fieldKey] && value === DEFAULT_FIELD_VALUES[fieldKey]) {
      onChange('');
    }
  };
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
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
