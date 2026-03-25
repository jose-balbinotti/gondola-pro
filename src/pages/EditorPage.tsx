import { useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TEMPLATES, DEFAULT_POSTER_DATA, type PosterData } from "@/lib/templates";
import { Tag, Download, ArrowLeft, FileImage, FileText, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

export default function EditorPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const posterRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [data, setData] = useState<PosterData>({
    ...DEFAULT_POSTER_DATA,
    templateId: template.id,
  });

  const [showQR, setShowQR] = useState(false);

  const update = useCallback((field: keyof PosterData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const exportPNG = async () => {
    if (!posterRef.current) return;
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 3, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `cartaz-${data.productName || "gondolapro"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "PNG exportado!", description: "Seu cartaz foi salvo." });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const exportPDF = async () => {
    if (!posterRef.current) return;
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 3, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: template.size === "A5" ? "a5" : "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`cartaz-${data.productName || "gondolapro"}.pdf`);
      toast({ title: "PDF exportado!", description: "Pronto para impressão 300dpi." });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
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
          </div>
        </div>
      </nav>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-4 order-2 lg:order-1">
            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Informações do Produto</h3>
              <div className="space-y-3">
                <Field label="Nome do Produto" value={data.productName} onChange={(v) => update("productName", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Preço Antigo (R$)" value={data.oldPrice} onChange={(v) => update("oldPrice", v)} />
                  <Field label="Preço Novo (R$)" value={data.newPrice} onChange={(v) => update("newPrice", v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Desconto (%)" value={data.discount} onChange={(v) => update("discount", v)} />
                  <Field label="Validade" value={data.validity} onChange={(v) => update("validity", v)} />
                </div>
                <Field label="Descrição" value={data.description} onChange={(v) => update("description", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantidade" value={data.quantity} onChange={(v) => update("quantity", v)} placeholder="Ex: 3" />
                  <Field label="Unidade" value={data.unit} onChange={(v) => update("unit", v)} placeholder="un, kg, L" />
                </div>
              </div>
            </div>

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

            <div className="p-4 rounded-lg border border-border bg-background">
              <h3 className="text-sm font-bold text-foreground mb-3">Exportar</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportPNG} className="flex-1 snap-active gap-1.5">
                  <FileImage className="w-4 h-4" /> PNG
                </Button>
                <Button onClick={exportPDF} className="flex-1 snap-active gap-1.5">
                  <Download className="w-4 h-4" /> PDF 300dpi
                </Button>
              </div>
            </div>
          </div>

          {/* Poster Preview */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-20 self-start">
            <p className="text-xs text-muted-foreground mb-2 font-mono">PREVIEW</p>
            <div className="poster-shadow rounded-lg overflow-hidden inline-block w-full max-w-md mx-auto">
              <PosterPreview ref={posterRef} template={template} data={data} showQR={showQR} qrUrl={qrUrl} />
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

import { forwardRef } from "react";
import type { PosterTemplate } from "@/lib/templates";

const PosterPreview = forwardRef<HTMLDivElement, { template: PosterTemplate; data: PosterData; showQR: boolean; qrUrl: string }>(
  ({ template, data, showQR, qrUrl }, ref) => {
    const isGondola = template.size === "gondola";

    return (
      <div
        ref={ref}
        className={`relative ${isGondola ? "aspect-[4/1]" : "aspect-[3/4]"} w-full flex flex-col items-center justify-center text-center p-6`}
        style={{ background: template.bgColor }}
      >
        {/* Diagonal accent */}
        {template.layout === "diagonal" && (
          <div className="absolute top-0 right-0 w-0 h-0" style={{
            borderLeft: "120px solid transparent",
            borderTop: `120px solid ${template.accentColor}`,
          }} />
        )}

        {/* Header tag */}
        <div className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: template.accentColor }}>
          ★ {template.category === 'leve-pague' ? `Leve ${data.quantity || '3'}` : 'Promoção'} ★
        </div>

        {/* Product Name */}
        <div className="text-2xl md:text-3xl font-black leading-tight mb-3 px-2" style={{ color: template.textColor }}>
          {data.productName || "Nome do Produto"}
        </div>

        {/* Description */}
        {data.description && (
          <div className="text-xs mb-2 opacity-80" style={{ color: template.textColor }}>
            {data.description}
          </div>
        )}

        {/* Price section */}
        <div className="flex items-center justify-center gap-3 mb-2">
          {data.oldPrice && (
            <span className="text-base line-through opacity-60" style={{ color: template.textColor }}>
              R$ {data.oldPrice}
            </span>
          )}
        </div>
        <div className="text-price text-5xl md:text-6xl" style={{ color: template.priceColor }}>
          R$ {data.newPrice || "0,00"}
        </div>
        {data.unit && (
          <span className="text-xs mt-1 opacity-70" style={{ color: template.textColor }}>/{data.unit}</span>
        )}

        {/* Discount badge */}
        {data.discount && (
          <div className="inline-block mt-3 px-4 py-1.5 rounded-full text-sm font-black" style={{ background: template.accentColor, color: template.bgColor }}>
            {data.discount}% OFF
          </div>
        )}

        {/* Validity */}
        {data.validity && (
          <div className="text-[10px] mt-3 opacity-60 font-mono" style={{ color: template.textColor }}>
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
