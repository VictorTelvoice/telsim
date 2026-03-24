-- metadata opcional para auditoría (slot_id, phone_number en SMS/producto)
ALTER TABLE public.notification_history
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_notification_history_metadata ON public.notification_history USING gin (metadata);
COMMENT ON COLUMN public.notification_history.metadata IS 'slot_id, phone_number u otros datos para SMS/producto.';
