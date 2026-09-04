import type { Enums } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;

export const ROLE_ORDER: Record<AppRole, number> = {
  super_admin: 0,
  admin: 1,
  user: 2,
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  user: "Usuário",
};

export function hasRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

export function isAdminRole(roles: AppRole[]): boolean {
  return hasRole(roles, "admin") || hasRole(roles, "super_admin");
}

export function isSuperAdminRole(roles: AppRole[]): boolean {
  return hasRole(roles, "super_admin");
}

export function sortRoles(roles: AppRole[]): AppRole[] {
  return [...roles].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);
}
