import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  formatPlanLimit,
  getPlanActionErrorMessage,
  getSubscriptionSourceLabel,
  getSubscriptionStatusLabel,
  loadAdminPlans,
  updateUserSubscriptionPlan,
  type AppPlan,
} from "@/lib/plans";

interface SubscriptionManagementCardProps {
  search: string;
  isSuperAdmin: boolean;
  onChanged?: () => Promise<void> | void;
}

type ProfileAdminRow = Pick<Tables<"profiles">, "id" | "display_name" | "status" | "created_at">;
type UserSubscriptionRow = Pick<
  Tables<"user_subscriptions">,
  "id" | "user_id" | "plan_id" | "status" | "source" | "current_period_start" | "current_period_end" | "updated_at"
>;

interface SubscriptionAdminRow {
  userId: string;
  displayName: string | null;
  profileStatus: string | null;
  profileCreatedAt: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionSource: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  subscriptionUpdatedAt: string | null;
  plan: AppPlan | null;
}

function formatUserId(userId: string): string {
  return `${userId.slice(0, 12)}...`;
}

function formatDateTime(date?: string | null): string {
  if (!date) return "—";

  return new Date(date).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function matchesSearch(values: Array<string | null | undefined>, search: string): boolean {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return values.some((value) => value?.toLowerCase().includes(normalizedSearch));
}

function getStatusBadgeVariant(status: string | null): "default" | "secondary" | "outline" {
  if (status === "active") return "secondary";
  if (status === "trialing") return "secondary";
  return "outline";
}

export function SubscriptionManagementCard({ search, isSuperAdmin, onChanged }: SubscriptionManagementCardProps) {
  const [plans, setPlans] = useState<AppPlan[]>([]);
  const [rows, setRows] = useState<SubscriptionAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingUserId, setChangingUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [plansData, profilesRes, subscriptionsRes] = await Promise.all([
        loadAdminPlans(),
        supabase
          .from("profiles")
          .select("id, display_name, status, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("user_subscriptions")
          .select("id, user_id, plan_id, status, source, current_period_start, current_period_end, updated_at")
          .order("updated_at", { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (subscriptionsRes.error) throw subscriptionsRes.error;

      const plansById = new Map(plansData.map((plan) => [plan.id, plan]));
      const subscriptionsByUser = new Map((subscriptionsRes.data ?? []).map((item) => [item.user_id, item]));

      const nextRows = (profilesRes.data ?? []).map((profile: ProfileAdminRow) => {
        const subscription = subscriptionsByUser.get(profile.id) as UserSubscriptionRow | undefined;
        const plan = subscription ? plansById.get(subscription.plan_id) ?? null : null;

        return {
          userId: profile.id,
          displayName: profile.display_name,
          profileStatus: profile.status,
          profileCreatedAt: profile.created_at,
          subscriptionId: subscription?.id ?? null,
          subscriptionStatus: subscription?.status ?? null,
          subscriptionSource: subscription?.source ?? null,
          currentPeriodStart: subscription?.current_period_start ?? null,
          currentPeriodEnd: subscription?.current_period_end ?? null,
          subscriptionUpdatedAt: subscription?.updated_at ?? null,
          plan,
        };
      });

      setPlans(plansData);
      setRows(nextRows);
    } catch {
      toast.error("Não foi possível carregar planos e assinaturas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);

  const filteredRows = useMemo(() => rows.filter((row) => matchesSearch([
    row.userId,
    row.displayName,
    row.profileStatus,
    row.plan?.key,
    row.plan?.name,
    row.subscriptionStatus,
    row.subscriptionSource,
  ], search)), [rows, search]);

  const handlePlanChange = async (targetUserId: string, planKey: string) => {
    setChangingUserId(targetUserId);

    try {
      await updateUserSubscriptionPlan(targetUserId, planKey);
      toast.success("Plano atualizado com sucesso.");
      await loadData();
      await onChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      toast.error(getPlanActionErrorMessage(message));
    } finally {
      setChangingUserId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Planos e assinaturas internas</CardTitle>
          <CardDescription>
            Controle manual de planos. Nenhum pagamento é processado nesta fase.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          {activePlans.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-foreground">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
                <Badge variant="outline">{plan.key}</Badge>
              </div>
              <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                <span>Presets: {formatPlanLimit(plan.limits.maxPresets)}</span>
                <span>Lote: {formatPlanLimit(plan.limits.maxBatchItems)} impressões</span>
                <span>Premium: {plan.limits.premiumTemplates ? "sim" : "não"}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead className="text-right">Alterar plano</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => {
                const isChanging = changingUserId === row.userId;

                return (
                  <TableRow key={row.userId}>
                    <TableCell className="font-semibold">{row.displayName || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{formatUserId(row.userId)}</TableCell>
                    <TableCell>
                      <Badge variant={row.profileStatus === "active" ? "secondary" : "outline"}>
                        {row.profileStatus === "active" ? "Ativa" : "Desativada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={row.plan ? "secondary" : "outline"}>{row.plan?.name ?? "Sem plano"}</Badge>
                        <p className="text-xs text-muted-foreground">{row.plan?.key ?? "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={getStatusBadgeVariant(row.subscriptionStatus)}>
                          {getSubscriptionStatusLabel(row.subscriptionStatus)}
                        </Badge>
                        <Badge variant="outline">{getSubscriptionSourceLabel(row.subscriptionSource)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(row.subscriptionUpdatedAt ?? row.profileCreatedAt)}
                    </TableCell>
                    <TableCell className="min-w-[190px] text-right">
                      <Select
                        value={row.plan?.key ?? ""}
                        onValueChange={(planKey) => handlePlanChange(row.userId, planKey)}
                        disabled={!isSuperAdmin || isChanging || activePlans.length === 0}
                      >
                        <SelectTrigger className="ml-auto h-9 w-[180px]">
                          <SelectValue placeholder="Escolher plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {activePlans.map((plan) => (
                            <SelectItem key={plan.key} value={plan.key}>{plan.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {loading ? "Carregando..." : "Nenhuma assinatura encontrada"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
