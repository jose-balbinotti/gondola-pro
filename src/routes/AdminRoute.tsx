import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useAuth } from "@/hooks/useAuth";

function DisabledAccountMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-foreground">Conta desativada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta administrativa está desativada e não pode acessar esta área.
        </p>
        <div className="mt-4 flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAccountActive, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Validando permissões...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!isAccountActive) {
    return <DisabledAccountMessage />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
