import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/authorization";
import type { UserProfile } from "@/lib/profiles";
import type { AppPlan, UserSubscriptionWithPlan } from "@/lib/plans";

export type { AppRole, AppPlan, UserProfile, UserSubscriptionWithPlan };

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  subscription: UserSubscriptionWithPlan | null;
  plan: AppPlan | null;
  roles: AppRole[];
  loading: boolean;
  isAuthenticated: boolean;
  isEmailConfirmed: boolean;
  isAccountActive: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refreshProfile: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
