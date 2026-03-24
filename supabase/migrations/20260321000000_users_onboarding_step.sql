-- Paso actual del onboarding + contexto mínimo para reanudar processing / activation-success tras login
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_step text,
  ADD COLUMN IF NOT EXISTS onboarding_checkout_session_id text;

COMMENT ON COLUMN public.users.onboarding_step IS 'Último paso significativo: region, summary, payment, processing, activation-success, completed';
COMMENT ON COLUMN public.users.onboarding_checkout_session_id IS 'Último Stripe Checkout session id (cs_...) asociado al flujo; se limpia al completar onboarding';
