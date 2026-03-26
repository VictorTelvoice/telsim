-- Landing contact leads

CREATE TABLE IF NOT EXISTS public.contact_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  company text,
  email text NOT NULL,
  message text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'landing',
  language text NOT NULL DEFAULT 'es',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  resend_email_id text,
  email_sent_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_leads_created_at
  ON public.contact_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_leads_email
  ON public.contact_leads(email);

CREATE INDEX IF NOT EXISTS idx_contact_leads_status
  ON public.contact_leads(status);

ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view contact leads" ON public.contact_leads;
CREATE POLICY "Admin can view contact leads"
  ON public.contact_leads
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can update contact leads" ON public.contact_leads;
CREATE POLICY "Admin can update contact leads"
  ON public.contact_leads
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_contact_leads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_leads_updated_at ON public.contact_leads;
CREATE TRIGGER trg_contact_leads_updated_at
  BEFORE UPDATE ON public.contact_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_leads_updated_at();
