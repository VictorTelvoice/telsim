-- TELSIM
-- Fase 5: costos estimados + margen bruto + modelo refunds/chargebacks + agregados trends

-- 1) Tasas configurables (cents)
-- Nota: admin_settings usa RLS para admin; aquí insertamos defaults si no existen.
INSERT INTO public.admin_settings (id, content)
VALUES
  ('finance_cost_per_slot_month_cents', '0'),
  ('finance_cost_per_sms_cents', '0')
ON CONFLICT (id) DO NOTHING;

-- 2) Vista agregada por día (con costos/margen y agregados de refunds)
CREATE OR REPLACE VIEW public.billing_ledger_v AS
SELECT
  (f.occurred_at AT TIME ZONE 'UTC')::date AS period_date,

  -- Cash Revenue: exclusivamente invoice.payment_succeeded.amount_paid
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0) AS cash_revenue_cents,

  -- Booked Sales (nominal)
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'booked_revenue' THEN f.amount_cents ELSE NULL END), 0) AS booked_sales_cents,

  -- Booked Monthly Equivalent (annual => amount/12)
  COALESCE(SUM(
    CASE
      WHEN f.finance_event_type = 'booked_revenue'
      THEN COALESCE((f.metadata->>'monthly_equivalent_cents')::bigint, 0)
      ELSE NULL
    END
  ), 0) AS booked_monthly_equivalent_cents,

  -- Failed Payments + Risk
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'payment_failed_attempt' THEN 1 ELSE NULL END), 0) AS failed_payments_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'payment_failed_attempt' THEN f.risk_amount_cents ELSE NULL END), 0) AS revenue_at_risk_cents,

  -- Churn
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'churn_event' THEN 1 ELSE NULL END), 0) AS churn_count,

  -- Estimated costs (generados desde backend)
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0) AS estimated_cost_cents,

  -- Gross margin (cash - estimated_cost)
  (
    COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
    - COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0)
  ) AS gross_margin_cents,

  CASE
    WHEN COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0) = 0 THEN 0
    ELSE ROUND(
      (
        (
          COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
          - COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0)
        )::numeric
        / COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)::numeric
      ) * 100,
      2
    )
  END AS gross_margin_pct,

  -- Refunds / chargebacks (modelo preparado; no se usa para net revenue aún)
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'refund_event' THEN 1 ELSE NULL END), 0) AS refunds_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund_event' THEN f.amount_cents ELSE NULL END), 0) AS refunds_amount_cents,

  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'chargeback_event' THEN 1 ELSE NULL END), 0) AS chargebacks_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback_event' THEN f.amount_cents ELSE NULL END), 0) AS chargebacks_amount_cents

FROM public.finance_events f
GROUP BY (f.occurred_at AT TIME ZONE 'UTC')::date;

-- 3) Agregados mensuales para trends backend (admin y/o futuros clientes)
CREATE OR REPLACE VIEW public.finance_trends_monthly_v AS
SELECT
  date_trunc('month', f.occurred_at AT TIME ZONE 'UTC')::date AS period_date,

  COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0) AS cash_revenue_cents,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'booked_revenue' THEN f.amount_cents ELSE NULL END), 0) AS booked_sales_cents,
  COALESCE(SUM(
    CASE
      WHEN f.finance_event_type = 'booked_revenue'
      THEN COALESCE((f.metadata->>'monthly_equivalent_cents')::bigint, 0)
      ELSE NULL
    END
  ), 0) AS booked_monthly_equivalent_cents,

  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'payment_failed_attempt' THEN 1 ELSE NULL END), 0) AS failed_payments_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'payment_failed_attempt' THEN f.risk_amount_cents ELSE NULL END), 0) AS revenue_at_risk_cents,
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'churn_event' THEN 1 ELSE NULL END), 0) AS churn_count,

  COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0) AS estimated_cost_cents,

  (
    COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
    - COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0)
  ) AS gross_margin_cents,

  CASE
    WHEN COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0) = 0 THEN 0
    ELSE ROUND(
      (
        (
          COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
          - COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0)
        )::numeric
        / COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)::numeric
      ) * 100,
      2
    )
  END AS gross_margin_pct,

  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'refund_event' THEN 1 ELSE NULL END), 0) AS refunds_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund_event' THEN f.amount_cents ELSE NULL END), 0) AS refunds_amount_cents,
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'chargeback_event' THEN 1 ELSE NULL END), 0) AS chargebacks_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback_event' THEN f.amount_cents ELSE NULL END), 0) AS chargebacks_amount_cents

FROM public.finance_events f
GROUP BY date_trunc('month', f.occurred_at AT TIME ZONE 'UTC')::date;

