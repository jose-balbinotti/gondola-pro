import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEMPLATES, DEFAULT_POSTER_DATA, type PosterData } from "@/lib/templates";
import PosterPreview, { DEFAULT_POSTER_STYLE, FONT_OPTIONS, type PosterStyle } from "@/components/poster/PosterPreview";
import { Tag, ArrowLeft, Download, FileText, Loader2, Plus, Trash2, Upload, Table, Type as TypeIcon } from "lucide-react";
import Papa from "papaparse";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

const PDF_FORMATS: Record<string, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  A3: [297, 420],
  gondola: [297, 74],
  "10x15": [100, 150],
};

const PAPER_SIZES = [
  { value: "A4", label: "A4" },
  { value: "A5", label: "A5" },
  { value: "A3", label: "A3" },
  { value: "gondola", label: "Gôndola" },
  { value: "10x15", label: "10×15cm" },
];

type InputMode = "table" | "text";
type Step = "config" | "data" | "preview";

const emptyProduct = (): PosterData => ({
  ...DEFAULT_POSTER_DATA,
  productName: "",
  brandName: "",
  gramatura: "",
  oldPrice: "",
  newPrice: "",
  discount: "",
  validity: "",
  description: "",
  quantity: "",
  unit: "",
});

export default function BatchPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Step control
  const [step, setStep] = useState<Step>("config");

  // Config (pre-definition)
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [paperSize, setPaperSize] = useState("A4");
  const [posterStyle, setPosterStyle] = useState<PosterStyle>({ ...DEFAULT_POSTER_STYLE });
  const [inputMode, setInputMode] = useState<InputMode>("table");

  // Data
  const [products, setProducts] = useState<PosterData[]>([emptyProduct()]);
  const [textInput, setTextInput] = useState("");
  const [exporting, setExporting] = useState(false);

  const template = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

  const updateStyle = useCallback(<K extends keyof PosterStyle>(field: K, value: PosterStyle[K]) => {
    setPosterStyle((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateProduct = (index: number, field: keyof PosterData, value: string) => {
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const addRow = () => setProducts((prev) => [...prev, emptyProduct()]);
  const removeRow = (index: number) => setProducts((prev) => prev.filter((_, i) => i !== index));

  const parseTextInput = () => {
    const lines = textInput.trim().split("\n").filter(Boolean);
    const parsed: PosterData[] = lines.map((line) => {
      const parts = line.split(";").map((s) => s.trim());
      return {
        ...emptyProduct(),
        templateId: selectedTemplate,
        productName: parts[0] || "",
        brandName: parts[1] || "",
        gramatura: parts[2] || "",
        newPrice: parts[3] || "",
        oldPrice: parts[4] || "",
        discount: parts[5] || "",
        validity: parts[6] || "",
        unit: parts[7] || "",
      };
    });
    if (parsed.length > 0) {
      setProducts(parsed);
      toast({ title: `${parsed.length} produtos importados via texto!` });
    }
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: PosterData[] = results.data.map((row: Record<string, string>) => ({
          ...emptyProduct(),
          templateId: selectedTemplate,
          productName: row["Produto"] || row["produto"] || row["PRODUTO"] || row["Nome"] || "",
          brandName: row["Marca"] || row["marca"] || "",
          gramatura: row["Gramatura"] || row["gramatura"] || row["Peso"] || "",
          oldPrice: row["Preço Antigo"] || row["preco_antigo"] || row["PrecoAntigo"] || "",
          newPrice: row["Preço Novo"] || row["preco_novo"] || row["PrecoNovo"] || row["Preco"] || row["preco"] || "",
          discount: row["Desconto %"] || row["desconto"] || row["Desconto"] || "",
          validity: row["Validade"] || row["validade"] || "",
          unit: row["Unidade"] || row["unidade"] || row["un"] || "",
        }));
        setProducts(parsed);
        toast({ title: `${parsed.length} produtos importados do CSV!` });
      },
      error: () => toast({ title: "Erro ao ler CSV", variant: "destructive" }),
    });
    e.target.value = "";
  };

  const validProducts = products.filter((p) => p.productName.trim() || p.newPrice.trim());

  const exportAllPDF = async () => {
    if (validProducts.length === 0) return;
    setExporting(true);
    try {
      const fmt = PDF_FORMATS[paperSize] || PDF_FORMATS.A4;
      const isLandscape = fmt[0] > fmt[1];
      const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: fmt });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < validProducts.length; i++) {
        const el = document.getElementById(`batch-poster-${i}`);
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: null });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      }

      pdf.save(`cartazes-lote-${validProducts.length}.pdf`);
      toast({ title: "PDF em lote exportado!", description: `${validProducts.length} cartazes – ${paperSize}.` });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Tag className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-foreground">Cartazes em Lote</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step !== "config" && (
              <Button variant="outline" size="sm" onClick={() => setStep(step === "preview" ? "data" : "config")}>
                Voltar
              </Button>
            )}
            {step === "preview" && validProducts.length > 0 && (
              <Button size="sm" onClick={exportAllPDF} disabled={exporting} className="gap-1.5">
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Exportar PDF ({validProducts.length})
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="container py-6 max-w-5xl mx-auto">
        {/* Steps indicator */}
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

        {/* STEP 1: Config */}
        {step === "config" && (
          <div className="space-y-4 max-w-2xl">
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Template</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEMPLATES.filter((t) => !t.premium).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`p-2 rounded-lg text-xs font-semibold text-left transition-colors border ${selectedTemplate === t.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-muted/30 text-muted-foreground hover:bg-accent"}`}
                  >
                    <div className="w-full h-6 rounded mb-1" style={{ background: t.bgColor }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Tamanho da Folha</h3>
              <div className="flex flex-wrap gap-2">
                {PAPER_SIZES.map((ps) => (
                  <button key={ps.value} onClick={() => setPaperSize(ps.value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${paperSize === ps.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                    {ps.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Fontes</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fonte geral</label>
                  <Select value={posterStyle.fontFamily} onValueChange={(v) => updateStyle("fontFamily", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{FONT_OPTIONS.map((f) => (<SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fonte do preço</label>
                  <Select value={posterStyle.priceFontFamily || "__default__"} onValueChange={(v) => updateStyle("priceFontFamily", v === "__default__" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Mesma da geral</SelectItem>
                      {FONT_OPTIONS.map((f) => (<SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Sombreamento</label>
                  <Switch checked={posterStyle.textShadow} onCheckedChange={(v) => updateStyle("textShadow", v)} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Tamanhos de Texto</h3>
              <div className="space-y-3">
                <SliderField label={`Produto – ${posterStyle.productFontSize}px`} value={posterStyle.productFontSize} min={10} max={72} onChange={(v) => updateStyle("productFontSize", v)} />
                <SliderField label={`Marca – ${posterStyle.brandFontSize}px`} value={posterStyle.brandFontSize} min={8} max={48} onChange={(v) => updateStyle("brandFontSize", v)} />
                <SliderField label={`Preço (R$) – ${posterStyle.priceFontSize}px`} value={posterStyle.priceFontSize} min={24} max={120} onChange={(v) => updateStyle("priceFontSize", v)} />
                <SliderField label={`Centavos – ${posterStyle.centsFontSize}px`} value={posterStyle.centsFontSize} min={12} max={80} onChange={(v) => updateStyle("centsFontSize", v)} />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Modo de entrada dos produtos</h3>
              <div className="flex gap-2">
                <button onClick={() => setInputMode("table")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${inputMode === "table" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                  <Table className="w-4 h-4" /> Tabela
                </button>
                <button onClick={() => setInputMode("text")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${inputMode === "text" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                  <TypeIcon className="w-4 h-4" /> Texto
                </button>
              </div>
            </div>

            <Button onClick={() => setStep("data")} className="w-full">
              Próximo → Adicionar Produtos
            </Button>
          </div>
        )}

        {/* STEP 2: Data input */}
        {step === "data" && (
          <div className="space-y-4">
            {/* CSV import */}
            <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Importar CSV</p>
                <p className="text-xs text-muted-foreground">Colunas: Produto; Marca; Gramatura; Preço Novo; Preço Antigo; Desconto; Validade; Unidade</p>
              </div>
              <div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> CSV
                </Button>
              </div>
            </div>

            {inputMode === "text" ? (
              <div className="p-4 rounded-lg border border-border bg-background">
                <h3 className="text-sm font-bold text-foreground mb-2">Entrada por Texto</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Uma linha por produto, campos separados por <code className="bg-muted px-1 rounded">;</code><br />
                  Formato: Produto; Marca; Gramatura; Preço; Preço Antigo; Desconto; Validade; Unidade
                </p>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={8}
                  placeholder={"Arroz Integral;Tio João;5kg;19,90;24,90;20;31/12/2026;un\nFeijão Preto;Camil;1kg;8,49;;;\nLeite Integral;Italac;1L;5,99;6,99;15;;un"}
                  className="w-full rounded-lg border border-input bg-background text-sm text-foreground p-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
                <Button onClick={parseTextInput} className="mt-3 gap-1.5" size="sm">
                  <FileText className="w-3.5 h-3.5" /> Processar Texto
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-border bg-background overflow-x-auto">
                <h3 className="text-sm font-bold text-foreground mb-3">Tabela de Produtos</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Produto", "Marca", "Gramatura", "Preço Novo", "Preço Antigo", "Desconto %", "Validade", "Un", ""].map((h) => (
                        <th key={h} className="text-left py-2 px-1 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1 px-1"><input className="w-full h-8 px-2 rounded border border-input bg-background text-foreground text-xs" value={p.productName} onChange={(e) => updateProduct(i, "productName", e.target.value)} placeholder="Nome" /></td>
                        <td className="py-1 px-1"><input className="w-24 h-8 px-2 rounded border border-input bg-background text-foreground text-xs" value={p.brandName} onChange={(e) => updateProduct(i, "brandName", e.target.value)} placeholder="Marca" /></td>
                        <td className="py-1 px-1"><input className="w-20 h-8 px-2 rounded border border-input bg-background text-foreground text-xs" value={p.gramatura} onChange={(e) => updateProduct(i, "gramatura", e.target.value)} placeholder="1kg" /></td>
                        <td className="py-1 px-1"><input className="w-20 h-8 px-2 rounded border border-input bg-background text-foreground text-xs" value={p.newPrice} onChange={(e) => updateProduct(i, "newPrice", e.target.value)} placeholder="19,90" /></td>
                        <td className="py-1 px-1"><input className="w-20 h-8 px-2 rounded border border-input bg-background text-foreground text-xs" value={p.oldPrice} onChange={(e) => updateProduct(i, "oldPrice", e.target.value)} placeholder="24,90" /></td>
                        <td className="py-1 px-1"><input className="w-16 h-8 px-2 rounded border border-input bg-background text-foreground text-xs" value={p.discount} onChange={(e) => updateProduct(i, "discount", e.target.value)} placeholder="20" /></td>
                        <td className="py-1 px-1"><input className="w-24 h-8 px-2 rounded border border-input bg-background text-foreground text-xs" value={p.validity} onChange={(e) => updateProduct(i, "validity", e.target.value)} placeholder="31/12" /></td>
                        <td className="py-1 px-1"><input className="w-12 h-8 px-2 rounded border border-input bg-background text-foreground text-xs" value={p.unit} onChange={(e) => updateProduct(i, "unit", e.target.value)} placeholder="un" /></td>
                        <td className="py-1 px-1">
                          {products.length > 1 && (
                            <button onClick={() => removeRow(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button variant="outline" size="sm" onClick={addRow} className="mt-3 gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Linha
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("config")} className="flex-1">Voltar</Button>
              <Button onClick={() => setStep("preview")} className="flex-1" disabled={validProducts.length === 0}>
                Ver Preview ({validProducts.length} cartazes)
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">{validProducts.length} cartazes</h3>
              <Button size="sm" onClick={exportAllPDF} disabled={exporting} className="gap-1.5">
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Exportar PDF – {paperSize}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {validProducts.map((product, i) => (
                <div key={i} className="rounded-lg overflow-hidden shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.15)]">
                  <div id={`batch-poster-${i}`}>
                    <PosterPreview
                      template={template}
                      data={{ ...product, templateId: selectedTemplate }}
                      showQR={false}
                      qrUrl=""
                      style={posterStyle}
                      paperSize={paperSize}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
