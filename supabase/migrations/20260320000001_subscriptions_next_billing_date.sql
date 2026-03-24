-- Add next_billing_date for customer billing UX
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz;

