-- TELSIM AUTOMATION BRIDGE v7.0 - HOTFIX SCHEMA

-- 1. Normalización de columnas según requerimiento prioritario
DO $$ 
BEGIN
    -- Renombrar si existe la versión anterior para evitar pérdida de datos
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='telegram_bot_token') THEN
        ALTER TABLE public.users RENAME COLUMN telegram_bot_token TO telegram_token;
    END IF;
END $$;

-- Asegurar que las columnas existan con los nombres exactos solicitados
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS api_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_token TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 2. Motor de Reenvío Actualizado (Fan-out v7.0)
CREATE OR REPLACE FUNCTION public.handle_sms_webhook_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    display_code TEXT;
    tg_endpoint TEXT;
    tg_payload TEXT;
    api_payload TEXT;
    tg_message TEXT;
BEGIN
    -- Búsqueda en el Ledger usando service_role (SECURITY DEFINER)
    SELECT api_enabled, api_url, telegram_enabled, telegram_token, telegram_chat_id 
    INTO u_rec
    FROM public.users 
    WHERE id = NEW.user_id;

    display_code := COALESCE(NEW.verification_code, '---');

    -- CANAL A: CUSTOM API (JSON)
    IF u_rec.api_enabled AND u_rec.api_url IS NOT NULL AND u_rec.api_url ~ '^https?://.+' THEN
        BEGIN
            api_payload := json_build_object(
                'event', 'sms.received',
                'sender', NEW.sender,
                'content', NEW.content,
                'verification_code', NEW.verification_code,
                'received_at', NEW.received_at,
                'slot_id', NEW.slot_id
            )::text;

            PERFORM net.http_post(
                url := u_rec.api_url,
                body := api_payload,
                headers := '{"Content-Type": "application/json"}'::jsonb
            );
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.automation_logs (user_id, event_type, target_url, error_message)
            VALUES (NEW.user_id, 'api_forward', u_rec.api_url, SQLERRM);
        END;
    END IF;

    -- CANAL B: TELEGRAM BOT (Branding [TELSIM])
    IF u_rec.telegram_enabled AND u_rec.telegram_token IS NOT NULL AND u_rec.telegram_chat_id IS NOT NULL THEN
        BEGIN
            tg_endpoint := 'https://api.telegram.org/bot' || u_rec.telegram_token || '/sendMessage';
            
            tg_message := '[TELSIM] 🔔 Nuevo SMS de: ' || NEW.sender || 
                          ' | Código: ' || display_code || 
                          ' | Texto: ' || NEW.content;

            tg_payload := json_build_object(
                'chat_id', u_rec.telegram_chat_id,
                'text', tg_message
            )::text;

            PERFORM net.http_post(
                url := tg_endpoint,
                body := tg_payload,
                headers := '{"Content-Type": "application/json"}'::jsonb
            );
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.automation_logs (user_id, event_type, target_url, error_message)
            VALUES (NEW.user_id, 'telegram_forward', tg_endpoint, SQLERRM);
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asegurar Trigger
DROP TRIGGER IF EXISTS on_new_sms_forward ON public.sms_logs;
CREATE TRIGGER on_new_sms_forward
AFTER INSERT ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_sms_webhook_forwarding();