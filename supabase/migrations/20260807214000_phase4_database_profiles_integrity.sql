-- Fase 4 — Banco de dados, profiles e integridade
-- Cria a tabela de perfil de usuário, sincroniza com auth.users e adiciona constraints/índices seguros.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.normalize_profile_display_name(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN NULLIF(trim(regexp_replace(COALESCE(_value, ''), '[[:space:]]+', ' ', 'g')), '') IS NULL THEN NULL
    WHEN char_length(NULLIF(trim(regexp_replace(COALESCE(_value, ''), '[[:space:]]+', ' ', 'g')), '')) BETWEEN 2 AND 80
      THEN NULLIF(trim(regexp_replace(COALESCE(_value, ''), '[[:space:]]+', ' ', 'g')), '')
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.normalize_profile_avatar_url(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN NULLIF(trim(COALESCE(_value, '')), '') IS NULL THEN NULL
    WHEN char_length(NULLIF(trim(COALESCE(_value, '')), '')) <= 2048
      THEN NULLIF(trim(COALESCE(_value, '')), '')
    ELSE NULL
  END
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_display_name_length
    CHECK (display_name IS NULL OR char_length(trim(display_name)) BETWEEN 2 AND 80),
  CONSTRAINT profiles_avatar_url_length
    CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 2048),
  CONSTRAINT profiles_status_check
    CHECK (status IN ('active', 'disabled'))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON public.profiles (status);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at
  ON public.profiles (created_at DESC);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.profiles (id, display_name, avatar_url, created_at, updated_at)
SELECT
  u.id,
  public.normalize_profile_display_name(COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')),
  public.normalize_profile_avatar_url(u.raw_user_meta_data ->> 'avatar_url'),
  u.created_at,
  now()
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profile status" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() AND status = 'active');

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND status = 'active');

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, display_name, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;

-- Atualiza o trigger de criação de usuário para manter profile e role base em sincronia.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (id, display_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    public.normalize_profile_display_name(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')),
    public.normalize_profile_avatar_url(NEW.raw_user_meta_data ->> 'avatar_url'),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_user_id
  ON public.user_roles (role, user_id);

ALTER TABLE public.poster_presets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_poster_presets_updated_at ON public.poster_presets;
CREATE TRIGGER set_poster_presets_updated_at
  BEFORE UPDATE ON public.poster_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_poster_presets_user_created_at
  ON public.poster_presets (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_poster_presets_template_id
  ON public.poster_presets (template_id);

DO $$
BEGIN
  ALTER TABLE public.poster_presets
    ADD CONSTRAINT poster_presets_device_id_not_blank
    CHECK (char_length(trim(device_id)) > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.poster_presets
    ADD CONSTRAINT poster_presets_name_not_blank
    CHECK (char_length(trim(name)) > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.poster_presets
    ADD CONSTRAINT poster_presets_template_id_not_blank
    CHECK (char_length(trim(template_id)) > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.poster_presets
    ADD CONSTRAINT poster_presets_paper_size_not_blank
    CHECK (char_length(trim(paper_size)) > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.poster_presets
    ADD CONSTRAINT poster_presets_style_is_object
    CHECK (jsonb_typeof(style) = 'object') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.poster_presets
    ADD CONSTRAINT poster_presets_poster_data_is_object
    CHECK (poster_data IS NULL OR jsonb_typeof(poster_data) = 'object') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_action_not_blank
    CHECK (char_length(trim(action)) > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_entity_type_not_blank
    CHECK (char_length(trim(entity_type)) > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_metadata_is_object
    CHECK (jsonb_typeof(metadata) = 'object') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

REVOKE ALL ON public.poster_presets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poster_presets TO authenticated;

REVOKE ALL ON public.audit_logs FROM anon;
GRANT SELECT ON public.audit_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles
     WHERE id = _user_id
       AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_user(_user_id)
     AND public.has_any_role(_user_id, ARRAY['admin'::public.app_role, 'super_admin'::public.app_role])
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_user(_user_id)
     AND public.has_role(_user_id, 'super_admin'::public.app_role)
$$;

DROP POLICY IF EXISTS "Users can read own presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Users can insert own presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Users can update own presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Users can delete own presets" ON public.poster_presets;

CREATE POLICY "Users can read own presets"
  ON public.poster_presets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user(auth.uid()));

CREATE POLICY "Users can insert own presets"
  ON public.poster_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_user(auth.uid()));

CREATE POLICY "Users can update own presets"
  ON public.poster_presets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_active_user(auth.uid()));

CREATE POLICY "Users can delete own presets"
  ON public.poster_presets
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_user_profile_status(_target_user_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  before_status text;
  after_status text;
  active_admin_count integer;
  active_super_admin_count integer;
BEGIN
  IF actor_id IS NULL OR NOT public.is_super_admin(actor_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF _status NOT IN ('active', 'disabled') THEN
    RAISE EXCEPTION 'invalid_profile_status' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'target_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.profiles (id, display_name, avatar_url, created_at, updated_at)
  SELECT
    u.id,
    public.normalize_profile_display_name(COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')),
    public.normalize_profile_avatar_url(u.raw_user_meta_data ->> 'avatar_url'),
    u.created_at,
    now()
  FROM auth.users AS u
  WHERE u.id = _target_user_id
  ON CONFLICT (id) DO NOTHING;

  SELECT status
    INTO before_status
    FROM public.profiles
   WHERE id = _target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _target_user_id = actor_id AND _status = 'disabled' THEN
    RAISE EXCEPTION 'self_disable_forbidden' USING ERRCODE = '42501';
  END IF;

  IF _status = 'disabled' AND before_status = 'active' THEN
    SELECT count(DISTINCT ur.user_id)
      INTO active_admin_count
      FROM public.user_roles AS ur
      JOIN public.profiles AS p ON p.id = ur.user_id
     WHERE ur.role = 'admin'::public.app_role
       AND p.status = 'active';

    IF public.has_role(_target_user_id, 'admin'::public.app_role) AND active_admin_count <= 1 THEN
      RAISE EXCEPTION 'last_active_admin_disable_forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT count(DISTINCT ur.user_id)
      INTO active_super_admin_count
      FROM public.user_roles AS ur
      JOIN public.profiles AS p ON p.id = ur.user_id
     WHERE ur.role = 'super_admin'::public.app_role
       AND p.status = 'active';

    IF public.has_role(_target_user_id, 'super_admin'::public.app_role) AND active_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'last_active_super_admin_disable_forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.profiles
     SET status = _status
   WHERE id = _target_user_id;

  SELECT status
    INTO after_status
    FROM public.profiles
   WHERE id = _target_user_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id,
    'user_profile_status_updated',
    'profiles',
    _target_user_id,
    jsonb_build_object(
      'before_status', before_status,
      'after_status', after_status
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_active_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_profile_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile_status(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_display_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_profile_avatar_url(text) FROM PUBLIC;
