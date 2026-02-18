-- TELSIM AUTOMATION ENGINE v10.0 - MULTI-LAYER VALIDATION

-- 1. Asegurar columna de control en Slots
ALTER TABLE public.slots 
ADD COLUMN IF NOT EXISTS forwarding_active BOOLEAN DEFAULT FALSE;

-- 2. Motor de Reenvío con doble validación (User Bot + Slot Switch)
CREATE OR REPLACE FUNCTION public.process_sms_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    s_rec RECORD;
    display_code TEXT;
    tg_msg TEXT;
BEGIN
    -- A. Validar estado del Slot (Puerto Físico)
    SELECT forwarding_active INTO s_rec FROM public.slots WHERE port_id = NEW.slot_id;
    
    -- Si el slot tiene el reenvío apagado, abortamos
    IF s_rec IS NULL OR NOT s_rec.forwarding_active THEN
        RETURN NEW;
    END IF;

    -- B. Obtener configuración del dueño
    SELECT api_enabled, api_url, telegram_enabled, telegram_token, telegram_chat_id 
    INTO u_rec
    FROM public.users 
    WHERE id = NEW.user_id;

    display_code := COALESCE(NEW.verification_code, '---');

    -- C. LÓGICA TELEGRAM: Solo si el bot está configurado Y el slot está activo
    IF u_rec.telegram_enabled AND u_rec.telegram_token IS NOT NULL AND u_rec.telegram_chat_id IS NOT NULL THEN
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

    -- D. LÓGICA CUSTOM API (FAN-OUT)
    IF u_rec.api_enabled AND u_rec.api_url IS NOT NULL AND u_rec.api_url ~ '^https?://.+' THEN
        PERFORM net.http_post(
            url := u_rec.api_url,
            body := json_build_object(
                'event', 'sms.received',
                'sender', NEW.sender,
                'content', NEW.content,
                'verification_code', NEW.verification_code,
                'slot_id', NEW.slot_id
            )::text,
            headers := '{"Content-Type": "application/json", "X-Source": "TELSIM-CORE"}'::jsonb
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;