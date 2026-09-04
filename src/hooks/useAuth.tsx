import { useContext } from "react";
import { AuthContext, type AppRole, type AuthContextValue, type UserProfile } from "@/contexts/auth-context";

export type { AppRole, AuthContextValue, UserProfile };

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
