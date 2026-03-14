-- Trigger: al actualizar slots.status a 'error', llamar a la Edge Function notify-sim-error.
-- Requiere: extensión pg_net, tabla private.edge_function_config con notify_sim_error_url y notify_sim_error_secret.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE SCHEMA IF NOT EXISTS private;

-- Configuración para invocar notify-sim-error (solo el trigger lee esta tabla).
-- Después del deploy, insertar/actualizar con la URL de tu proyecto y el secret:
--   INSERT INTO private.edge_function_config (key, value) VALUES
--     ('notify_sim_error_url', 'https://TU_PROJECT_REF.supabase.co/functions/v1/notify-sim-error'),
--     ('notify_sim_error_secret', 'TU_SLOT_ERROR_WEBHOOK_SECRET')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
CREATE TABLE IF NOT EXISTS private.edge_function_config (
  key text PRIMARY KEY,
  value text
);

COMMENT ON TABLE private.edge_function_config IS 'URL y secret para invocar Edge Functions desde triggers (notify_sim_error_url, notify_sim_error_secret).';

-- Función del trigger: si status pasó a 'error', llama a la Edge Function con slot_id y phone_number.
CREATE OR REPLACE FUNCTION private.on_slot_status_error()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  fn_url text;
  fn_secret text;
  req_id bigint;
BEGIN
  -- Solo actuar cuando status pasa a 'error' (comparación case-sensitive como en la app).
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS NULL OR trim(lower(NEW.status)) <> 'error' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO fn_url   FROM private.edge_function_config WHERE key = 'notify_sim_error_url';
  SELECT value INTO fn_secret FROM private.edge_function_config WHERE key = 'notify_sim_error_secret';

  IF fn_url IS NULL OR trim(fn_url) = '' THEN
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := trim(fn_url),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', COALESCE(trim(fn_secret), '')
    ),
    body := jsonb_build_object(
      'slot_id', NEW.slot_id,
      'phone_number', NEW.phone_number,
      'webhook_secret', COALESCE(trim(fn_secret), '')
    )
  ) INTO req_id;

  RETURN NEW;
END;
$$;

-- Trigger: AFTER UPDATE en slots, solo cuando status cambia a 'error'.
DROP TRIGGER IF EXISTS trigger_slot_status_error ON public.slots;
CREATE TRIGGER trigger_slot_status_error
  AFTER UPDATE ON public.slots
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status IS NOT NULL
    AND trim(lower(NEW.status)) = 'error'
  )
  EXECUTE FUNCTION private.on_slot_status_error();

COMMENT ON FUNCTION private.on_slot_status_error() IS 'Llama a la Edge Function notify-sim-error con slot_id y phone_number cuando slots.status pasa a error.';
