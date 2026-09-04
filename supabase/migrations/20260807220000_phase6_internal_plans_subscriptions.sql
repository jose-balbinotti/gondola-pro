-- Fase 6 — Planos, assinaturas internas e limites de uso sem gateway de pagamento
-- Estrutura planos e assinaturas manuais para preparar a aplicação para cobrança futura sem processar pagamentos agora.

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_key_format CHECK (key ~ '^[a-z0-9_]+$'),
  CONSTRAINT plans_name_not_blank CHECK (char_length(trim(name)) > 0),
  CONSTRAINT plans_price_cents_non_negative CHECK (price_cents >= 0),
  CONSTRAINT plans_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT plans_limits_is_object CHECK (jsonb_typeof(limits) = 'object'),
  CONSTRAINT plans_features_is_array CHECK (jsonb_typeof(features) = 'array')
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_plans_updated_at ON public.plans;
CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_plans_public_active_order
  ON public.plans (is_public, is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_plans_key
  ON public.plans (key);

INSERT INTO public.plans (key, name, description, price_cents, currency, limits, features, is_active, is_public, display_order)
VALUES
  (
    'free',
    'Gratuito',
    'Plano inicial para testar a plataforma com limites controlados.',
    0,
    'BRL',
    jsonb_build_object(
      'maxPresets', 10,
      'maxBatchItems', 30,
      'maxExportsPerMonth', 50,
      'premiumTemplates', false,
      'customFonts', false,
      'support', 'community'
    ),
    jsonb_build_array('Dashboard protegido', 'Editor de cartazes', 'Exportação em PDF/PNG', 'Lote CSV básico'),
    true,
    true,
    10
  ),
  (
    'pro',
    'Pro',
    'Plano avançado para operação recorrente com mais templates e lotes maiores.',
    0,
    'BRL',
    jsonb_build_object(
      'maxPresets', 200,
      'maxBatchItems', 500,
      'maxExportsPerMonth', 1000,
      'premiumTemplates', true,
      'customFonts', true,
      'support', 'email'
    ),
    jsonb_build_array('Templates premium', 'Lotes maiores', 'Mais presets salvos', 'Fontes personalizadas'),
    true,
    true,
    20
  ),
  (
    'business',
    'Business',
    'Plano interno para equipes ou uso intensivo, preparado para cobrança futura.',
    0,
    'BRL',
    jsonb_build_object(
      'maxPresets', 1000,
      'maxBatchItems', 2000,
      'maxExportsPerMonth', 5000,
      'premiumTemplates', true,
      'customFonts', true,
      'support', 'priority'
    ),
    jsonb_build_array('Uso intensivo', 'Limites ampliados', 'Suporte prioritário', 'Preparado para equipes'),
    true,
    true,
    30
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  is_public = EXCLUDED.is_public,
  display_order = EXCLUDED.display_order,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'manual',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  external_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_user_unique UNIQUE (user_id),
  CONSTRAINT user_subscriptions_status_check CHECK (status IN ('active', 'trialing', 'paused', 'canceled', 'past_due')),
  CONSTRAINT user_subscriptions_source_check CHECK (source IN ('system', 'manual', 'gateway')),
  CONSTRAINT user_subscriptions_period_check CHECK (current_period_end IS NULL OR current_period_end > current_period_start),
  CONSTRAINT user_subscriptions_external_reference_length CHECK (external_reference IS NULL OR char_length(external_reference) <= 255)
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER set_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id
  ON public.user_subscriptions (plan_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
  ON public.user_subscriptions (status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end
  ON public.user_subscriptions (current_period_end);

INSERT INTO public.user_subscriptions (user_id, plan_id, status, source, current_period_start)
SELECT p.id, pl.id, 'active', 'system', now()
  FROM public.profiles AS p
 CROSS JOIN LATERAL (
   SELECT id FROM public.plans WHERE key = 'free' LIMIT 1
 ) AS pl
ON CONFLICT (user_id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read public active plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can read all plans" ON public.plans;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscription" ON public.user_subscriptions;

CREATE POLICY "Anyone can read public active plans"
  ON public.plans
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND is_active = true);

CREATE POLICY "Admins can read all plans"
  ON public.plans
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can read own subscription"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user(auth.uid()));

CREATE POLICY "Admins can read all subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE ALL ON public.plans FROM anon, authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;

REVOKE ALL ON public.user_subscriptions FROM anon, authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;

CREATE OR REPLACE FUNCTION public.get_default_plan_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.plans WHERE key = 'free' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_subscription(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  free_plan_id uuid;
  subscription_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_required' USING ERRCODE = '22023';
  END IF;

  IF actor_id IS NULL OR (actor_id <> _user_id AND NOT public.is_admin(actor_id)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF actor_id = _user_id AND NOT public.is_active_user(actor_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'target_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT public.get_default_plan_id() INTO free_plan_id;
  IF free_plan_id IS NULL THEN
    RAISE EXCEPTION 'default_plan_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status, source, current_period_start)
  VALUES (_user_id, free_plan_id, 'active', 'system', now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id
    INTO subscription_id
    FROM public.user_subscriptions
   WHERE user_id = _user_id;

  RETURN subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_subscription_plan(
  _target_user_id uuid,
  _plan_key text,
  _status text DEFAULT 'active'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_plan record;
  existing_subscription record;
  next_subscription_id uuid;
BEGIN
  IF actor_id IS NULL OR NOT public.is_super_admin(actor_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'target_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _status NOT IN ('active', 'trialing', 'paused', 'canceled', 'past_due') THEN
    RAISE EXCEPTION 'invalid_subscription_status' USING ERRCODE = '22023';
  END IF;

  SELECT id, key, name
    INTO target_plan
    FROM public.plans
   WHERE key = _plan_key
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.id, s.plan_id, p.key AS plan_key, s.status
    INTO existing_subscription
    FROM public.user_subscriptions AS s
    JOIN public.plans AS p ON p.id = s.plan_id
   WHERE s.user_id = _target_user_id;

  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    source,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    external_reference
  ) VALUES (
    _target_user_id,
    target_plan.id,
    _status,
    'manual',
    now(),
    NULL,
    false,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    source = 'manual',
    current_period_start = now(),
    current_period_end = NULL,
    cancel_at_period_end = false,
    external_reference = NULL,
    updated_at = now()
  RETURNING id INTO next_subscription_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id,
    'user_subscription_plan_updated',
    'user_subscriptions',
    next_subscription_id,
    jsonb_build_object(
      'target_user_id', _target_user_id,
      'before_plan_key', existing_subscription.plan_key,
      'before_status', existing_subscription.status,
      'after_plan_key', target_plan.key,
      'after_status', _status,
      'source', 'manual'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_plan_limit(_user_id uuid, _limit_key text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  limit_text text;
BEGIN
  IF actor_id IS NULL OR (actor_id <> _user_id AND NOT public.is_admin(actor_id)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT p.limits ->> _limit_key
    INTO limit_text
    FROM public.user_subscriptions AS s
    JOIN public.plans AS p ON p.id = s.plan_id
   WHERE s.user_id = _user_id;

  IF limit_text IS NULL OR limit_text !~ '^[0-9]+$' THEN
    RETURN NULL;
  END IF;

  RETURN limit_text::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_poster_preset(
  _name text,
  _template_id text,
  _paper_size text,
  _style jsonb,
  _background_image text DEFAULT NULL,
  _poster_data jsonb DEFAULT NULL,
  _device_id text DEFAULT NULL
)
RETURNS public.poster_presets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  max_presets integer;
  current_presets integer;
  inserted_preset public.poster_presets;
BEGIN
  IF actor_id IS NULL OR NOT public.is_active_user(actor_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.ensure_user_subscription(actor_id);

  SELECT public.get_plan_limit(actor_id, 'maxPresets') INTO max_presets;

  SELECT count(*)
    INTO current_presets
    FROM public.poster_presets
   WHERE user_id = actor_id;

  IF max_presets IS NOT NULL AND current_presets >= max_presets THEN
    RAISE EXCEPTION 'plan_limit_exceeded:max_presets' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.poster_presets (
    device_id,
    user_id,
    name,
    template_id,
    paper_size,
    style,
    background_image,
    poster_data
  ) VALUES (
    COALESCE(NULLIF(trim(_device_id), ''), 'unknown'),
    actor_id,
    trim(_name),
    trim(_template_id),
    trim(_paper_size),
    COALESCE(_style, '{}'::jsonb),
    NULLIF(trim(COALESCE(_background_image, '')), ''),
    _poster_data
  )
  RETURNING * INTO inserted_preset;

  RETURN inserted_preset;
END;
$$;

-- Atualiza o trigger de criação de usuário para criar perfil, role base e assinatura gratuita.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
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

  SELECT public.get_default_plan_id() INTO free_plan_id;

  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, source, current_period_start)
    VALUES (NEW.id, free_plan_id, 'active', 'system', now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- A partir desta fase, criação de presets no banco passa pela RPC create_poster_preset para respeitar limites do plano.
REVOKE INSERT ON public.poster_presets FROM authenticated;
GRANT SELECT, UPDATE, DELETE ON public.poster_presets TO authenticated;

REVOKE ALL ON FUNCTION public.get_default_plan_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_subscription(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_subscription_plan(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_plan_limit(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_poster_preset(text, text, text, jsonb, text, jsonb, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ensure_user_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_subscription_plan(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_limit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_poster_preset(text, text, text, jsonb, text, jsonb, text) TO authenticated;
