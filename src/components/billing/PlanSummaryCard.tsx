import type { ReactNode } from "react";
import { CheckCircle2, CreditCard, FileText, Layers, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppPlan, UserSubscriptionWithPlan } from "@/lib/plans";
import {
  formatPlanLimit,
  formatPlanPrice,
  getSubscriptionSourceLabel,
  getSubscriptionStatusLabel,
} from "@/lib/plans";

interface PlanSummaryCardProps {
  plan: AppPlan | null;
  subscription: UserSubscriptionWithPlan | null;
  action?: ReactNode;
}

export function PlanSummaryCard({ plan, subscription, action }: PlanSummaryCardProps) {
  const limits = plan?.limits;

  return (
    <Card className="border-primary/20 bg-background/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
          Plano atual
        </CardTitle>
        <CardDescription>
          Planos internos ativos, sem cobrança automática nesta fase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assinatura</p>
              <p className="mt-1 text-2xl font-black text-foreground">{plan?.name ?? "Sem plano"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{plan ? formatPlanPrice(plan) : "Plano ainda não carregado"}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant={subscription?.status === "active" ? "secondary" : "outline"}>
                {getSubscriptionStatusLabel(subscription?.status)}
              </Badge>
              <Badge variant="outline">{getSubscriptionSourceLabel(subscription?.source)}</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <PlanLimitItem icon={<FileText className="h-4 w-4" />} label="Presets" value={formatPlanLimit(limits?.maxPresets)} />
          <PlanLimitItem icon={<Layers className="h-4 w-4" />} label="Itens por lote" value={formatPlanLimit(limits?.maxBatchItems)} />
          <PlanLimitItem
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Templates premium"
            value={limits?.premiumTemplates ? "Liberado" : "Bloqueado"}
          />
          <PlanLimitItem
            icon={<LockKeyhole className="h-4 w-4" />}
            label="Fontes personalizadas"
            value={limits?.customFonts ? "Liberado" : "Bloqueado"}
          />
        </div>

        {action}
      </CardContent>
    </Card>
  );
}

function PlanLimitItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 p-3">
      <span className="text-primary" aria-hidden="true">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
