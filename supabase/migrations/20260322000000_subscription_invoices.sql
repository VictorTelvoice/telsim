-- Facturas / recibos oficiales Stripe persistidos tras invoice.payment_succeeded (fuente PDF + URLs + desglose fiscal).
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

COMMENT ON TABLE public.subscription_invoices IS 'Snapshot de invoices Stripe (URLs oficiales, montos, impuestos) tras pago exitoso.';
COMMENT ON COLUMN public.subscription_invoices.customer_tax_ids IS 'Tax IDs del cliente asociados a la invoice (Stripe); preparación compliance';
COMMENT ON COLUMN public.subscription_invoices.tax_breakdown IS 'total_tax_amounts de Stripe (sin recalcular impuestos en app)';
