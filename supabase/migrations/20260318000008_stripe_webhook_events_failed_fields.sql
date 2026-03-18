-- TELSIM
-- Fase 3: soporte de estado failed/error para reintentos seguros

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS failed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS error_message text NULL;

