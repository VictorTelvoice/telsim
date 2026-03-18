-- TELSIM
-- Stripe webhook dedupe + idempotency support (Fase 1)

-- 1) Dedupe registry de eventos procesados
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  processed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Evitar duplicados críticos en subscriptions
-- Nota: si ya existen duplicados en la tabla, el index UNIQUE fallará.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_session_id_uq
  ON public.subscriptions (stripe_session_id);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_uq
  ON public.subscriptions (stripe_subscription_id);

