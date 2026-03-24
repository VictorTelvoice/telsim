-- TELSIM
-- Fase 3: trazabilidad/dedupe de notificaciones in-app disparadas desde webhooks

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS source_stripe_event_id text,
  ADD COLUMN IF NOT EXISTS source_notification_key text;

-- Dedupe: si se intenta insertar la misma "notificación lógica" para el mismo webhook event,
-- evitamos duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_source_stripe_event_key_uq
  ON public.notifications (user_id, source_stripe_event_id, source_notification_key)
  WHERE source_stripe_event_id IS NOT NULL AND source_notification_key IS NOT NULL;

