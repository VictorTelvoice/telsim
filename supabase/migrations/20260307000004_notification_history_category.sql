-- category para auditoría: product_delivery (SMS/producto) vs operational (tests, bienvenida, avisos)
ALTER TABLE public.notification_history
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'operational';

-- Canal sms_product para registro de entrega del producto (SMS)
ALTER TABLE public.notification_history
  DROP CONSTRAINT IF EXISTS notification_history_channel_check;
ALTER TABLE public.notification_history
  ADD CONSTRAINT notification_history_channel_check
  CHECK (channel IN ('email', 'telegram', 'sms_product'));

CREATE INDEX IF NOT EXISTS idx_notification_history_category ON public.notification_history(category);
COMMENT ON COLUMN public.notification_history.category IS 'product_delivery = entrega SMS/producto; operational = tests, emails, avisos.';
