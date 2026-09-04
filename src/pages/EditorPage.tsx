import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TEMPLATES, DEFAULT_POSTER_DATA, type PosterData } from "@/lib/templates";
import { PAPER_SIZES } from "@/lib/paperSizes";
import { Tag, ArrowLeft, FileImage, FileText, QrCode, Save, Upload, Trash2, Image as ImageIcon, Printer, BookOpen, Edit, FileDown, FileUp, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePdf, type CapturePosterOptions } from "@/hooks/usePdf";
import PosterPreview, { DEFAULT_POSTER_STYLE, type PosterStyle } from "@/components/poster/PosterPreview";
import PosterSheetPreview from "@/components/poster/PosterSheetPreview";
import PosterStyleControls from "@/components/poster/PosterStyleControls";
import FontManager from "@/components/poster/FontManager";
import { Field, SliderField } from "@/components/ui/Field";
import { loadPresets, savePresetToDB, deletePresetFromDB, loadPresetsFromDB, exportPresetsToJSON, importPresetsFromJSON, getPresetSaveErrorMessage, type PosterPreset } from "@/lib/presets";
import { loadCustomFonts, injectAllCustomFonts, type CustomFont } from "@/lib/customFonts";
import { planAllowsCustomFonts, planAllowsPremiumTemplates } from "@/lib/plans";
import { useAuth } from "@/hooks/useAuth";
import { readFileAsDataUrl, validateBackgroundFile, validatePresetImportFile } from "@/lib/security";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const DEFAULT_FIELD_VALUES: Record<string, string> = {
  productName: DEFAULT_POSTER_DATA.productName,
  brandName:   DEFAULT_POSTER_DATA.brandName,
  gramatura:   DEFAULT_POSTER_DATA.gramatura,
  oldPrice:    DEFAULT_POSTER_DATA.oldPrice,
  newPrice:    DEFAULT_POSTER_DATA.newPrice,
  unit:        DEFAULT_POSTER_DATA.unit,
};

