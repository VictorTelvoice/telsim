-- =============================================================================
-- public.subscriptions: activation_state + timestamp (idempotente en producción)
-- Equivale a la parte de subscriptions en:
--   supabase/migrations/20260318000006_slots_reservations_activation_state.sql
-- Si el error era "column activation_state does not exist" en SELECT a subscriptions,
-- ejecutar este script. La misma migración también añade columnas en public.slots
-- (reserva checkout); ver archivo de migración completo si las necesitas.
-- =============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS activation_state text NOT NULL DEFAULT 'on_air',
  ADD COLUMN IF NOT EXISTS activation_state_updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_activation_state_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_activation_state_check
      CHECK (activation_state IN ('paid', 'provisioned', 'on_air', 'failed'));
  END IF;
END $$;
