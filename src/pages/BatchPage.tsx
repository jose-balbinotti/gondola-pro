import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TEMPLATES, type PosterData, DEFAULT_POSTER_DATA } from "@/lib/templates";
import { Tag, Upload, ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import Papa from "papaparse";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

interface BatchItem extends PosterData {
  index: number;
}

export default function BatchPage() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: BatchItem[] = results.data.map((row: Record<string, string>, i: number) => ({
          ...DEFAULT_POSTER_DATA,
          templateId: selectedTemplate,
          productName: row["Produto"] || row["produto"] || row["PRODUTO"] || "",
          oldPrice: row["Preço Antigo"] || row["preco_antigo"] || row["PrecoAntigo"] || "",
          newPrice: row["Preço Novo"] || row["preco_novo"] || row["PrecoNovo"] || "",
          discount: row["Desconto %"] || row["desconto"] || row["Desconto"] || "",
          index: i,
        }));
        setItems(parsed);
        toast({ title: `${parsed.length} produtos importados!` });
      },
      error: () => toast({ title: "Erro ao ler CSV", variant: "destructive" }),
    });
  };

  const exportAllPDF = async () => {
    setExporting(true);
    try {
      const template = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < items.length; i++) {
        const el = document.getElementById(`batch-poster-${i}`);
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: null });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      }

      pdf.save(`cartazes-lote-${items.length}.pdf`);
      toast({ title: "PDF em lote exportado!", description: `${items.length} cartazes gerados.` });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Tag className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-foreground">Importação em Lote</span>
            </div>
          </div>
          {items.length > 0 && (
            <Button size="sm" onClick={exportAllPDF} disabled={exporting} className="snap-active gap-1.5">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Exportar Todos (PDF)
            </Button>
          )}
        </div>
      </nav>

      <div className="container py-6">
        <div className="max-w-2xl mx-auto">
          {/* Upload */}
          <div className="p-6 rounded-lg border-2 border-dashed border-border bg-muted/30 text-center mb-6">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground mb-1">Importar Planilha CSV</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Colunas: Produto, Preço Antigo, Preço Novo, Desconto %
            </p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="snap-active gap-1.5">
              <FileText className="w-4 h-4" /> Selecionar CSV
            </Button>
          </div>

          {/* Template selector */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Template para todos</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TEMPLATES.filter((t) => !t.premium).map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.size})</option>
              ))}
            </select>
          </div>

          {/* Preview grid */}
          {items.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">{items.length} cartazes gerados</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {items.map((item, i) => {
                  const tpl = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
                  return (
                    <div key={i} className="poster-shadow rounded-lg overflow-hidden">
                      <div
                        id={`batch-poster-${i}`}
                        className="aspect-[3/4] p-3 flex flex-col items-center justify-center text-center"
                        style={{ background: tpl.bgColor }}
                      >
                        <span className="text-[7px] font-bold uppercase tracking-widest mb-0.5" style={{ color: tpl.accentColor }}>★ Promoção ★</span>
                        <span className="text-[10px] font-black leading-tight mb-1" style={{ color: tpl.textColor }}>{item.productName}</span>
                        {item.oldPrice && (
                          <span className="text-[8px] line-through opacity-60" style={{ color: tpl.textColor }}>R$ {item.oldPrice}</span>
                        )}
                        <span className="text-lg font-black" style={{ color: tpl.priceColor }}>R$ {item.newPrice}</span>
                        {item.discount && (
                          <span className="text-[7px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full" style={{ background: tpl.accentColor, color: tpl.bgColor }}>
                            {item.discount}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
