-- TELSIM
-- Fase 4: base financiera (ledger-first)

-- 1) Tabla append-only para impactos financieros (cash/booked/risk/churn/cost)
CREATE TABLE IF NOT EXISTS public.finance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Idempotencia: 1 impacto financiero por evento Stripe
  stripe_event_id text NOT NULL UNIQUE,
  stripe_event_type text,

  finance_event_type text NOT NULL,

  occurred_at timestamptz NOT NULL,

  user_id uuid NULL,
  subscription_id uuid NULL,
  slot_id text NULL,

  plan_name text NULL,
  billing_type text NULL,

  currency text NOT NULL DEFAULT 'USD',

  amount_cents bigint NULL,
  risk_amount_cents bigint NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()

  -- Nota: dejamos CHECKs fuera para evitar romper deploys si ya existe en entornos parciales.
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS finance_events_occurred_at_idx
  ON public.finance_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS finance_events_user_id_occurred_at_idx
  ON public.finance_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS finance_events_subscription_id_idx
  ON public.finance_events (subscription_id);

CREATE INDEX IF NOT EXISTS finance_events_plan_name_occurred_at_idx
  ON public.finance_events (plan_name, occurred_at DESC);

-- 2) Vista agregada para KPIs financieros por período
-- period_date: fecha (sin hora) del "occurred_at"
CREATE OR REPLACE VIEW public.billing_ledger_v AS
SELECT
  (f.occurred_at AT TIME ZONE 'UTC')::date AS period_date,

  -- Cash Revenue: exclusively invoice.payment_succeeded.amount_paid
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0) AS cash_revenue_cents,

  -- Booked Sales (nominal):
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'booked_revenue' THEN f.amount_cents ELSE NULL END), 0) AS booked_sales_cents,

  -- Booked Monthly Equivalent (annual => amount/12):
  COALESCE(SUM(
    CASE
      WHEN f.finance_event_type = 'booked_revenue'
      THEN COALESCE((f.metadata->>'monthly_equivalent_cents')::bigint, 0)
      ELSE NULL
    END
  ), 0) AS booked_monthly_equivalent_cents,

  -- Failed Payments Count + Revenue at Risk:
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'payment_failed_attempt' THEN 1 ELSE NULL END), 0) AS failed_payments_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'payment_failed_attempt' THEN f.risk_amount_cents ELSE NULL END), 0) AS revenue_at_risk_cents,

  -- Churn:
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'churn_event' THEN 1 ELSE NULL END), 0) AS churn_count,

  -- Estimated costs (Fase 4 mínima: si no se implementa, queda 0):
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0) AS estimated_cost_cents

FROM public.finance_events f
GROUP BY (f.occurred_at AT TIME ZONE 'UTC')::date;

-- 3) Estado "actual" (snapshot) para funnel/activos (no time-series)
CREATE OR REPLACE VIEW public.finance_state_current_v AS
WITH subs AS (
  SELECT
    s.*,
    LOWER(COALESCE(s.subscription_status, s.status, '')) AS sub_status_norm
  FROM public.subscriptions s
)
SELECT
  -- Activos:
  COUNT(*) FILTER (WHERE sub_status_norm IN ('active', 'trialing')) AS active_subscriptions_count,

  -- MRR: solo subscription_status/status = 'active' (trialing no cuenta como MRR)
  COALESCE(SUM(
    CASE
      WHEN sub_status_norm = 'active' AND billing_type = 'annual' THEN (amount * 100) / 12
      WHEN sub_status_norm = 'active' AND billing_type IN ('monthly', NULL, '') THEN (amount * 100)
      ELSE 0
    END
  ), 0)::bigint AS mrr_cents,

  -- ARR = MRR * 12
  COALESCE(SUM(
    CASE
      WHEN sub_status_norm = 'active' AND billing_type = 'annual' THEN (amount * 100) / 12
      WHEN sub_status_norm = 'active' AND billing_type IN ('monthly', NULL, '') THEN (amount * 100)
      ELSE 0
    END
  ), 0)::bigint * 12 AS arr_cents,

  -- Funnel counts (solo dentro de subs activas/trialing para evitar "canceled" arrastrando estados):
  COUNT(*) FILTER (WHERE sub_status_norm IN ('active', 'trialing') AND activation_state = 'paid') AS paid_count,
  COUNT(*) FILTER (WHERE sub_status_norm IN ('active', 'trialing') AND activation_state = 'provisioned') AS provisioned_count,
  COUNT(*) FILTER (WHERE sub_status_norm IN ('active', 'trialing') AND activation_state = 'on_air') AS on_air_count,
  COUNT(*) FILTER (WHERE sub_status_norm IN ('active', 'trialing') AND activation_state = 'failed') AS failed_count,

  -- Active SIMs / infraestructura:
  (
    SELECT COUNT(*)
    FROM public.slots sl
    WHERE sl.status = 'ocupado' OR sl.assigned_to IS NOT NULL
  )::bigint AS active_sims_count

FROM subs;

