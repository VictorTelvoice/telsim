-- TELSIM AUTOMATION INFRASTRUCTURE MIGRATION v2.0
-- REQUISITO: La extensión 'pg_net' debe estar activa en el Dashboard de Supabase.

-- 1. Asegurar columna de Webhook
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS user_webhook_url TEXT;

-- 2. Función de Reenvío con Lógica de Reintento (Asíncrona)
CREATE OR REPLACE FUNCTION public.handle_sms_webhook_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    target_url TEXT;
BEGIN
    -- 1. Localizar el endpoint del propietario de la línea
    SELECT user_webhook_url INTO target_url 
    FROM public.users 
    WHERE id = NEW.user_id;

    -- 2. Disparo asíncrono con pg_net (Maneja retries automáticamente en background)
    IF target_url IS NOT NULL AND target_url ~ '^https?://.+' THEN
        BEGIN
            PERFORM
                net.http_post(
                    url := target_url,
                    body := json_build_object(
                        'sender', NEW.sender,
                        'content', NEW.content,
                        'verification_code', NEW.verification_code,
                        'slot_id', NEW.slot_id,
                        'received_at', NEW.received_at,
                        'telsim_event', 'sms.received',
                        'retry_enabled', true
                    )::text,
                    headers := '{"Content-Type": "application/json", "X-Telsim-Source": "Cloud-Bridge-v2"}'::jsonb
                );
        EXCEPTION WHEN OTHERS THEN
            -- Logs silenciosos para no bloquear el insert principal de SMS
            RAISE WARNING 'TELSIM BRIDGE: Error encolando webhook para %: %', target_url, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reinicializar Trigger
DROP TRIGGER IF EXISTS on_new_sms_forward ON public.sms_logs;
CREATE TRIGGER on_new_sms_forward
AFTER INSERT ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_sms_webhook_forwarding();