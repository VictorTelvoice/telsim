-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: support_messages (crear si no existe) + user_ratings + RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- Función is_admin (idempotente)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = '8e7bcada-3f7a-482f-93a7-9d0fd4828231'::uuid;
$$;

-- 1) Crear support_messages si no existe
CREATE TABLE IF NOT EXISTS public.support_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'admin')),
  content     text NOT NULL DEFAULT '',
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Agregar user_id si la tabla ya existía sin esa columna
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and admin can view messages" ON public.support_messages;
CREATE POLICY "Users and admin can view messages"
  ON public.support_messages FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send user messages" ON public.support_messages;
CREATE POLICY "Users can send user messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    sender_type = 'user'
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can send admin messages" ON public.support_messages;
CREATE POLICY "Admin can send admin messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (sender_type = 'admin' AND public.is_admin());

-- Backfill user_id desde el ticket asociado
UPDATE public.support_messages sm
SET user_id = st.user_id
FROM public.support_tickets st
WHERE sm.ticket_id = st.id
  AND sm.sender_type = 'user'
  AND sm.user_id IS NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id   ON public.support_messages(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Tabla de calificaciones de usuarios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden insertar su calificacion" ON public.user_ratings;
CREATE POLICY "Usuarios pueden insertar su calificacion"
  ON public.user_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Admin puede leer calificaciones" ON public.user_ratings;
CREATE POLICY "Admin puede leer calificaciones"
  ON public.user_ratings FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id ON public.user_ratings(user_id);
