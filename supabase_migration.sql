-- ==========================================
-- TELSIM BACKEND AUTOMATION v11.0 - FIX REENVÍO
-- ==========================================

-- 1. Asegurar tabla de Auditoría para Depuración
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    slot_id TEXT,
    event_type TEXT DEFAULT 'telegram_forward',
    status TEXT, -- 'success' o 'error'
    error_message TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Función de Reenvío con Lógica de Negocio Estricta
CREATE OR REPLACE FUNCTION public.process_sms_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    s_rec RECORD;
    tg_msg TEXT;
    http_resp_id BIGINT;
    display_code TEXT;
BEGIN
    -- A. Obtener configuración del Dueño (users)
    SELECT telegram_enabled, telegram_token, telegram_chat_id 
    INTO u_rec
    FROM public.users 
    WHERE id = NEW.user_id;

    -- B. Obtener estado del Puerto (slots)
    SELECT forwarding_active INTO s_rec 
    FROM public.slots 
    WHERE port_id = NEW.slot_id;

    -- C. VALIDACIÓN DOBLE CAPA
    -- 1. El usuario debe tener Telegram activado y configurado
    IF u_rec.telegram_enabled IS NOT TRUE OR u_rec.telegram_token IS NULL OR u_rec.telegram_chat_id IS NULL THEN
        RETURN NEW; -- Salir silenciosamente (no configurado globalmente)
    END IF;

    -- 2. El slot específico debe tener el switch activado
    IF s_rec.forwarding_active IS NOT TRUE THEN
        RETURN NEW; -- Salir (notificaciones apagadas para este número)
    END IF;

    -- D. CONSTRUCCIÓN DE MENSAJE (Formato Profesional Markdown)
    display_code := COALESCE(NEW.verification_code, '---');
    
    tg_msg := '[TELSIM] 🔔 *NUEVO MENSAJE*' || chr(10) || 
              '📱 *De:* ' || NEW.sender || chr(10) || 
              '🔑 *Código:* `' || display_code || '`' || chr(10) || 
              '💬 *Texto:* ' || NEW.content;

    -- E. INTENTO DE ENVÍO Y LOGGING
    BEGIN
        SELECT net.http_post(
            url := 'https://api.telegram.org/bot' || u_rec.telegram_token || '/sendMessage',
            body := json_build_object(
                'chat_id', u_rec.telegram_chat_id,
                'text', tg_msg,
                'parse_mode', 'Markdown'
            )::text,
            headers := '{"Content-Type": "application/json"}'::jsonb
        ) INTO http_resp_id;

        -- Registrar éxito en auditoría
        INSERT INTO public.automation_logs (user_id, slot_id, status, payload)
        VALUES (NEW.user_id, NEW.slot_id, 'success', json_build_object('request_id', http_resp_id, 'to_chat', u_rec.telegram_chat_id));

    EXCEPTION WHEN OTHERS THEN
        -- Registrar fallo crítico para depuración del usuario/admin
        INSERT INTO public.automation_logs (user_id, slot_id, status, error_message, payload)
        VALUES (
            NEW.user_id, 
            NEW.slot_id, 
            'error', 
            SQLERRM, 
            json_build_object('token_used', SUBSTRING(u_rec.telegram_token FROM 1 FOR 5) || '...', 'chat_id', u_rec.telegram_chat_id)
        );
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asegurar Trigger activo
DROP TRIGGER IF EXISTS tr_forward_sms ON public.sms_logs;
CREATE TRIGGER tr_forward_sms
AFTER INSERT ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.process_sms_forwarding();

-- 4. Comentario para prueba manual en consola Supabase:
/*
-- TEST MANUAL:
INSERT INTO public.sms_logs (user_id, slot_id, sender, content, verification_code)
VALUES ('ID-DEL-USUARIO', 'PORT-ID-ACTIVO', 'TELSIM_TEST', 'Hola, este mensaje debe llegar a Telegram', '999888');

-- VER RESULTADOS:
SELECT * FROM public.automation_logs ORDER BY created_at DESC LIMIT 5;
*/