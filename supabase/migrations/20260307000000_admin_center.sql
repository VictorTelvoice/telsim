-- Centro de Mando Telsim: admin_settings, support_tickets, support_messages
-- Admin UID: 8e7bcada-3f7a-482f-93a7-9d0fd4828231

-- 1) Función helper para saber si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = '8e7bcada-3f7a-482f-93a7-9d0fd4828231'::uuid;
$$;

-- 2) Tabla admin_settings (CMS de notificaciones)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage admin_settings" ON public.admin_settings;
CREATE POLICY "Admin can manage admin_settings"
  ON public.admin_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3) Tabla support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text DEFAULT '',
  status text DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own tickets" ON public.support_tickets;
CREATE POLICY "Users can create own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin can update tickets" ON public.support_tickets;
CREATE POLICY "Admin can update tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4) Tabla support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'admin')),
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and admin can view messages" ON public.support_messages;
CREATE POLICY "Users and admin can view messages"
  ON public.support_messages FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can send user messages" ON public.support_messages;
CREATE POLICY "Users can send user messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    sender_type = 'user'
    AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin can send admin messages" ON public.support_messages;
CREATE POLICY "Admin can send admin messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (sender_type = 'admin' AND public.is_admin());

-- 5) Índices
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON public.support_tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
