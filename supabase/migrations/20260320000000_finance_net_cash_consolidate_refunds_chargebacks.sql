-- TELSIM
-- Mini-fase de consolidación financiera (Fase 5.1):
-- - Estandarizar finance_event_type: refund/chargeback
-- - Calcular margen sobre net cash (cash - refunds - chargebacks)

-- 1) Consolidar tipos en eventos existentes (backfill)
UPDATE public.finance_events
SET finance_event_type = 'refund'
WHERE finance_event_type = 'refund_event';

UPDATE public.finance_events
SET finance_event_type = 'chargeback'
WHERE finance_event_type = 'chargeback_event';

-- 2) Vista ledger por día con net cash + margen neto
CREATE OR REPLACE VIEW public.billing_ledger_v AS
SELECT
  (f.occurred_at AT TIME ZONE 'UTC')::date AS period_date,

  -- Gross cash (antes de refunds/chargebacks)
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0) AS cash_revenue_cents,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0) AS gross_cash_revenue_cents,

  -- Booked sales:
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'booked_revenue' THEN f.amount_cents ELSE NULL END), 0) AS booked_sales_cents,
  COALESCE(SUM(
    CASE
      WHEN f.finance_event_type = 'booked_revenue'
      THEN COALESCE((f.metadata->>'monthly_equivalent_cents')::bigint, 0)
      ELSE NULL
    END
  ), 0) AS booked_monthly_equivalent_cents,

  -- Failed payments:
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'payment_failed_attempt' THEN 1 ELSE NULL END), 0) AS failed_payments_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'payment_failed_attempt' THEN f.risk_amount_cents ELSE NULL END), 0) AS revenue_at_risk_cents,

  -- Churn:
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'churn_event' THEN 1 ELSE NULL END), 0) AS churn_count,

  -- Estimated costs:
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0) AS estimated_cost_cents,

  -- Refunds / chargebacks (modelo estándar)
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0) AS refunds_amount_cents,
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'refund' THEN 1 ELSE NULL END), 0) AS refunds_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0) AS chargebacks_amount_cents,
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'chargeback' THEN 1 ELSE NULL END), 0) AS chargebacks_count,

  -- Net cash:
  (
    COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
    - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
    - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
  ) AS net_cash_revenue_cents,

  -- Gross margin sobre net cash:
  (
    (
      COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
      - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
      - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
    )
    - COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0)
  ) AS gross_margin_cents,

  CASE
    WHEN (
      COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
      - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
      - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
    ) = 0 THEN 0
    ELSE ROUND(
      (
        (
          (
            COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
            - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
            - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
          )
          - COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0)
        )::numeric
        /
        (
          COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
          - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
          - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
        )::numeric
      ) * 100,
      2
    )
  END AS gross_margin_pct

FROM public.finance_events f
GROUP BY (f.occurred_at AT TIME ZONE 'UTC')::date;

-- 3) Vista agregada mensual para trends (con margen sobre net cash)
CREATE OR REPLACE VIEW public.finance_trends_monthly_v AS
SELECT
  date_trunc('month', f.occurred_at AT TIME ZONE 'UTC')::date AS period_date,

  COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0) AS cash_revenue_cents,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0) AS gross_cash_revenue_cents,

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

  COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0) AS refunds_amount_cents,
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'refund' THEN 1 ELSE NULL END), 0) AS refunds_count,
  COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0) AS chargebacks_amount_cents,
  COALESCE(COUNT(CASE WHEN f.finance_event_type = 'chargeback' THEN 1 ELSE NULL END), 0) AS chargebacks_count,

  (
    COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
    - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
    - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
  ) AS net_cash_revenue_cents,

  (
    (
      COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
      - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
      - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
    )
    - COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0)
  ) AS gross_margin_cents,

  CASE
    WHEN (
      COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
      - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
      - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
    ) = 0 THEN 0
    ELSE ROUND(
      (
        (
          (
            COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
            - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
            - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
          )
          - COALESCE(SUM(CASE WHEN f.finance_event_type = 'estimated_cost' THEN f.amount_cents ELSE NULL END), 0)
        )::numeric
        /
        (
          COALESCE(SUM(CASE WHEN f.finance_event_type = 'cash_revenue' THEN f.amount_cents ELSE NULL END), 0)
          - COALESCE(SUM(CASE WHEN f.finance_event_type = 'refund' THEN f.amount_cents ELSE NULL END), 0)
          - COALESCE(SUM(CASE WHEN f.finance_event_type = 'chargeback' THEN f.amount_cents ELSE NULL END), 0)
        )::numeric
      ) * 100,
      2
    )
  END AS gross_margin_pct

FROM public.finance_events f
GROUP BY date_trunc('month', f.occurred_at AT TIME ZONE 'UTC')::date;

