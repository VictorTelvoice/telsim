-- =============================================================================
-- Alinear public.users con migraciones del repo (idempotente en producción)
-- Equivale a:
--   supabase/migrations/20260320000002_users_onboarding_completed.sql
--   supabase/migrations/20260321000000_users_onboarding_step.sql
-- Ejecutar como superusuario / rol con permiso ALTER en public.users
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_step text,
  ADD COLUMN IF NOT EXISTS onboarding_checkout_session_id text;

COMMENT ON COLUMN public.users.onboarding_completed IS 'Estado mínimo de onboarding para redirección post-auth';
COMMENT ON COLUMN public.users.onboarding_step IS 'Último paso: region, summary, payment, processing, activation-success, completed';
COMMENT ON COLUMN public.users.onboarding_checkout_session_id IS 'Último Stripe Checkout session id (cs_...); se limpia al completar onboarding';
