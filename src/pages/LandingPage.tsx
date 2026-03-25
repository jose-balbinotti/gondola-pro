import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Printer, Zap, FileSpreadsheet, Share2, ArrowRight, Tag } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Tag, title: "20+ Templates", desc: "Modelos prontos para A4, A5 e faixas de gôndola." },
  { icon: Zap, title: "Editor Rápido", desc: "Edite nome, preço e desconto em segundos. Sem complicação." },
  { icon: FileSpreadsheet, title: "Importação CSV", desc: "Importe planilhas e gere cartazes em lote automaticamente." },
  { icon: Printer, title: "Exportação Pro", desc: "PDF 300dpi, PNG e link compartilhável para impressão." },
  { icon: Share2, title: "QR Code", desc: "Gere QR codes para WhatsApp e estoque integrado." },
];

const plans = [
  { name: "Grátis", price: "R$ 0", period: "/mês", features: ["10 cartazes/mês", "Templates básicos", "Exportação PNG", "QR Code"], cta: "Começar Grátis", popular: false },
  { name: "Pro", price: "R$ 19,90", period: "/mês", features: ["Cartazes ilimitados", "Todos os templates", "PDF 300dpi", "Importação CSV", "Logo personalizado", "Sem marca d'água"], cta: "Assinar Pro", popular: true },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Tag className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-black tracking-tight text-foreground">GôndolaPro</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/dashboard">
              <Button size="sm" className="snap-active">Criar Cartaz</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}>
              <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
                Editor de cartazes para supermercados
              </span>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-foreground mb-4">
                Crie cartazes de oferta em{" "}
                <span className="text-primary">segundos</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Templates prontos, editor simples e exportação profissional. 
                Perfeito para supermercados pequenos e médios.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/dashboard">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Criar Primeiro Cartaz <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="xl" className="snap-active" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                Ver Planos
              </Button>
            </motion.div>
          </div>

          {/* Live Preview */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="mt-12 max-w-md mx-auto">
            <div className="poster-shadow rounded-lg overflow-hidden" style={{ background: '#E31C1C' }}>
              <div className="p-6 text-center">
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#FFD700' }}>★ Promoção ★</div>
                <div className="text-2xl font-black mb-2" style={{ color: '#FFFFFF' }}>Arroz Tipo 1 5kg</div>
                <div className="flex items-center justify-center gap-3 mb-1">
                  <span className="text-sm line-through opacity-70" style={{ color: '#FFFFFF' }}>R$ 24,90</span>
                  <span className="text-price text-5xl" style={{ color: '#FFD700' }}>R$ 19,90</span>
                </div>
                <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#FFD700', color: '#1A1A1B' }}>
                  20% OFF
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">↑ Exemplo de cartaz — edite tudo no dashboard</p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-10 text-foreground">Tudo que você precisa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i, duration: 0.3 }} className="p-4 rounded-lg bg-background border border-border">
                <f.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-bold text-sm mb-1 text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-10 text-foreground">Planos simples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.name} className={`p-6 rounded-lg border-2 ${plan.popular ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                {plan.popular && <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-primary text-primary-foreground mb-3">Popular</span>}
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-price text-3xl text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/dashboard">
                  <Button variant={plan.popular ? "default" : "outline"} className="w-full snap-active">
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2026 GôndolaPro</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Online</span>
        </div>
      </footer>
    </div>
  );
}
