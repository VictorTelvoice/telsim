-- TELSIM DUAL-STACK FORWARDING MIGRATION v4.0

-- 1. Expandir Ledger de Usuario para Configuración Dual
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS api_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 2. Motor de Reenvío de Alta Disponibilidad (Fan-out)
CREATE OR REPLACE FUNCTION public.handle_sms_webhook_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    display_code TEXT;
    tg_url TEXT;
    tg_payload TEXT;
    api_payload TEXT;
BEGIN
    -- Obtener toda la configuración de seguridad del usuario
    SELECT api_enabled, api_url, telegram_enabled, telegram_bot_token, telegram_chat_id 
    INTO u_rec
    FROM public.users 
    WHERE id = NEW.user_id;

    display_code := COALESCE(NEW.verification_code, '---');

    -- RAMA A: CUSTOM API (JSON)
    IF u_rec.api_enabled AND u_rec.api_url IS NOT NULL AND u_rec.api_url ~ '^https?://.+' THEN
        api_payload := json_build_object(
            'telsim_event', 'sms.received',
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
    END IF;

    -- RAMA B: TELEGRAM BOT (FORMATTED)
    IF u_rec.telegram_enabled AND u_rec.telegram_bot_token IS NOT NULL AND u_rec.telegram_chat_id IS NOT NULL THEN
        tg_url := 'https://api.telegram.org/bot' || u_rec.telegram_bot_token || '/sendMessage';
        
        -- Branding solicitado: [TELSIM] 🔔 Nuevo SMS: [contenido] - Código: [code]
        tg_payload := json_build_object(
            'chat_id', u_rec.telegram_chat_id,
            'text', '[TELSIM] 🔔 *Nuevo SMS:*' || chr(10) || 
                    NEW.content || chr(10) || 
                    '*Código:* `' || display_code || '`',
            'parse_mode', 'Markdown'
        )::text;

        PERFORM net.http_post(
            url := tg_url,
            body := tg_payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TELSIM BRIDGE CRITICAL: Fallo en el fan-out de reenvío: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asegurar persistencia del Trigger
DROP TRIGGER IF EXISTS on_new_sms_forward ON public.sms_logs;
CREATE TRIGGER on_new_sms_forward
AFTER INSERT ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_sms_webhook_forwarding();