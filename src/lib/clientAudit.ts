import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ClientSecurityEvent =
  | "user_signed_in"
  | "user_signed_out"
  | "password_reset_requested"
  | "password_updated"
  | "auth_callback_completed"
  | "profile_updated";

export async function logClientSecurityEvent(
  action: ClientSecurityEvent,
  metadata: Record<string, Json | undefined> = {},
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    await supabase.rpc("log_client_security_event", {
      _action: action,
      _metadata: metadata,
    });
  } catch {
    // Eventos de auditoria client-side são complementares. Falha de log não deve bloquear login/logout.
  }
}
