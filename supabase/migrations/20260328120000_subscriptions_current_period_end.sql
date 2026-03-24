-- Fin de período de facturación actual (Stripe current_period_end), para UI y coherencia con next_billing_date.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

COMMENT ON COLUMN public.subscriptions.current_period_end IS
  'Fin del período de facturación actual en Stripe (ISO). Próximo cobro en active suele coincidir; en trialing usar trial_end.';
