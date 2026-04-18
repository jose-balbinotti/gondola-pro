import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TEMPLATES, DEFAULT_POSTER_DATA, type PosterData } from "@/lib/templates";
import { PAPER_SIZES, PDF_FORMATS, getBasePdfFormat, isDuploPaperSize, needsRotation } from "@/lib/paperSizes";
import PosterPreview, { DEFAULT_POSTER_STYLE, type PosterStyle } from "@/components/poster/PosterPreview";
import PosterStyleControls from "@/components/poster/PosterStyleControls";
import FontManager from "@/components/poster/FontManager";
import { Tag, ArrowLeft, Download, FileText, Loader2, Plus, Trash2, Upload, Table, Type as TypeIcon, Save, FolderOpen, Image as ImageIcon, Printer, X, Edit } from "lucide-react";
import Papa from "papaparse";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { openPdfPrint, rotateCanvas90 } from "@/hooks/usePdf";
import { usePdf, type CapturePosterOptions } from "@/hooks/usePdf";
import { loadPresets, savePresetToDB, deletePresetFromDB, loadPresetsFromDB, type PosterPreset } from "@/lib/presets";
import { loadCustomFonts, injectAllCustomFonts, type CustomFont } from "@/lib/customFonts";

type InputMode = "table" | "text";
type Step      = "config" | "data" | "preview";

interface BatchProduct extends PosterData { copies: number; }

const emptyProduct = (): BatchProduct => ({
  ...DEFAULT_POSTER_DATA,
  productName: "", brandName: "", gramatura: "",
  oldPrice: "", newPrice: "", discount: "",
  validity: "", description: "", quantity: "", unit: "",
  copies: 1,
});

