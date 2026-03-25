import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TEMPLATES, CATEGORY_LABELS, type PosterTemplate } from "@/lib/templates";
import { Tag, Plus, Lock, Search } from "lucide-react";

export default function Dashboard() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];

  const filtered = TEMPLATES.filter((t) => {
    if (filter !== "all" && t.category !== filter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Tag className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-black tracking-tight text-foreground">GôndolaPro</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">3/10 cartazes</span>
            <Button size="sm" variant="outline" className="snap-active">Upgrade Pro</Button>
          </div>
        </div>
      </nav>

      <div className="container py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-foreground">Templates</h1>
            <p className="text-sm text-muted-foreground">Escolha um modelo e comece a editar</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap snap-active transition-colors ${
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "all" ? "Todos" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p>Nenhum template encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: PosterTemplate }) {
  return (
    <Link to={`/editor/${template.id}`} className="group block">
      <div className="relative rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors poster-shadow">
        {/* Mini Preview */}
        <div
          className="aspect-[3/4] p-3 flex flex-col items-center justify-center text-center relative"
          style={{ background: template.bgColor }}
        >
          {template.premium && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground/80 flex items-center justify-center">
              <Lock className="w-3 h-3" style={{ color: template.accentColor }} />
            </div>
          )}
          <span className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: template.accentColor }}>
            ★ Promoção ★
          </span>
          <span className="text-xs font-black leading-tight mb-1" style={{ color: template.textColor }}>
            Produto
          </span>
          <span className="text-lg font-black" style={{ color: template.priceColor }}>
            R$ 9,90
          </span>
        </div>
        {/* Label */}
        <div className="p-2 bg-background border-t border-border">
          <p className="text-xs font-semibold text-foreground truncate">{template.name}</p>
          <p className="text-[10px] text-muted-foreground">{template.size} · {CATEGORY_LABELS[template.category]}</p>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1">
            <Plus className="w-3 h-3" /> Editar
          </div>
        </div>
      </div>
    </Link>
  );
}
