-- =============================================================================
-- Producción: esquema mínimo para invoice.payment_succeeded (Stripe webhook)
-- + alineación de subscriptions con el resto de api/webhooks/stripe.ts
--
-- Idempotente: IF NOT EXISTS / bloques DO para constraints
-- Referencias en repo:
--   supabase/migrations/20260320000001_subscriptions_next_billing_date.sql
--   supabase/migrations/20260318000006_slots_reservations_activation_state.sql
--   supabase/migrations/20260322000000_subscription_invoices.sql
--
-- Nota: si public.subscription_invoices ya existe sin UNIQUE(stripe_invoice_id),
--       el upsert del webhook fallará hasta añadir esa unicidad (índice único).
-- =============================================================================

-- 1) subscriptions.next_billing_date (UPDATE en fase next_billing_update)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz;

-- 2) subscriptions.activation_state (NO lo usa invoice.payment_succeeded;
--    sí checkout.session.completed y otros SELECT/UPDATE en stripe.ts)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS activation_state text,
  ADD COLUMN IF NOT EXISTS activation_state_updated_at timestamptz;

UPDATE public.subscriptions
SET
  activation_state = COALESCE(activation_state, 'on_air'),
  activation_state_updated_at = COALESCE(activation_state_updated_at, now())
WHERE activation_state IS NULL
   OR activation_state_updated_at IS NULL;

ALTER TABLE public.subscriptions
  ALTER COLUMN activation_state SET DEFAULT 'on_air',
  ALTER COLUMN activation_state SET NOT NULL,
  ALTER COLUMN activation_state_updated_at SET DEFAULT now(),
  ALTER COLUMN activation_state_updated_at SET NOT NULL;

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

-- 3) subscription_invoices (upsert persistSubscriptionInvoiceFromWebhook)
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions (id) ON DELETE SET NULL,
  stripe_subscription_id text,
  billing_reason text,
  invoice_pdf text,
  hosted_invoice_url text,
  receipt_url text,
  amount_paid_cents bigint NOT NULL DEFAULT 0,
  subtotal_cents bigint,
  tax_cents bigint,
  total_cents bigint,
  currency text NOT NULL DEFAULT 'usd',
  customer_tax_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_billing_at timestamptz,
  period_end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_invoices_user_id_created_idx
  ON public.subscription_invoices (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS subscription_invoices_subscription_id_idx
  ON public.subscription_invoices (subscription_id);

-- Tabla legada sin UNIQUE en stripe_invoice_id: índice único idempotente (solo si falta).
DO $$
DECLARE
  has_unique boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
    WHERE i.indrelid = 'public.subscription_invoices'::regclass
      AND i.indisunique
      AND a.attname = 'stripe_invoice_id'
      AND i.indnatts = 1
  ) INTO has_unique;

  IF NOT has_unique THEN
    EXECUTE
      'CREATE UNIQUE INDEX IF NOT EXISTS subscription_invoices_stripe_invoice_id_uidx
       ON public.subscription_invoices (stripe_invoice_id)';
  END IF;
END $$;
