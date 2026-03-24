-- Historial de notificaciones (email y telegram) para admin y perfil de usuario
CREATE TABLE IF NOT EXISTS public.notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'telegram')),
  event text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'error')),
  error_message text,
  content_preview text
);

CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON public.notification_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON public.notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_recipient ON public.notification_history(recipient);
CREATE INDEX IF NOT EXISTS idx_notification_history_channel ON public.notification_history(channel);
CREATE INDEX IF NOT EXISTS idx_notification_history_event ON public.notification_history(event);

COMMENT ON TABLE public.notification_history IS 'Registro de cada envío de notificación (email o telegram), real o test.';
