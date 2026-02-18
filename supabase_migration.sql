-- TELSIM AUTOMATION ENGINE v9.0 - BACKEND ONLY

-- 1. Asegurar que las columnas de configuración existan en el Ledger
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS api_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_token TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 2. Función de Procesamiento de Reenvío (Engine: process-sms-forwarding)
-- Se usa SECURITY DEFINER para que la función pueda leer tokens de la tabla users 
-- independientemente de las políticas RLS del usuario que inserta el SMS.
CREATE OR REPLACE FUNCTION public.process_sms_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    display_code TEXT;
    tg_msg TEXT;
BEGIN
    -- Localizar al dueño del puerto SIM
    SELECT api_enabled, api_url, telegram_enabled, telegram_token, telegram_chat_id 
    INTO u_rec
    FROM public.users 
    WHERE id = NEW.user_id;

    -- Formatear el código (usar guiones si es nulo)
    display_code := COALESCE(NEW.verification_code, '---');

    -- LÓGICA TELEGRAM: Formato Estricto TELSIM
    IF u_rec.telegram_enabled AND u_rec.telegram_token IS NOT NULL AND u_rec.telegram_chat_id IS NOT NULL THEN
        -- Construcción del mensaje con saltos de línea (chr(10)) y emojis
        tg_msg := '[TELSIM] 🔔 Nuevo SMS' || chr(10) || 
                  '📱 De: ' || NEW.sender || chr(10) || 
                  '💬 Msg: ' || NEW.content || chr(10) || 
                  '🔑 Código: ' || display_code;

        PERFORM net.http_post(
            url := 'https://api.telegram.org/bot' || u_rec.telegram_token || '/sendMessage',
            body := json_build_object(
                'chat_id', u_rec.telegram_chat_id,
                'text', tg_msg,
                'parse_mode', 'HTML'
            )::text,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;

    -- LÓGICA CUSTOM API (FAN-OUT)
    IF u_rec.api_enabled AND u_rec.api_url IS NOT NULL AND u_rec.api_url ~ '^https?://.+' THEN
        PERFORM net.http_post(
            url := u_rec.api_url,
            body := json_build_object(
                'event', 'sms.received',
                'sender', NEW.sender,
                'content', NEW.content,
                'verification_code', NEW.verification_code,
                'timestamp', NEW.received_at,
                'slot_id', NEW.slot_id
            )::text,
            headers := '{"Content-Type": "application/json", "X-Source": "TELSIM-CORE"}'::jsonb
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Activación del Trigger en la tabla sms_logs
-- Se dispara inmediatamente después de cada INSERT exitoso
DROP TRIGGER IF EXISTS tr_auto_forward_sms ON public.sms_logs;
CREATE TRIGGER tr_auto_forward_sms
AFTER INSERT ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.process_sms_forwarding();