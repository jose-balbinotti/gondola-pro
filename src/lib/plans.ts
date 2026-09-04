import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

export type PlanRow = Tables<"plans">;
export type UserSubscriptionRow = Tables<"user_subscriptions">;

export interface PlanLimits {
  maxPresets: number | null;
  maxBatchItems: number | null;
  maxExportsPerMonth: number | null;
  premiumTemplates: boolean;
  customFonts: boolean;
  support: string | null;
}

export interface AppPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  limits: PlanLimits;
  features: string[];
  isActive: boolean;
  isPublic: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  source: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  externalReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscriptionWithPlan extends UserSubscription {
  plan: AppPlan | null;
}

type JsonObject = Record<string, Json | undefined>;

function isJsonObject(value: Json): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNumberLimit(limits: JsonObject, key: keyof PlanLimits): number | null {
  const value = limits[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function readBooleanLimit(limits: JsonObject, key: keyof PlanLimits): boolean {
  const value = limits[key];
  return value === true || value === "true";
}

function readStringLimit(limits: JsonObject, key: keyof PlanLimits): string | null {
  const value = limits[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeLimits(value: Json): PlanLimits {
  const limits = isJsonObject(value) ? value : {};

  return {
    maxPresets: readNumberLimit(limits, "maxPresets"),
    maxBatchItems: readNumberLimit(limits, "maxBatchItems"),
    maxExportsPerMonth: readNumberLimit(limits, "maxExportsPerMonth"),
    premiumTemplates: readBooleanLimit(limits, "premiumTemplates"),
    customFonts: readBooleanLimit(limits, "customFonts"),
    support: readStringLimit(limits, "support"),
  };
}

function normalizeFeatures(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function toPlan(row: PlanRow): AppPlan {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    limits: normalizeLimits(row.limits),
    features: normalizeFeatures(row.features),
    isActive: row.is_active,
    isPublic: row.is_public,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSubscription(row: UserSubscriptionRow, plan: AppPlan | null): UserSubscriptionWithPlan {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    source: row.source,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    externalReference: row.external_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    plan,
  };
}

export async function loadActivePlans(): Promise<AppPlan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, key, name, description, price_cents, currency, limits, features, is_active, is_public, display_order, created_at, updated_at")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toPlan);
}

export async function loadAdminPlans(): Promise<AppPlan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, key, name, description, price_cents, currency, limits, features, is_active, is_public, display_order, created_at, updated_at")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toPlan);
}

export async function loadPlanById(planId: string): Promise<AppPlan | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, key, name, description, price_cents, currency, limits, features, is_active, is_public, display_order, created_at, updated_at")
    .eq("id", planId)
    .maybeSingle();

  if (error) throw error;
  return data ? toPlan(data) : null;
}

export async function loadCurrentSubscription(userId: string): Promise<UserSubscriptionWithPlan | null> {
  await supabase.rpc("ensure_user_subscription", { _user_id: userId });

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("id, user_id, plan_id, status, source, current_period_start, current_period_end, cancel_at_period_end, external_reference, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const plan = await loadPlanById(data.plan_id);
  return toSubscription(data, plan);
}

export async function updateUserSubscriptionPlan(targetUserId: string, planKey: string): Promise<void> {
  const { error } = await supabase.rpc("set_user_subscription_plan", {
    _target_user_id: targetUserId,
    _plan_key: planKey,
    _status: "active",
  });

  if (error) throw error;
}

export function planAllowsPremiumTemplates(plan: AppPlan | null | undefined): boolean {
  return Boolean(plan?.limits.premiumTemplates);
}

export function planAllowsCustomFonts(plan: AppPlan | null | undefined): boolean {
  return Boolean(plan?.limits.customFonts);
}

export function getNumericPlanLimit(
  plan: AppPlan | null | undefined,
  key: "maxPresets" | "maxBatchItems" | "maxExportsPerMonth",
  fallback = Number.POSITIVE_INFINITY,
): number {
  const value = plan?.limits[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function formatPlanLimit(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Ilimitado";
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPlanPrice(plan: AppPlan | null | undefined): string {
  if (!plan || plan.priceCents <= 0) return "Sem cobrança";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: plan.currency,
  }).format(plan.priceCents / 100);
}

export function getSubscriptionStatusLabel(status?: string | null): string {
  if (status === "active") return "Ativa";
  if (status === "trialing") return "Teste";
  if (status === "paused") return "Pausada";
  if (status === "canceled") return "Cancelada";
  if (status === "past_due") return "Pendente";
  return "Sem assinatura";
}

export function getSubscriptionSourceLabel(source?: string | null): string {
  if (source === "system") return "Sistema";
  if (source === "manual") return "Manual";
  if (source === "gateway") return "Gateway";
  return "—";
}

export function getPlanActionErrorMessage(message?: string): string {
  if (!message) return "Não foi possível alterar o plano.";
  if (message.includes("not_authorized")) return "Somente super administradores podem alterar planos.";
  if (message.includes("target_user_not_found")) return "Usuário não encontrado.";
  if (message.includes("plan_not_found")) return "Plano não encontrado ou inativo.";
  if (message.includes("invalid_subscription_status")) return "Status de assinatura inválido.";
  return "Não foi possível alterar o plano.";
}
