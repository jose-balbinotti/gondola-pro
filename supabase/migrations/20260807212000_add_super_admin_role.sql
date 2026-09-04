-- Fase 3 — Autorização
-- Adiciona o papel super_admin ao enum de roles.
-- Mantido separado da migration que usa o novo valor para evitar problemas transacionais do PostgreSQL ao usar enum recém-adicionado.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
