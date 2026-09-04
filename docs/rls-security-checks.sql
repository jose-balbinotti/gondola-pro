-- Consultas de verificação pós-migration. Execute manualmente no SQL Editor para auditar o estado geral.

-- 1) Tabelas esperadas e RLS ativo.
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'user_roles', 'audit_logs', 'poster_presets', 'plans', 'user_subscriptions')
ORDER BY tablename;

-- 2) Policies cadastradas.
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3) Usuários sem profile, role base ou assinatura.
SELECT
  u.id,
  u.email,
  CASE WHEN p.id IS NULL THEN 'sem profile' ELSE 'ok' END AS profile_status,
  CASE WHEN ur.user_id IS NULL THEN 'sem role' ELSE 'ok' END AS role_status,
  CASE WHEN us.user_id IS NULL THEN 'sem assinatura' ELSE 'ok' END AS subscription_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'user'::public.app_role
LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
WHERE p.id IS NULL
   OR ur.user_id IS NULL
   OR us.user_id IS NULL;

-- 4) Admins ativos.
SELECT
  u.email,
  p.status,
  array_agg(ur.role ORDER BY ur.role) AS roles
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
GROUP BY u.email, p.status
ORDER BY u.email;

-- 5) Funções expostas a anon que devem ser revisadas.
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS security_definer,
  array_agg(r.rolname ORDER BY r.rolname) AS executable_by
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON has_function_privilege(r.oid, p.oid, 'EXECUTE')
WHERE n.nspname = 'public'
  AND r.rolname IN ('anon', 'authenticated')
GROUP BY n.nspname, p.proname, p.oid, p.prosecdef
ORDER BY p.proname;
