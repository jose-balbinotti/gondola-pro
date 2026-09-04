import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseClientEnv } from "@/lib/env";

const { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY } = getSupabaseClientEnv();
const browserStorage = typeof window !== "undefined" ? window.localStorage : undefined;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: browserStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
