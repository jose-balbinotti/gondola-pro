-- Fase 7: hardening geral, auditoria complementar e privilégios explícitos de RPC.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'audit_logs_metadata_max_size'
       AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_metadata_max_size
      CHECK (pg_column_size(metadata) <= 8192) NOT VALID;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_client_security_event(
  _action text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  allowed_actions constant text[] := ARRAY[
    'user_signed_in',
    'user_signed_out',
    'password_reset_requested',
    'password_updated',
    'auth_callback_completed',
    'profile_updated'
  ];
  safe_metadata jsonb := COALESCE(_metadata, '{}'::jsonb);
BEGIN
  IF actor_id IS NULL OR NOT public.is_active_user(actor_id) THEN
    RETURN;
  END IF;

  IF _action IS NULL OR NOT (_action = ANY(allowed_actions)) THEN
    RAISE EXCEPTION 'invalid_security_event' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(safe_metadata) <> 'object' THEN
    RAISE EXCEPTION 'invalid_security_event_metadata' USING ERRCODE = '22023';
  END IF;

  IF pg_column_size(safe_metadata) > 4096 THEN
    RAISE EXCEPTION 'security_event_metadata_too_large' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id,
    _action,
    'auth',
    actor_id,
    safe_metadata - 'password' - 'token' - 'access_token' - 'refresh_token'
  );
END;
$$;

-- Reduz superfície de RPC: execução somente para usuário autenticado quando a função é exposta ao cliente.
REVOKE ALL ON FUNCTION public.log_client_security_event(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_client_security_event(text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.assign_user_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_user_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_user_to_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_user_admin_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_preset_as_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_profile_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_subscription_plan(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_poster_preset(text, text, text, jsonb, text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_subscription(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_plan_limit(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_admin_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_preset_as_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_subscription_plan(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_poster_preset(text, text, text, jsonb, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_limit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT USAGE ON TYPE public.app_role TO authenticated;

-- Funções internas não precisam ser executadas diretamente pelo cliente.
REVOKE ALL ON FUNCTION public.get_default_plan_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_profile_display_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_profile_avatar_url(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Garante explicitamente que tabelas sensíveis não aceitam escrita direta do cliente.
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.plans FROM anon, authenticated;
