-- Estado Stripe en texto (paridad con API); opcional si la columna ya existe en producción.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS subscription_status text;

COMMENT ON COLUMN public.subscriptions.subscription_status IS
  'Estado de la suscripción en Stripe (active, trialing, past_due, …). Sincronizado vía webhooks o admin-sync-subscriptions-from-stripe.';
