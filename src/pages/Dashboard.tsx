import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileSpreadsheet,
  LayoutGrid,
  Lock,
  Palette,
  Plus,
  Search,
  Shield,
} from "lucide-react";
import { PlanSummaryCard } from "@/components/billing/PlanSummaryCard";
import { AppHeader } from "@/components/layout/AppHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_LABELS, TEMPLATES, type PosterTemplate } from "@/lib/templates";
import { getNumericPlanLimit, planAllowsPremiumTemplates } from "@/lib/plans";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const categories = ["all", ...Object.keys(CATEGORY_LABELS)];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const { user, profile, isAdmin, subscription, plan } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const displayName = profile?.displayName || user?.email || "usuário";

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return TEMPLATES.filter((template) => {
      if (filter !== "all" && template.category !== filter) return false;
      if (!normalizedSearch) return true;

      return `${template.name} ${CATEGORY_LABELS[template.category]} ${template.size}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [filter, search]);

  const freeTemplates = useMemo(
    () => TEMPLATES.filter((template) => !template.premium).length,
    [],
  );

  const premiumTemplates = TEMPLATES.length - freeTemplates;
  const canUsePremiumTemplates = isAdmin || planAllowsPremiumTemplates(plan);
  const maxBatchItems = getNumericPlanLimit(plan, "maxBatchItems");
  const maxPresets = getNumericPlanLimit(plan, "maxPresets");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container space-y-8 py-6 lg:py-8">
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <Badge variant="secondary" className="mb-4 w-fit">
                  Área logada
                </Badge>
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  {getGreeting()}, {displayName}.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Escolha um template, edite o cartaz ou importe uma lista CSV para gerar ofertas em lote com o fluxo de PDF já protegido por login.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to={`/editor/${TEMPLATES[0].id}`}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Criar cartaz
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link to="/batch">
                    <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                    Importar CSV
                  </Link>
                </Button>
                {isAdmin && (
                  <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
                    <Link to="/admin">
                      <Shield className="h-4 w-4" aria-hidden="true" />
                      Abrir admin
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <PlanSummaryCard
              plan={plan}
              subscription={subscription}
              action={(
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link to="/profile">
                    Gerenciar perfil e plano
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              )}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Templates disponíveis"
            value={String(TEMPLATES.length)}
            description={`${freeTemplates} gratuitos, ${premiumTemplates} premium; ${Number.isFinite(maxPresets) ? maxPresets : "∞"} presets`}
            icon={<LayoutGrid className="h-5 w-5" />}
          />
          <MetricCard
            title="Formatos de saída"
            value="PDF/PNG"
            description="Cartaz individual, A4 duplo, A4 8 e gôndola"
            icon={<Palette className="h-5 w-5" />}
          />
          <MetricCard
            title="Geração em lote"
            value="CSV"
            description={`Até ${Number.isFinite(maxBatchItems) ? maxBatchItems : "∞"} impressões por lote`}
            icon={<FileSpreadsheet className="h-5 w-5" />}
          />
        </section>

        <section className="space-y-5">
          <SectionHeader
            eyebrow="Templates"
            title="Escolha um modelo para editar"
            description="Filtre por categoria ou busque pelo nome do template. Templates premium dependem do plano atual ou de permissão administrativa."
            action={(
              <Button asChild variant="outline">
                <Link to="/batch">
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                  Criar em lote
                </Link>
              </Button>
            )}
          />

          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_280px] lg:items-end">
                <div className="space-y-2">
                  <Label htmlFor="template-search">Buscar templates</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="template-search"
                      type="search"
                      placeholder="Ex.: promoção, gôndola, açougue..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="text-sm text-muted-foreground lg:text-right" aria-live="polite">
                  {filteredTemplates.length} de {TEMPLATES.length} templates encontrados
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Categorias de templates">
                {categories.map((category) => {
                  const isActive = filter === category;
                  const label = category === "all" ? "Todos" : CATEGORY_LABELS[category];

                  return (
                    <Button
                      key={category}
                      type="button"
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className="shrink-0"
                      aria-pressed={isActive}
                      onClick={() => setFilter(category)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} canUsePremiumTemplates={canUsePremiumTemplates} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <Search className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-foreground">Nenhum template encontrado</p>
                  <p className="text-sm text-muted-foreground">Limpe a busca ou escolha outra categoria.</p>
                </div>
                <Button variant="outline" onClick={() => { setSearch(""); setFilter("all"); }}>
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}

function TemplateCard({ template, canUsePremiumTemplates }: { template: PosterTemplate; canUsePremiumTemplates: boolean }) {
  const isLocked = template.premium && !canUsePremiumTemplates;

  const content = (
      <article className={`relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition ${isLocked ? "opacity-80" : "hover:-translate-y-0.5 hover:border-primary hover:shadow-md"}`}>
        <div
          className="relative flex aspect-[3/4] flex-col items-center justify-center p-4 text-center"
          style={{ background: template.bgColor }}
        >
          {template.premium && (
            <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/80">
              <Lock className="h-3.5 w-3.5" style={{ color: template.accentColor }} aria-hidden="true" />
            </div>
          )}
          <span className="mb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: template.accentColor }}>
            ★ Promoção ★
          </span>
          <span className="mb-2 text-sm font-black leading-tight" style={{ color: template.textColor }}>
            Produto
          </span>
          <span className="text-price text-2xl" style={{ color: template.priceColor }}>
            R$ 9,90
          </span>
        </div>
        <div className="space-y-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="truncate text-sm font-bold text-foreground">{template.name}</h2>
            {template.premium && <Badge variant="outline">Pro</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {template.size} · {CATEGORY_LABELS[template.category]}
          </p>
        </div>
        <div className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 transition-opacity",
          "group-hover:opacity-100 group-focus-visible:opacity-100",
        )}>
          <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm">
            {isLocked ? "Requer Pro" : "Editar template"}
          </span>
        </div>
      </article>
  );

  if (isLocked) {
    return (
      <div className="group block" aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link to={`/editor/${template.id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {content}
    </Link>
  );
}
