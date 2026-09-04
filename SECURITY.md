# Segurança e produção — GôndolaPro

## Variáveis de ambiente

Variáveis permitidas no frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Variáveis que nunca devem entrar no React, no bundle ou em arquivos versionados:

```env
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
WEBHOOK_SECRET=
```

Se alguma chave privilegiada já foi enviada para Git, ZIP, chat ou hospedagem pública, gere uma nova chave no provedor e remova a antiga.

## Supabase Auth

No painel do Supabase, configure as URLs permitidas de autenticação:

```txt
http://localhost:5173/auth/callback
http://localhost:5173/reset-password
https://seu-dominio.com/auth/callback
https://seu-dominio.com/reset-password
```

Ative confirmação de e-mail para produção quando fizer sentido para o produto.

## RLS

Todas as tabelas privadas devem manter RLS ativo. Não use policies genéricas com `USING (true)` em dados de usuário.

Verificação rápida:

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'user_roles', 'audit_logs', 'poster_presets', 'plans', 'user_subscriptions')
ORDER BY tablename;
```

## RPCs sensíveis

Alterações administrativas devem passar por funções seguras no banco. O frontend não deve fazer `insert`, `update` ou `delete` direto em `user_roles`, `plans` ou `user_subscriptions`.

Funções administrativas atuais:

```txt
assign_user_role
revoke_user_role
update_user_profile_status
set_user_subscription_plan
delete_preset_as_admin
```

## Auditoria

A tabela `audit_logs` registra mudanças administrativas e alguns eventos client-side úteis. Não grave senhas, tokens, chaves privadas ou payloads completos de gateway nessa tabela.

## Headers de segurança

O arquivo `public/_headers` adiciona headers para provedores que suportam esse formato, como Netlify e Cloudflare Pages. Em VPS, Nginx, Apache ou Hostinger, configure headers equivalentes no servidor.

## Checklist antes de produção

- Aplicar todas as migrations em ordem.
- Confirmar pelo menos um usuário `admin` e `super_admin` ativo.
- Confirmar que `.env` não foi enviado para o repositório ou ZIP público.
- Confirmar que a service role não aparece no frontend.
- Testar login, cadastro, recuperação e redefinição de senha.
- Testar RLS com usuário anônimo, usuário comum, admin e super admin.
- Testar bloqueio de conta desativada.
- Testar limites de plano.
- Configurar domínio HTTPS.
- Configurar URLs permitidas no Supabase Auth.
- Configurar backups do banco.

## Nunca coloque no frontend

- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- MERCADO_PAGO_ACCESS_TOKEN
- WEBHOOK_SECRET
- chaves privadas, tokens administrativos ou credenciais de banco
