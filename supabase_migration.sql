-- TELSIM ADVANCED AUTOMATION BRIDGE v6.0

-- 1. Tabla de Telemetría para errores de reenvío
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'api_forward' o 'telegram_forward'
    target_url TEXT,
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Motor de Reenvío de Alta Disponibilidad (Fan-out con aislamiento de errores)
CREATE OR REPLACE FUNCTION public.handle_sms_webhook_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    display_code TEXT;
    tg_endpoint TEXT;
    tg_payload TEXT;
    api_payload TEXT;
    tg_message TEXT;
    http_resp record;
BEGIN
    -- Cargar configuración del Ledger (service_role implicito por SECURITY DEFINER)
    SELECT api_enabled, api_url, telegram_enabled, telegram_bot_token, telegram_chat_id 
    INTO u_rec
    FROM public.users 
    WHERE id = NEW.user_id;

    display_code := COALESCE(NEW.verification_code, '---');

    -- CANAL A: CUSTOM API (Aislamiento mediante bloque anidado)
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
                headers := '{"Content-Type": "application/json", "X-Telsim-Source": "Dual-Bridge-API"}'::jsonb
            );
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.automation_logs (user_id, event_type, target_url, error_message)
            VALUES (NEW.user_id, 'api_forward', u_rec.api_url, SQLERRM);
        END;
    END IF;

    -- CANAL B: TELEGRAM BOT (Formato estrictamente solicitado)
    -- Estructura: [TELSIM] 🔔 Nuevo SMS de: {{sender}} | Código: {{verification_code}} | Texto: {{content}}
    IF u_rec.telegram_enabled AND u_rec.telegram_bot_token IS NOT NULL AND u_rec.telegram_chat_id IS NOT NULL THEN
        BEGIN
            tg_endpoint := 'https://api.telegram.org/bot' || u_rec.telegram_bot_token || '/sendMessage';
            
            tg_message := '[TELSIM] 🔔 Nuevo SMS de: ' || NEW.sender || 
                          ' | Código: ' || display_code || 
                          ' | Texto: ' || NEW.content;

            tg_payload := json_build_object(
                'chat_id', u_rec.telegram_chat_id,
                'text', tg_message,
                'parse_mode', 'HTML'
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

-- 3. Asegurar persistencia del Trigger en la tabla sms_logs
DROP TRIGGER IF EXISTS on_new_sms_forward ON public.sms_logs;
CREATE TRIGGER on_new_sms_forward
AFTER INSERT ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_sms_webhook_forwarding();