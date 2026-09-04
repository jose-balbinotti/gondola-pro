-- Fase 1 — Segurança crítica
-- Corrige isolamento de presets por usuário e substitui alterações diretas de roles por RPCs validadas no banco.

ALTER TABLE public.poster_presets
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_poster_presets_user_id
  ON public.poster_presets (user_id);

DROP POLICY IF EXISTS "Anyone can read presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Anyone can insert presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Anyone can update presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Anyone can delete presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Users can read own presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Users can insert own presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Users can update own presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Users can delete own presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Admins can read all presets" ON public.poster_presets;
DROP POLICY IF EXISTS "Admins can delete any preset" ON public.poster_presets;

ALTER TABLE public.poster_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own presets"
  ON public.poster_presets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own presets"
  ON public.poster_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presets"
  ON public.poster_presets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own presets"
  ON public.poster_presets
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all presets"
  ON public.poster_presets
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any preset"
  ON public.poster_presets
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'target_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_admin_role(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'self_admin_removal_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)
    INTO admin_count
    FROM public.user_roles
   WHERE role = 'admin';

  IF admin_count <= 1 THEN
    RAISE EXCEPTION 'last_admin_removal_forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_roles
   WHERE user_id = _target_user_id
     AND role = 'admin';
END;
$$;

REVOKE ALL ON FUNCTION public.promote_user_to_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_user_admin_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_admin_role(uuid) TO authenticated;
