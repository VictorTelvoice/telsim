-- =============================================================================
-- PRODUCCIÓN: Configuración de Webhooks en Supabase (Telsim -> GoAuth)
-- 
-- Este script replica la lógica del "Webhook Forwarder" local mediante
-- Supabase Edge Functions y Triggers de PostgreSQL.
-- =============================================================================

-- 1. Asegurar que las columnas existen en public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_webhook_url text,
  ADD COLUMN IF NOT EXISTS api_secret_key text,
  ADD COLUMN IF NOT EXISTS webhook_is_active boolean DEFAULT false;

-- 2. Función para disparar la notificación (Edge Function)
-- Debes crear una Edge Function en Supabase llamada 'forward-sms'
-- que reciba el payload, firme con HMAC y haga el POST a GoAuth.

/*
  Ejemplo conceptual del Trigger para llamar a la Edge Function:
*/

CREATE OR REPLACE FUNCTION public.on_sms_received_forward()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
BEGIN
    -- 1. Buscar configuración del usuario dueño del slot
    SELECT u.user_webhook_url, u.api_secret_key, u.webhook_is_active
    INTO u_rec
    FROM public.users u
    JOIN public.slots s ON s.assigned_to = u.id
    WHERE s.slot_id = NEW.slot_id AND u.webhook_is_active = true;

    -- 2. Si hay webhook activo, invocar Edge Function
    IF FOUND AND u_rec.user_webhook_url IS NOT NULL THEN
        PERFORM
          net.http_post(
            url := 'https://<tu-proyecto>.supabase.co/functions/v1/forward-sms',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('vault.service_role_key') -- O usar secret local
            ),
            body := jsonb_build_object(
              'webhook_url', u_rec.user_webhook_url,
              'api_secret_key', u_rec.api_secret_key,
              'sms', jsonb_build_object(
                'id', NEW.id,
                'sender', NEW.sender,
                'content', NEW.content,
                'verification_code', NEW.verification_code,
                'phone_number', (SELECT phone_number FROM public.slots WHERE slot_id = NEW.slot_id)
              )
            )
          );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el Trigger
DROP TRIGGER IF EXISTS tr_on_sms_received_forward ON public.sms_logs;
CREATE TRIGGER tr_on_sms_received_forward
  AFTER INSERT ON public.sms_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.on_sms_received_forward();

-- =============================================================================
-- NOTA: Se recomienda usar la extensión "pg_net" de Supabase para llamadas HTTP
-- desde el Trigger, o usar "Edge Function Triggers" desde la UI de Supabase.
-- =============================================================================
