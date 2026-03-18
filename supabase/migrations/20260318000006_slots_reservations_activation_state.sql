-- TELSIM
-- Fase 2: reserva de slot (checkout) + estado operativo de activación

-- Slots: reserva previa al checkout
ALTER TABLE public.slots
  ADD COLUMN IF NOT EXISTS reservation_token text,
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS reservation_user_id uuid,
  ADD COLUMN IF NOT EXISTS reservation_stripe_session_id text;

-- Subscriptions: estado operativo explícito (paid/provisioned/on_air/failed)
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

