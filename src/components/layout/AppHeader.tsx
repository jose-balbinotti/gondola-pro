import { Link, useLocation } from "react-router-dom";
import { FileSpreadsheet, LayoutDashboard, Shield, Tag, UserCircle } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const APP_NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/batch", label: "Lote CSV", icon: FileSpreadsheet },
  { to: "/profile", label: "Perfil", icon: UserCircle },
];

export function AppHeader() {
  const { user, profile, isAdmin, isSuperAdmin, plan } = useAuth();
  const location = useLocation();
  const displayName = profile?.displayName || user?.email || "Conta";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex min-h-16 flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link to="/dashboard" className="flex items-center gap-2" aria-label="Ir para o dashboard">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Tag className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-black leading-none tracking-tight text-foreground">GôndolaPro</span>
              <span className="text-xs text-muted-foreground">Área de trabalho</span>
            </span>
          </Link>

          <div className="lg:hidden">
            <LogoutButton variant="ghost" size="sm" className="px-2" />
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2" aria-label="Navegação principal da área logada">
          {APP_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <Button
                key={item.to}
                asChild
                size="sm"
                variant={isActive ? "secondary" : "ghost"}
                className={cn("h-9", isActive && "shadow-sm")}
              >
                <Link to={item.to} aria-current={isActive ? "page" : undefined}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </Button>
            );
          })}

          {isAdmin && (
            <Button
              asChild
              size="sm"
              variant={location.pathname === "/admin" ? "secondary" : "ghost"}
              className="h-9"
            >
              <Link to="/admin" aria-current={location.pathname === "/admin" ? "page" : undefined}>
                <Shield className="h-4 w-4" aria-hidden="true" />
                Admin
              </Link>
            </Button>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="text-right">
            <p className="max-w-56 truncate text-sm font-semibold text-foreground" title={displayName}>
              {displayName}
            </p>
            <div className="mt-1 flex justify-end gap-1">
              <Badge variant="outline">{plan?.name ?? "Plano"}</Badge>
              {isSuperAdmin ? (
                <Badge>Super admin</Badge>
              ) : isAdmin ? (
                <Badge variant="secondary">Admin</Badge>
              ) : null}
            </div>
          </div>
          <LogoutButton variant="outline" size="sm" />
        </div>
      </div>
    </header>
  );
}