export default function BatchPage() {
  const { toast }   = useToast();
  const fileRef     = useRef<HTMLInputElement>(null);
  const bgFileRef   = useRef<HTMLInputElement>(null);

  const [step, setStep]                     = useState<Step>("config");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [paperSize, setPaperSize]           = useState("A4");
  const [posterStyle, setPosterStyle]       = useState<PosterStyle>({ ...DEFAULT_POSTER_STYLE });
  const [inputMode, setInputMode]           = useState<InputMode>("table");
  const [customBackground, setCustomBackground] = useState("");
  const [bgBaseOnly, setBgBaseOnly]         = useState(false);
  const [presetName, setPresetName]         = useState("");
  const [presets, setPresets]               = useState<PosterPreset[]>(() => loadPresets());
  const [customFonts, setCustomFonts]       = useState<CustomFont[]>(() => loadCustomFonts());
  const [perPosterStyles, setPerPosterStyles] = useState<Record<number, PosterStyle>>({});
  const [perPosterData,   setPerPosterData]   = useState<Record<number, PosterData>>({});
  const [editingPosterIdx, setEditingPosterIdx] = useState<number | null>(null);
  const [products, setProducts]             = useState<BatchProduct[]>([emptyProduct()]);
  const [textInput, setTextInput]           = useState("");
  const [exporting, setExporting]           = useState(false);
  const { exportPDF, printPoster } = usePdf();

  useEffect(() => { loadPresetsFromDB().then(setPresets); injectAllCustomFonts(); }, []);

  const template  = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
  const isDuplo   = isDuploPaperSize(paperSize);

  const updateStyle = useCallback(<K extends keyof PosterStyle>(field: K, value: PosterStyle[K]) =>
    setPosterStyle((prev) => ({ ...prev, [field]: value })), []);

  const updateProduct = (index: number, field: keyof BatchProduct, value: string | number) =>
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const addRow    = () => setProducts((prev) => [...prev, emptyProduct()]);
  const removeRow = (index: number) => setProducts((prev) => prev.filter((_, i) => i !== index));

  const validProducts = products.filter((p) => p.productName.trim());

  const expandedProducts: PosterData[] = [];
  const expandedSourceIdx: number[]    = [];
  validProducts.forEach((p, origIdx) => {
    for (let c = 0; c < (p.copies || 1); c++) {
      const { copies: _, ...posterData } = p;
      expandedProducts.push(posterData);
      expandedSourceIdx.push(origIdx);
    }
  });
  const totalPrintCount = expandedProducts.length;

  const getStyleForPoster = (idx: number) => perPosterStyles[idx] || posterStyle;
  const getDataForPoster  = (idx: number) => perPosterData[idx]   || validProducts[idx];

  const updatePerPosterStyle = useCallback(<K extends keyof PosterStyle>(idx: number, field: K, value: PosterStyle[K]) =>
    setPerPosterStyles((prev) => ({ ...prev, [idx]: { ...(prev[idx] || posterStyle), [field]: value } })), [posterStyle]);

  const updatePerPosterData = useCallback((idx: number, field: keyof PosterData, value: string) =>
    setPerPosterData((prev) => ({ ...prev, [idx]: { ...(prev[idx] || validProducts[idx]), [field]: value } })), []);

  const resetPosterOverride = (idx: number) => {
    setPerPosterStyles((prev) => { const n = { ...prev }; delete n[idx]; return n; });
    setPerPosterData  ((prev) => { const n = { ...prev }; delete n[idx]; return n; });
    setEditingPosterIdx(null);
    toast({ title: "Cartaz resetado para configuração global" });
  };

  // ── presets ─────────────────────────────────────────────────────────────────

  const handleSavePreset = async () => {
    if (!presetName.trim()) { toast({ title: "Digite um nome para o preset", variant: "destructive" }); return; }
    const result = await savePresetToDB({ name: presetName.trim(), templateId: selectedTemplate, paperSize, style: posterStyle, backgroundImage: customBackground || undefined });
    if (result) { setPresets(await loadPresetsFromDB()); setPresetName(""); toast({ title: `Preset "${result.name}" salvo!` }); }
    else toast({ title: "Erro ao salvar preset", variant: "destructive" });
  };

  const handleLoadPreset = (p: PosterPreset) => {
    setPosterStyle(p.style); setPaperSize(p.paperSize); setSelectedTemplate(p.templateId);
    if (p.backgroundImage) setCustomBackground(p.backgroundImage);
    toast({ title: `Preset "${p.name}" carregado!` });
  };

  const handleDeletePreset = async (id: string) => {
    await deletePresetFromDB(id); setPresets(await loadPresetsFromDB()); toast({ title: "Preset removido" });
  };

  // ── background upload ───────────────────────────────────────────────────────

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "application/pdf") {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf      = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const page     = await pdf.getPage(1);
        const vp       = page.getViewport({ scale: 2 });
        const canvas   = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
        setCustomBackground(canvas.toDataURL("image/png"));
        toast({ title: "PDF importado como fundo!" });
      } catch { toast({ title: "Erro ao importar PDF", variant: "destructive" }); }
    } else {
      const reader  = new FileReader();
      reader.onload = (ev) => { setCustomBackground(ev.target?.result as string); toast({ title: "Imagem de fundo carregada!" }); };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // ── CSV / text parse ─────────────────────────────────────────────────────────

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data as string[][];
        const parsed = rows.map((cols) => ({
          ...emptyProduct(),
          templateId:  selectedTemplate,
          productName: cols[0] || "", brandName:  cols[1] || "",
          gramatura:   cols[2] || "", newPrice:   cols[3] || "",
          oldPrice:    cols[4] || "", discount:   cols[5] || "",
          validity:    cols[6] || "", unit:       cols[7] || "",
          copies:      parseInt(cols[8]) || 1,
        }));
        if (parsed.length > 0) { setProducts(parsed); toast({ title: `${parsed.length} produtos importados!` }); }
      },
    });
    e.target.value = "";
  };

  const parseTextInput = () => {
    const lines  = textInput.trim().split("\n").filter(Boolean);
    const parsed = lines.map((line) => {
      const p = line.split(";").map((s) => s.trim());
      return { ...emptyProduct(), templateId: selectedTemplate, productName: p[0]||"", brandName: p[1]||"", gramatura: p[2]||"", newPrice: p[3]||"", oldPrice: p[4]||"", discount: p[5]||"", validity: p[6]||"", unit: p[7]||"", copies: parseInt(p[8])||1 };
    });
    if (parsed.length > 0) { setProducts(parsed); toast({ title: `${parsed.length} produtos importados via texto!` }); }
  };

  // ── capture & export ─────────────────────────────────────────────────────────

  const getCaptureScale = () => {
    const n = validProducts.length;
    return n > 50 ? 1.5 : n > 20 ? 2 : 3;
  };

  const capturePoster = async (containerEl: HTMLElement, captureScale?: number): Promise<HTMLCanvasElement> => {
    const sc      = captureScale ?? getCaptureScale();
    const posterEl = (containerEl.querySelector("[data-print-poster]") as HTMLElement) || containerEl;
    const elW     = Math.round(parseFloat(posterEl.style.width));
    const elH     = Math.round(parseFloat(posterEl.style.height));
    const clone   = posterEl.cloneNode(true) as HTMLElement;
    clone.style.cssText += ";transform:none;position:absolute;top:0;left:0;";
    clone.style.width   = `${elW}px`;
    clone.style.height  = `${elH}px`;
    if (bgBaseOnly && customBackground) { clone.style.backgroundImage = "none"; clone.style.backgroundColor = "#ffffff"; }
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `position:fixed;top:-20000px;left:-20000px;width:${elW}px;height:${elH}px;overflow:visible;z-index:-9999;`;
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 50));
    try {
      return await htmlToImage.toCanvas(clone, {
        pixelRatio:      sc,
        width:           elW,
        height:          elH,
        backgroundColor: bgBaseOnly && customBackground ? "#ffffff" : template.bgColor,
        skipAutoScale:   true,
      });
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const addPosterToPDF = async (pdf: jsPDF, elId: string, x: number, y: number, w: number, h: number, rotate = false) => {
    const el = document.getElementById(elId);
    if (!el) return;
    let canvas = await capturePoster(el);
    if (rotate) { const r = rotateCanvas90(canvas); canvas.width = 0; canvas.height = 0; canvas = r; }
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.85), "JPEG", x, y, w, h);
    canvas.width = 0; canvas.height = 0;
  };

  const buildBatchPDF = async (): Promise<jsPDF> => {
    const fmt      = getBasePdfFormat(paperSize);
    const isLandsc = fmt[0] > fmt[1];
    const pdf      = new jsPDF({ orientation: isLandsc ? "landscape" : "portrait", unit: "mm", format: fmt });
    const pdfW     = pdf.internal.pageSize.getWidth();
    const pdfH     = pdf.internal.pageSize.getHeight();
    const rotate   = needsRotation(paperSize);
    const halfH    = pdfH / 2;

    if (isDuplo) {
      for (let i = 0; i < expandedProducts.length; i += 2) {
        if (i > 0) pdf.addPage();
        await addPosterToPDF(pdf, `batch-poster-${expandedSourceIdx[i]}`, 0, 0, pdfW, halfH, rotate);
        if (i + 1 < expandedProducts.length)
          await addPosterToPDF(pdf, `batch-poster-${expandedSourceIdx[i + 1]}`, 0, halfH, pdfW, halfH, rotate);
      }
    } else {
      for (let i = 0; i < expandedProducts.length; i++) {
        if (i > 0) pdf.addPage();
        await addPosterToPDF(pdf, `batch-poster-${expandedSourceIdx[i]}`, 0, 0, pdfW, pdfH);
      }
    }
    return pdf;
  };

  const exportAllPDF = async () => {
    if (!validProducts.length) return;
    setExporting(true);
    try {
      const pdf = await buildBatchPDF();
      pdf.save(`cartazes-lote-${totalPrintCount}.pdf`);
      toast({ title: "PDF em lote exportado!", description: `${totalPrintCount} páginas – ${paperSize}.` });
    } catch { toast({ title: "Erro ao exportar", variant: "destructive" }); }
    setExporting(false);
  };

  const printAll = async () => {
    if (!validProducts.length) return;
    setExporting(true);
    try {
      const pdf = await buildBatchPDF();
      openPdfPrint(pdf, `cartazes-lote-${totalPrintCount}.pdf`);
      toast({ title: "Enviando para impressora...", description: `${totalPrintCount} páginas – ${paperSize}.` });
    } catch { toast({ title: "Erro ao imprimir", variant: "destructive" }); }
    setExporting(false);
  };

  const previewData: PosterData = { ...DEFAULT_POSTER_DATA, templateId: selectedTemplate };
  const extraFonts = customFonts.map((f) => ({ value: f.value, label: `★ ${f.name}` }));

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center"><Tag className="w-3.5 h-3.5 text-primary-foreground" /></div>
              <span className="text-sm font-bold text-foreground">Cartazes em Lote</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step !== "config" && (
              <Button variant="outline" size="sm" onClick={() => { setStep(step === "preview" ? "data" : "config"); setEditingPosterIdx(null); }}>
                Voltar
              </Button>
            )}
            {step === "preview" && validProducts.length > 0 && (
              <>
                {/* <Button size="sm" onClick={() => exportPDF(posterRef.current, paperSize, `${posterFilename}.pdf`, captureOptions)} className="snap-active gap-1.5"></Button> */}
                <Button size="sm" onClick={exportAllPDF} disabled={exporting} className="gap-1.5">
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Exportar PDF ({totalPrintCount})
                </Button>
                <Button size="sm" variant="outline" onClick={printAll} disabled={exporting} className="gap-1.5">
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  Imprimir ({totalPrintCount})
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="container py-6 max-w-6xl mx-auto">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-6">
          {(["config", "data", "preview"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-border" />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <span>{i + 1}.</span>
                <span>{s === "config" ? "Pré-definição" : s === "data" ? "Produtos" : "Preview"}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── STEP 1: Config ───────────────────────────────────────────────── */}
        {step === "config" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">

              {/* Presets */}
              <div className="p-4 rounded-lg border border-border bg-background">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Presets Salvos</h3>
                {presets.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {presets.map((p) => (
                      <div key={p.id} className="flex items-center gap-1 p-2 rounded-lg border border-border bg-muted/30 text-xs">
                        <button onClick={() => handleLoadPreset(p)} className="flex-1 text-left font-semibold text-foreground truncate hover:text-primary transition-colors">{p.name}</button>
                        <button onClick={() => handleDeletePreset(p.id)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">Nenhum preset salvo ainda.</p>
                )}
                <div className="flex gap-2">
                  <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Nome do preset..." className="flex-1 h-8 px-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <Button variant="outline" size="sm" onClick={handleSavePreset} className="gap-1"><Save className="w-3 h-3" /> Salvar</Button>
                </div>
              </div>

              {/* Template */}
              <div className="p-4 rounded-lg border border-border bg-background">
                <h3 className="text-sm font-bold text-foreground mb-3">Template</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TEMPLATES.filter((t) => !t.premium).map((t) => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`p-2 rounded-lg text-xs font-semibold text-left transition-colors border ${selectedTemplate === t.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-muted/30 text-muted-foreground hover:bg-accent"}`}>
                      <div className="w-full h-6 rounded mb-1 relative overflow-hidden" style={{ background: t.bgColor }}>
                        {t.backgroundImage && <img src={t.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                      </div>
                      {t.name}{t.seasonal && <span className="ml-1 text-[9px] opacity-60">🎉</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fundo */}
              <div className="p-4 rounded-lg border border-border bg-background">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fundo Personalizado</h3>
                <p className="text-xs text-muted-foreground mb-3">Importe uma imagem de fundo para cartazes pré-impressos.</p>
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
                    <div className="mt-2 w-20 h-28 rounded border border-border overflow-hidden">
                      <img src={customBackground} alt="Fundo" className="w-full h-full object-cover" />
                    </div>
                  </>
                )}
              </div>

              {/* Tamanho da folha */}
              <div className="p-4 rounded-lg border border-border bg-background">
                <h3 className="text-sm font-bold text-foreground mb-3">Tamanho da Folha</h3>
                <div className="flex flex-wrap gap-2">
                  {PAPER_SIZES.map((ps) => (
                    <button key={ps.value} onClick={() => setPaperSize(ps.value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${paperSize === ps.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                      {ps.label}
                    </button>
                  ))}
                </div>
                {isDuplo && <p className="text-xs text-muted-foreground mt-2">📄 2 cartazes diferentes por folha</p>}
              </div>

              {/* Fontes */}
              <div className="p-4 rounded-lg border border-border bg-background">
                <h3 className="text-sm font-bold text-foreground mb-3">Fontes Adicionais</h3>
                <FontManager customFonts={customFonts} onFontsChange={setCustomFonts} />
              </div>

              {/* Estilo */}
              <PosterStyleControls style={posterStyle} updateStyle={updateStyle} extraFonts={extraFonts} />

              {/* Modo de entrada */}
              <div className="p-4 rounded-lg border border-border bg-background">
                <h3 className="text-sm font-bold text-foreground mb-3">Modo de entrada dos produtos</h3>
                <div className="flex gap-2">
                  <button onClick={() => setInputMode("table")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${inputMode === "table" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}><Table className="w-4 h-4" /> Tabela</button>
                  <button onClick={() => setInputMode("text")}  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${inputMode === "text"  ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}><TypeIcon className="w-4 h-4" /> Texto</button>
                </div>
              </div>

              <Button onClick={() => setStep("data")} className="w-full">Próximo → Adicionar Produtos</Button>
            </div>

            {/* Preview */}
            <div className="lg:sticky lg:top-20 self-start">
              <p className="text-xs text-muted-foreground mb-2 font-mono">PREVIEW</p>
              <div className="rounded-lg overflow-hidden shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.15)]">
                <PosterPreview template={template} data={previewData} showQR={false} qrUrl="" style={posterStyle} paperSize={isDuplo ? paperSize.replace("-duplo", "") : paperSize} customBackground={customBackground || undefined} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Dados ────────────────────────────────────────────────── */}
        {step === "data" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Importar CSV</p>
                <p className="text-xs text-muted-foreground">Colunas: Produto; Marca; Gramatura; Preço Novo; Preço Antigo; Desconto; Validade; Unidade</p>
              </div>
              <div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5"><Upload className="w-3.5 h-3.5" /> CSV</Button>
              </div>
            </div>

            {inputMode === "text" ? (
              <div className="p-4 rounded-lg border border-border bg-background">
                <h3 className="text-sm font-bold text-foreground mb-2">Entrada por Texto</h3>
                <p className="text-xs text-muted-foreground mb-3">Uma linha por produto, campos separados por <code className="bg-muted px-1 rounded">;</code><br />Formato: Produto; Marca; Gramatura; Preço; Preço Antigo; Desconto; Validade; Unidade</p>
                <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} rows={8} placeholder={"Arroz Integral;Tio João;5kg;19,90;24,90;20;31/12/2026;un\nFeijão Preto;Camil;1kg;8,49;;;"} className="w-full rounded-lg border border-input bg-background text-sm text-foreground p-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
                <Button onClick={parseTextInput} className="mt-3 gap-1.5" size="sm"><FileText className="w-3.5 h-3.5" /> Processar Texto</Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-border bg-background overflow-x-auto">
                <h3 className="text-sm font-bold text-foreground mb-3">Tabela de Produtos</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Produto","Marca","Gramatura","Preço Novo","Preço Antigo","Desconto %","Validade","Un","Cópias",""].map((h) => (
                        <th key={h} className="text-left py-2 px-1 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1 px-1"><input className="w-full h-8 px-2 rounded border border-input bg-background text-foreground text-xs"  value={p.productName} onChange={(e) => updateProduct(i, "productName", e.target.value)} placeholder="Nome" /></td>
                        <td className="py-1 px-1"><input className="w-24 h-8 px-2 rounded border border-input bg-background text-foreground text-xs"  value={p.brandName}   onChange={(e) => updateProduct(i, "brandName",   e.target.value)} placeholder="Marca" /></td>
                        <td className="py-1 px-1"><input className="w-20 h-8 px-2 rounded border border-input bg-background text-foreground text-xs"  value={p.gramatura}   onChange={(e) => updateProduct(i, "gramatura",   e.target.value)} placeholder="1kg" /></td>
                        <td className="py-1 px-1"><input className="w-20 h-8 px-2 rounded border border-input bg-background text-foreground text-xs"  value={p.newPrice}    onChange={(e) => updateProduct(i, "newPrice",    e.target.value)} placeholder="19,90" /></td>
                        <td className="py-1 px-1"><input className="w-20 h-8 px-2 rounded border border-input bg-background text-foreground text-xs"  value={p.oldPrice}    onChange={(e) => updateProduct(i, "oldPrice",    e.target.value)} placeholder="24,90" /></td>
                        <td className="py-1 px-1"><input className="w-16 h-8 px-2 rounded border border-input bg-background text-foreground text-xs"  value={p.discount}    onChange={(e) => updateProduct(i, "discount",    e.target.value)} placeholder="20" /></td>
                        <td className="py-1 px-1"><input className="w-24 h-8 px-2 rounded border border-input bg-background text-foreground text-xs"  value={p.validity}    onChange={(e) => updateProduct(i, "validity",    e.target.value)} placeholder="31/12" /></td>
                        <td className="py-1 px-1"><input className="w-12 h-8 px-2 rounded border border-input bg-background text-foreground text-xs"  value={p.unit}        onChange={(e) => updateProduct(i, "unit",        e.target.value)} placeholder="un" /></td>
                        <td className="py-1 px-1"><input type="number" min="1" className="w-14 h-8 px-2 rounded border border-input bg-background text-foreground text-xs text-center" value={p.copies} onChange={(e) => updateProduct(i, "copies", Math.max(1, parseInt(e.target.value)||1))} /></td>
                        <td className="py-1 px-1">{products.length > 1 && <button onClick={() => removeRow(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button variant="outline" size="sm" onClick={addRow} className="mt-3 gap-1.5"><Plus className="w-3.5 h-3.5" /> Adicionar Linha</Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("config")} className="flex-1">Voltar</Button>
              <Button onClick={() => { setEditingPosterIdx(null); setStep("preview"); }} className="flex-1" disabled={validProducts.length === 0}>
                Ver Preview ({validProducts.length} cartazes, {totalPrintCount} impressões)
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview ──────────────────────────────────────────────── */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-foreground">{validProducts.length} cartazes, {totalPrintCount} impressões {isDuplo && `(${Math.ceil(totalPrintCount / 2)} folhas)`}</h3>
              <p className="text-xs text-muted-foreground">Clique em <Edit className="w-3 h-3 inline" /> para editar cartazes individualmente</p>
            </div>

            {isDuplo ? (
              <div className="space-y-6">
                {Array.from({ length: Math.ceil(validProducts.length / 2) }).map((_, pageIdx) => {
                  const idx1 = pageIdx * 2, idx2 = pageIdx * 2 + 1;
                  const isEditing1 = editingPosterIdx === idx1, isEditing2 = editingPosterIdx === idx2;
                  return (
                    <div key={pageIdx}>
                      <div className="rounded-lg border border-border overflow-hidden shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.15)]">
                        <p className="text-[10px] text-muted-foreground px-3 py-1 bg-muted font-mono">Folha {pageIdx + 1}</p>
                        <div className="relative group">
                          <button onClick={() => setEditingPosterIdx(isEditing1 ? null : idx1)} className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg transition-all ${isEditing1 ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground"}`}><Edit className="w-3.5 h-3.5" /></button>
                          <div id={`batch-poster-${idx1}`}>
                            <PosterPreview template={template} data={{ ...getDataForPoster(idx1), templateId: selectedTemplate }} showQR={false} qrUrl="" style={getStyleForPoster(idx1)} paperSize={paperSize.replace("-duplo","")} customBackground={customBackground||undefined} />
                          </div>
                        </div>
                        {idx2 < validProducts.length && (
                          <div className="border-t-2 border-dashed border-border relative group">
                            <button onClick={() => setEditingPosterIdx(isEditing2 ? null : idx2)} className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg transition-all ${isEditing2 ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground"}`}><Edit className="w-3.5 h-3.5" /></button>
                            <div id={`batch-poster-${idx2}`}>
                              <PosterPreview template={template} data={{ ...getDataForPoster(idx2), templateId: selectedTemplate }} showQR={false} qrUrl="" style={getStyleForPoster(idx2)} paperSize={paperSize.replace("-duplo","")} customBackground={customBackground||undefined} />
                            </div>
                          </div>
                        )}
                      </div>
                      {(isEditing1 || isEditing2) && (
                        <InlineEditPanel idx={isEditing1 ? idx1 : idx2} getDataForPoster={getDataForPoster} getStyleForPoster={getStyleForPoster} updatePerPosterData={updatePerPosterData} updatePerPosterStyle={updatePerPosterStyle} resetPosterOverride={resetPosterOverride} setEditingPosterIdx={setEditingPosterIdx} customFonts={customFonts} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {validProducts.map((product, i) => {
                  const isEditing = editingPosterIdx === i;
                  return (
                    <div key={i} className={`grid gap-4 ${isEditing ? "grid-cols-1 lg:grid-cols-[1fr_360px]" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                      {isEditing ? (
                        <>
                          <div className="rounded-lg overflow-hidden shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.15)] relative group">
                            <button onClick={() => setEditingPosterIdx(null)} className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-primary text-primary-foreground"><Edit className="w-3.5 h-3.5" /></button>
                            {perPosterStyles[i] && <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-primary/80 text-primary-foreground text-[9px] font-bold">Editado</div>}
                            <div id={`batch-poster-${i}`}><PosterPreview template={template} data={{ ...getDataForPoster(i), templateId: selectedTemplate }} showQR={false} qrUrl="" style={getStyleForPoster(i)} paperSize={paperSize} customBackground={customBackground||undefined} /></div>
                          </div>
                          <InlineEditPanel idx={i} getDataForPoster={getDataForPoster} getStyleForPoster={getStyleForPoster} updatePerPosterData={updatePerPosterData} updatePerPosterStyle={updatePerPosterStyle} resetPosterOverride={resetPosterOverride} setEditingPosterIdx={setEditingPosterIdx} customFonts={customFonts} />
                        </>
                      ) : (
                        <div className="rounded-lg overflow-hidden shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.15)] relative group">
                          <button onClick={() => setEditingPosterIdx(i)} className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground transition-all"><Edit className="w-3.5 h-3.5" /></button>
                          {perPosterStyles[i] && <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-primary/80 text-primary-foreground text-[9px] font-bold">Editado</div>}
                          {product.copies > 1 && <div className={`absolute ${perPosterStyles[i] ? "top-7" : "top-2"} left-2 z-10 px-1.5 py-0.5 rounded bg-accent text-accent-foreground text-[9px] font-bold`}>×{product.copies} cópias</div>}
                          <div id={`batch-poster-${i}`}><PosterPreview template={template} data={{ ...getDataForPoster(i), templateId: selectedTemplate }} showQR={false} qrUrl="" style={getStyleForPoster(i)} paperSize={paperSize} customBackground={customBackground||undefined} /></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-border">
              <Button onClick={exportAllPDF} disabled={exporting} className="flex-1 gap-1.5">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Exportar PDF ({totalPrintCount} páginas)
              </Button>
              <Button variant="outline" onClick={printAll} disabled={exporting} className="flex-1 gap-1.5">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Imprimir ({totalPrintCount} páginas)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── InlineEditPanel ───────────────────────────────────────────────────────────

function InlineEditPanel({ idx, getDataForPoster, getStyleForPoster, updatePerPosterData, updatePerPosterStyle, resetPosterOverride, setEditingPosterIdx, customFonts }: {
  idx: number;
  getDataForPoster:      (i: number) => PosterData;
  getStyleForPoster:     (i: number) => PosterStyle;
  updatePerPosterData:   (i: number, field: keyof PosterData, value: string) => void;
  updatePerPosterStyle:  <K extends keyof PosterStyle>(i: number, field: K, value: PosterStyle[K]) => void;
  resetPosterOverride:   (i: number) => void;
  setEditingPosterIdx:   (i: number | null) => void;
  customFonts:           CustomFont[];
}) {
  const d = getDataForPoster(idx);
  return (
    <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 space-y-4 max-h-[80vh] overflow-y-auto lg:sticky lg:top-20 self-start">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">✏️ Cartaz #{idx + 1}</h3>
        <div className="flex gap-2">
          <Button variant="ghost"   size="sm" onClick={() => resetPosterOverride(idx)} className="text-xs gap-1">Resetar</Button>
          <Button variant="outline" size="sm" onClick={() => setEditingPosterIdx(null)} className="gap-1"><X className="w-3 h-3" /> Fechar</Button>
        </div>
      </div>
      <div className="p-3 rounded-lg border border-border bg-background">
        <h4 className="text-xs font-bold text-foreground mb-2">Dados do Produto</h4>
        <div className="grid grid-cols-2 gap-2">
          {([["Produto","productName"],["Marca","brandName"],["Gramatura","gramatura"],["Preço Novo","newPrice"],["Preço Antigo","oldPrice"],["Desconto %","discount"],["Validade","validity"],["Unidade","unit"]] as [string, keyof PosterData][]).map(([label, field]) => (
            <div key={field}>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</label>
              <input type="text" value={(d[field] as string)||""} onChange={(e) => updatePerPosterData(idx, field, e.target.value)} className="w-full h-8 px-2 rounded border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
        </div>
      </div>
      <PosterStyleControls style={getStyleForPoster(idx)} updateStyle={(field, value) => updatePerPosterStyle(idx, field, value)} extraFonts={customFonts.map(f => ({ value: f.value, label: `★ ${f.name}` }))} />
    </div>
  );
}
