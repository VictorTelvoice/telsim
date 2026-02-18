-- TELSIM AUTOMATION INFRASTRUCTURE MIGRATION

-- 1. Añadir columna de Webhook al perfil de usuario
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS user_webhook_url TEXT;

-- 2. Función para disparar el Webhook (The Bridge)
-- Nota: Requiere la extensión 'http' activa en Supabase
CREATE OR REPLACE FUNCTION public.handle_sms_webhook_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    target_url TEXT;
BEGIN
    -- Obtener la URL del webhook del dueño de la línea
    SELECT user_webhook_url INTO target_url 
    FROM public.users 
    WHERE id = NEW.user_id;

    -- Si el usuario tiene una URL configurada, enviamos el POST
    IF target_url IS NOT NULL AND target_url != '' THEN
        PERFORM
            net.http_post(
                url := target_url,
                body := json_build_object(
                    'sender', NEW.sender,
                    'content', NEW.content,
                    'verification_code', NEW.verification_code,
                    'slot_id', NEW.slot_id,
                    'received_at', NEW.received_at
                )::text,
                headers := '{"Content-Type": "application/json"}'::jsonb
            );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger de activación automática
DROP TRIGGER IF EXISTS on_new_sms_forward TO public.sms_logs;
CREATE TRIGGER on_new_sms_forward
AFTER INSERT ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_sms_webhook_forwarding();