export default function EditorPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const template       = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const posterRef      = useRef<HTMLDivElement>(null);
  const bgFileRef      = useRef<HTMLInputElement>(null);
  const importFileRef  = useRef<HTMLInputElement>(null);
  const { toast }      = useToast();
  const { plan, isAdmin } = useAuth();
  const canUseCustomFonts = isAdmin || planAllowsCustomFonts(plan);
  const { exportPNG, exportPDF, printPoster } = usePdf();

  const [data, setData]                     = useState<PosterData>({ ...DEFAULT_POSTER_DATA, templateId: template.id });
  const [showQR, setShowQR]                 = useState(false);
  const [posterStyle, setPosterStyle]       = useState<PosterStyle>({ ...DEFAULT_POSTER_STYLE });
  const [paperSize, setPaperSize]           = useState(template.size === "gondola" ? "gondola" : "A4");
  const [customBackground, setCustomBackground] = useState("");
  const [bgBaseOnly, setBgBaseOnly]         = useState(false);
  const [presetName, setPresetName]         = useState("");
  const [presets, setPresets]               = useState<PosterPreset[]>(() => loadPresets());
  const [customFonts, setCustomFonts]       = useState<CustomFont[]>(() => loadCustomFonts());

  useEffect(() => {
    loadPresetsFromDB().then(setPresets);
  }, []);

  useEffect(() => {
    if (canUseCustomFonts) injectAllCustomFonts();
  }, [canUseCustomFonts]);

  const update      = useCallback((field: keyof PosterData, value: string) =>
    setData((prev) => ({ ...prev, [field]: value })), []);

  const updateStyle = useCallback(<K extends keyof PosterStyle>(field: K, value: PosterStyle[K]) =>
    setPosterStyle((prev) => ({ ...prev, [field]: value })), []);

  const captureOptions: CapturePosterOptions = {
    bgColor:          template.bgColor,
    bgBaseOnly,
    customBackground: customBackground || undefined,
  };

  const posterFilename = `cartaz-${data.productName || "gondolapro"}`;

  // ── background upload ───────────────────────────────────────────────────────

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateBackgroundFile(file);
    if (validationError) {
      toast({ title: validationError, variant: "destructive" });
      e.target.value = "";
      return;
    }

    if (file.type === "application/pdf") {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) throw new Error("canvas_context_unavailable");

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        setCustomBackground(canvas.toDataURL("image/png"));
        canvas.width = 0;
        canvas.height = 0;
        toast({ title: "PDF importado como fundo!" });
      } catch {
        toast({ title: "Erro ao importar PDF", variant: "destructive" });
      }
    } else {
      try {
        setCustomBackground(await readFileAsDataUrl(file));
        toast({ title: "Imagem de fundo carregada!" });
      } catch {
        toast({ title: "Erro ao importar imagem", variant: "destructive" });
      }
    }
    e.target.value = "";
  };

  // ── presets ─────────────────────────────────────────────────────────────────

  const handleSavePreset = async () => {
    if (!presetName.trim()) { toast({ title: "Digite um nome para o preset", variant: "destructive" }); return; }

    try {
      const result = await savePresetToDB({ name: presetName.trim(), templateId: template.id, paperSize, style: posterStyle, backgroundImage: customBackground || undefined, posterData: { ...data } });
      if (result) { setPresets(await loadPresetsFromDB()); setPresetName(""); toast({ title: `Preset "${result.name}" salvo!` }); }
      else toast({ title: "Erro ao salvar preset", variant: "destructive" });
    } catch (error) {
      toast({ title: "Erro ao salvar preset", description: getPresetSaveErrorMessage(error), variant: "destructive" });
    }
  };

  const handleLoadPreset = (preset: PosterPreset) => {
    setPosterStyle(preset.style); setPaperSize(preset.paperSize);
    if (preset.backgroundImage) setCustomBackground(preset.backgroundImage);
    if (preset.posterData)      setData(preset.posterData);
    toast({ title: `Preset "${preset.name}" carregado!` });
  };

  const handleDeletePreset = async (id: string) => {
    await deletePresetFromDB(id); setPresets(await loadPresetsFromDB()); toast({ title: "Preset removido" });
  };

  const handleExportPresets = () => {
    if (presets.length === 0) { toast({ title: "Nenhum preset para exportar", variant: "destructive" }); return; }
    exportPresetsToJSON(presets); toast({ title: `${presets.length} presets exportados!` });
  };

  const handleImportPresets = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validatePresetImportFile(file);
    if (validationError) {
      toast({ title: validationError, variant: "destructive" });
      e.target.value = "";
      return;
    }

    try {
      const updated = await importPresetsFromJSON(file);
      for (const p of updated) await savePresetToDB({ name: p.name, templateId: p.templateId, paperSize: p.paperSize, style: p.style, backgroundImage: p.backgroundImage, posterData: p.posterData });
      setPresets(await loadPresetsFromDB()); toast({ title: "Presets importados com sucesso!" });
    } catch (error) { toast({ title: "Erro ao importar arquivo", description: getPresetSaveErrorMessage(error), variant: "destructive" }); }
    e.target.value = "";
  };

  const qrUrl     = data.whatsappNumber ? `https://wa.me/55${data.whatsappNumber.replace(/\D/g, "")}` : "";
  const canUseCurrentTemplate = !template.premium || isAdmin || planAllowsPremiumTemplates(plan);
  const extraFonts = canUseCustomFonts ? customFonts.map((f) => ({ value: f.value, label: `★ ${f.name}` })) : [];

  if (!canUseCurrentTemplate) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="icon" aria-label="Voltar para o dashboard">
                <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                  <Tag className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold text-foreground">{template.name}</span>
              </div>
            </div>
            <LogoutButton variant="ghost" size="sm" className="px-2 sm:px-3" />
          </div>
        </nav>

        <main className="container flex min-h-[calc(100vh-3.5rem)] max-w-2xl items-center py-10">
          <Card className="w-full border-primary/20">
            <CardHeader>
              <Badge variant="outline" className="mb-2 w-fit">Plano atual: {plan?.name ?? "sem plano"}</Badge>
              <CardTitle>Template disponível apenas em planos premium</CardTitle>
              <CardDescription>
                Este modelo está bloqueado para o seu plano atual. Como ainda não há pagamento automático, solicite a liberação manual para um administrador.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/dashboard">Voltar aos templates</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/profile">Ver plano atual</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
            <Button variant="outline" size="sm" onClick={() => exportPNG(posterRef.current, `${posterFilename}.png`, captureOptions)} className="snap-active gap-1.5">
              <FileImage className="w-3.5 h-3.5" /> PNG
            </Button>
            <Button size="sm" onClick={() => exportPDF(posterRef.current, paperSize, `${posterFilename}.pdf`, captureOptions)} className="snap-active gap-1.5">
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => printPoster(posterRef.current, paperSize, `${posterFilename}.pdf`, captureOptions)} className="snap-active gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
            <LogoutButton variant="ghost" size="sm" className="px-2 sm:px-3 [&_span]:hidden sm:[&_span]:inline" />
          </div>
        </div>
      </nav>

      <div className="container py-6">
        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="mb-6 w-full max-w-md">
            <TabsTrigger value="editor" className="flex-1 gap-1.5"><Edit className="w-3.5 h-3.5" /> Editor</TabsTrigger>
            <TabsTrigger value="saved"  className="flex-1 gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Cartazes Salvos ({presets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4 order-2 lg:order-1">

                {/* Salvar preset */}
                <div className="p-4 rounded-lg border border-border bg-background">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Save className="w-4 h-4" /> Salvar Cartaz como Preset</h3>
                  <p className="text-xs text-muted-foreground mb-3">Salve o cartaz atual com todos os dados preenchidos para reutilizar depois.</p>
                  <div className="flex gap-2">
                    <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Nome do preset..." className="flex-1 h-8 px-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    <Button variant="outline" size="sm" onClick={handleSavePreset} className="gap-1"><Save className="w-3 h-3" /> Salvar</Button>
                  </div>
                </div>

                {/* Fundo */}
                <div className="p-4 rounded-lg border border-border bg-background">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fundo Personalizado</h3>
                  <div className="flex gap-2">
                    <input ref={bgFileRef} type="file" accept="image/*,application/pdf" onChange={handleBgUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => bgFileRef.current?.click()} className="gap-1.5"><Upload className="w-3.5 h-3.5" /> Importar Fundo</Button>
                    {customBackground && <Button variant="ghost" size="sm" onClick={() => setCustomBackground("")} className="text-destructive">Remover</Button>}
                  </div>
                  {customBackground && (
                    <>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mt-2">
                        <Switch checked={bgBaseOnly} onCheckedChange={setBgBaseOnly} /> Usar só como base (não imprime o fundo)
                      </label>
                      <div className="mt-2 w-16 h-22 rounded border border-border overflow-hidden">
                        <img src={customBackground} alt="Fundo" className="w-full h-full object-cover" />
                      </div>
                    </>
                  )}
                </div>

                {/* Produto */}
                <div className="p-4 rounded-lg border border-border bg-background">
                  <h3 className="text-sm font-bold text-foreground mb-3">Informações do Produto</h3>
                  <div className="space-y-3">
                    <Field label="Nome do Produto"    value={data.productName} onChange={(v) => update("productName", v)} placeholder="Ex: Arroz Integral" defaultValue={DEFAULT_FIELD_VALUES.productName} />
                    <Field label="Marca"              value={data.brandName}   onChange={(v) => update("brandName", v)}   placeholder="Ex: Tio João"       defaultValue={DEFAULT_FIELD_VALUES.brandName} />
                    <Field label="Gramatura / Volume" value={data.gramatura}   onChange={(v) => update("gramatura", v)}   placeholder="Ex: 1kg, 500ml"     defaultValue={DEFAULT_FIELD_VALUES.gramatura} />
                    <div className="grid grid-cols-2 gap-2">
                      {(["solid","dashed","dotted"] as const).map((style, i) => (
                        <label key={style} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <Switch checked={posterStyle.gramaturaStyle === style} onCheckedChange={(v) => updateStyle("gramaturaStyle", v ? style : null)} />
                          {["Linha","Traço","Pontilhado"][i]} na gramatura
                        </label>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">{paperSize === "atacado-varejo" ? "Preço Atacado (R$)" : "Preço Antigo (R$)"}</label>
                        <input type="text" value={data.oldPrice} onChange={(e) => update("oldPrice", e.target.value)} onFocus={() => { if (data.oldPrice === DEFAULT_POSTER_DATA.oldPrice) update("oldPrice", ""); }} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">{paperSize === "atacado-varejo" ? "Preço Varejo (R$)" : "Preço Novo (R$)"}</label>
                        <input type="text" value={data.newPrice} onChange={(e) => update("newPrice", e.target.value)} onFocus={() => { if (data.newPrice === DEFAULT_POSTER_DATA.newPrice) update("newPrice", ""); }} placeholder="Ex: 12,99" className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"><Switch checked={posterStyle.hideCurrencySymbol} onCheckedChange={(v) => updateStyle("hideCurrencySymbol", v)} /> Ocultar R$</label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"><Switch checked={posterStyle.centsAlignTop}      onCheckedChange={(v) => updateStyle("centsAlignTop", v)} /> Centavos no topo</label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"><Switch checked={posterStyle.centsUnderline}     onCheckedChange={(v) => updateStyle("centsUnderline", v)} /> Traço nos centavos</label>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Centavos eixo Y ({posterStyle.centsOffsetY})</label>
                      <SliderField label="" value={posterStyle.centsOffsetY} min={-100} max={100} onChange={(v) => updateStyle("centsOffsetY", v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Desconto (%)" value={data.discount}  onChange={(v) => update("discount", v)} />
                      <Field label="Validade"      value={data.validity}  onChange={(v) => update("validity", v)} />
                    </div>
                    <Field label="Descrição" value={data.description} onChange={(v) => update("description", v)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Quantidade" value={data.quantity} onChange={(v) => update("quantity", v)} placeholder="Ex: 3" />
                      <div>
                        <Field label="Unidade" value={data.unit} onChange={(v) => update("unit", v)} placeholder="un, kg, L" defaultValue={DEFAULT_FIELD_VALUES.unit} />
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mt-1.5">
                          <Switch checked={posterStyle.unitBelowCents} onCheckedChange={(v) => updateStyle("unitBelowCents", v)} /> Abaixo dos centavos
                        </label>
                        {posterStyle.unitBelowCents && (
                          <div className="mt-2">
                            <label className="text-xs text-muted-foreground">Unidade eixo Y ({posterStyle.unitOffsetY})</label>
                            <SliderField label="" value={posterStyle.unitOffsetY} min={-100} max={100} onChange={(v) => updateStyle("unitOffsetY", v)} />
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
                    {canUseCustomFonts ? (
                      <FontManager customFonts={customFonts} onFontsChange={setCustomFonts} />
                    ) : (
                      <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                        Fontes personalizadas estão bloqueadas no seu plano atual. As fontes padrão continuam disponíveis.
                      </p>
                    )}
                  </div>
                </div>

                {/* Estilo via PosterStyleControls */}
                <PosterStyleControls style={posterStyle} updateStyle={updateStyle} extraFonts={extraFonts} />

                {/* Tamanho da folha */}
                <div className="p-4 rounded-lg border border-border bg-background">
                  <h3 className="text-sm font-bold text-foreground mb-3">Tamanho da Folha</h3>
                  <div className="flex flex-wrap gap-2">
                    {PAPER_SIZES.map((ps) => (
                      <button key={ps.value} onClick={() => setPaperSize(ps.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold snap-active transition-colors ${paperSize === ps.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
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
                    <button onClick={() => setShowQR(!showQR)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold snap-active transition-colors ${showQR ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <QrCode className="w-3.5 h-3.5" /> QR Code
                    </button>
                  </div>
                </div>

                {/* Exportar */}
                <div className="p-4 rounded-lg border border-border bg-background">
                  <h3 className="text-sm font-bold text-foreground mb-3">Exportar</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => exportPNG(posterRef.current, `${posterFilename}.png`, captureOptions)} className="flex-1 snap-active gap-1.5"><FileImage className="w-4 h-4" /> PNG</Button>
                    <Button onClick={() => exportPDF(posterRef.current, paperSize, `${posterFilename}.pdf`, captureOptions)} className="flex-1 snap-active gap-1.5"><Download className="w-4 h-4" /> PDF {paperSize}</Button>
                    <Button variant="secondary" onClick={() => printPoster(posterRef.current, paperSize, `${posterFilename}.pdf`, captureOptions)} className="flex-1 snap-active gap-1.5"><Printer className="w-4 h-4" /> Imprimir</Button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="order-1 lg:order-2 lg:sticky lg:top-20 self-start w-full">
                <p className="text-xs text-muted-foreground mb-2 font-mono">PREVIEW – {paperSize}</p>
                <div className={`inline-block w-full mx-auto ${
                  paperSize === "gondola" ? "max-w-2xl" : paperSize === "A3" ? "max-w-lg" :
                  paperSize === "A4-duplo" || paperSize === "A4-duplo-v" || paperSize === "A4-8" ? "max-w-md" :
                  paperSize === "10x15" ? "max-w-xs" : "max-w-md"}`}>
                  <PosterSheetPreview
                    paperSize={paperSize}
                    renderPoster={(slotIndex) => (
                      <PosterPreview
                        ref={slotIndex === 0 ? posterRef : undefined}
                        template={template}
                        data={data}
                        showQR={showQR}
                        qrUrl={qrUrl}
                        style={posterStyle}
                        paperSize={paperSize}
                        customBackground={customBackground || undefined}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={handleExportPresets} className="gap-1.5"><FileDown className="w-4 h-4" /> Exportar JSON</Button>
              <input ref={importFileRef} type="file" accept=".json" onChange={handleImportPresets} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()} className="gap-1.5"><FileUp className="w-4 h-4" /> Importar JSON</Button>
            </div>

            {presets.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Nenhum cartaz salvo</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">Crie um cartaz na aba Editor, preencha os dados e clique em "Salvar".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {presets.map((preset) => {
                  const presetTemplate = TEMPLATES.find((t) => t.id === preset.templateId) || TEMPLATES[0];
                  const presetData: PosterData = preset.posterData || { ...DEFAULT_POSTER_DATA, templateId: preset.templateId };
                  return (
                    <div key={preset.id} className="rounded-xl border border-border bg-background overflow-hidden group hover:shadow-lg transition-shadow">
                      <div className="w-full aspect-[3/4] overflow-hidden">
                        <PosterPreview template={presetTemplate} data={presetData} showQR={false} qrUrl="" style={preset.style} paperSize={preset.paperSize} customBackground={preset.backgroundImage} />
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground truncate flex-1">{preset.name}</h4>
                          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{preset.paperSize}</span>
                        </div>
                        {preset.posterData && <p className="text-xs text-muted-foreground truncate">{preset.posterData.productName || "Sem produto"} – R$ {preset.posterData.newPrice || "0,00"}</p>}
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => handleLoadPreset(preset)}><Edit className="w-3 h-3" /> Carregar</Button>
                          <Button variant="ghost"   size="sm" className="text-destructive px-2"       onClick={() => handleDeletePreset(preset.id)}><Trash2 className="w-3 h-3" /></Button>
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
