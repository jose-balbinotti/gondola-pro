-- Fase 3 — Autorização e auditoria administrativa
-- Centraliza validações de roles no banco, adiciona auditoria e restringe mudanças sensíveis a super_admin.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = _user_id
       AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = _user_id
       AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(_user_id, ARRAY['admin'::public.app_role, 'super_admin'::public.app_role])
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin'::public.app_role)
$$;

-- Garante que admins existentes continuem com capacidade administrativa após a separação entre admin e super_admin.
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::public.app_role
  FROM public.user_roles
 WHERE role = 'admin'::public.app_role
ON CONFLICT (user_id, role) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id
  ON public.audit_logs (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can update audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can delete audit logs" ON public.audit_logs;

CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Recria policies de user_roles para leitura controlada e sem escrita direta pelo cliente.
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Atualiza policies administrativas de presets para reconhecer admin e super_admin.
DROP POLICY IF EXISTS "Admins can read all presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Admins can delete any preset" ON public.poster_presets;

CREATE POLICY "Admins can read all presets"
  ON public.poster_presets
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete any preset"
  ON public.poster_presets
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.assign_user_role(_target_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  before_roles text[];
  after_roles text[];
BEGIN
  IF actor_id IS NULL OR NOT public.is_super_admin(actor_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'target_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(role::text ORDER BY role::text), ARRAY[]::text[])
    INTO before_roles
    FROM public.user_roles
   WHERE user_id = _target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'super_admin'::public.app_role THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT COALESCE(array_agg(role::text ORDER BY role::text), ARRAY[]::text[])
    INTO after_roles
    FROM public.user_roles
   WHERE user_id = _target_user_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id,
    'user_role_assigned',
    'user_roles',
    _target_user_id,
    jsonb_build_object(
      'role', _role::text,
      'before_roles', before_roles,
      'after_roles', after_roles
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_role(_target_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  admin_count integer;
  super_admin_count integer;
  before_roles text[];
  after_roles text[];
BEGIN
  IF actor_id IS NULL OR NOT public.is_super_admin(actor_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'target_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _role = 'user'::public.app_role THEN
    RAISE EXCEPTION 'base_role_removal_forbidden' USING ERRCODE = '42501';
  END IF;

  IF _target_user_id = actor_id AND _role IN ('admin'::public.app_role, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'self_admin_removal_forbidden' USING ERRCODE = '42501';
  END IF;

  IF _role = 'admin'::public.app_role AND public.has_role(_target_user_id, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required_for_super_admin' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)
    INTO admin_count
    FROM public.user_roles
   WHERE role = 'admin'::public.app_role;

  IF _role = 'admin'::public.app_role AND admin_count <= 1 THEN
    RAISE EXCEPTION 'last_admin_removal_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)
    INTO super_admin_count
    FROM public.user_roles
   WHERE role = 'super_admin'::public.app_role;

  IF _role = 'super_admin'::public.app_role AND super_admin_count <= 1 THEN
    RAISE EXCEPTION 'last_super_admin_removal_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(role::text ORDER BY role::text), ARRAY[]::text[])
    INTO before_roles
    FROM public.user_roles
   WHERE user_id = _target_user_id;

  DELETE FROM public.user_roles
   WHERE user_id = _target_user_id
     AND role = _role;

  SELECT COALESCE(array_agg(role::text ORDER BY role::text), ARRAY[]::text[])
    INTO after_roles
    FROM public.user_roles
   WHERE user_id = _target_user_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id,
    'user_role_revoked',
    'user_roles',
    _target_user_id,
    jsonb_build_object(
      'role', _role::text,
      'before_roles', before_roles,
      'after_roles', after_roles
    )
  );
END;
$$;



CREATE OR REPLACE FUNCTION public.delete_preset_as_admin(_preset_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  preset_record record;
BEGIN
  IF actor_id IS NULL OR NOT public.is_admin(actor_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT id, name, template_id, paper_size, user_id
    INTO preset_record
    FROM public.poster_presets
   WHERE id = _preset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'preset_not_found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.poster_presets
   WHERE id = _preset_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id,
    'poster_preset_deleted',
    'poster_presets',
    _preset_id,
    jsonb_build_object(
      'name', preset_record.name,
      'template_id', preset_record.template_id,
      'paper_size', preset_record.paper_size,
      'owner_user_id', preset_record.user_id
    )
  );
END;
$$;

-- Mantém os RPCs antigos como wrappers compatíveis, agora com a validação mais forte de super_admin.
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assign_user_role(_target_user_id, 'admin'::public.app_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_admin_role(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.revoke_user_role(_target_user_id, 'admin'::public.app_role);
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_user_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_user_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_preset_as_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_user_to_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_user_admin_role(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_preset_as_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_admin_role(uuid) TO authenticated;
