-- ==========================================
-- TELSIM BACKEND AUTOMATION v15.0 - REVERT TO SMS_LOGS
-- ==========================================

-- 1. Asegurar tabla de Auditoría para ver qué se intenta enviar
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    slot_id TEXT,
    event_type TEXT DEFAULT 'telegram_edge_forward',
    status TEXT, -- 'queued' o 'error'
    error_message TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Función de validación y registro mejorada para sms_logs
CREATE OR REPLACE FUNCTION public.process_sms_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    v_forwarding_active BOOLEAN;
BEGIN
    -- A. Obtener configuración del Usuario
    SELECT telegram_enabled, telegram_token, telegram_chat_id 
    INTO u_rec
    FROM public.users 
    WHERE id = NEW.user_id;

    -- B. Obtener estado del Slot (Puerto físico)
    SELECT forwarding_active INTO v_forwarding_active
    FROM public.slots 
    WHERE port_id = NEW.slot_id;

    -- C. VALIDACIONES DE REGLA DE NEGOCIO
    IF NOT COALESCE(u_rec.telegram_enabled, FALSE) THEN
        RETURN NEW; 
    END IF;

    IF NOT COALESCE(v_forwarding_active, FALSE) THEN
        RETURN NEW;
    END IF;

    -- D. VALIDACIÓN DE CREDENCIALES
    IF u_rec.telegram_token IS NULL OR u_rec.telegram_chat_id IS NULL OR u_rec.telegram_token = '' THEN
        INSERT INTO public.automation_logs (user_id, slot_id, status, error_message)
        VALUES (NEW.user_id, NEW.slot_id, 'error', 'Token o Chat ID no configurados');
        RETURN NEW;
    END IF;

    -- E. REGISTRO DE COLA (AUDITORÍA)
    INSERT INTO public.automation_logs (user_id, slot_id, status, payload)
    VALUES (
        NEW.user_id, 
        NEW.slot_id, 
        'queued', 
        json_build_object(
            'token', u_rec.telegram_token,
            'chat_id', u_rec.telegram_chat_id,
            'sender', NEW.sender,
            'verification_code', NEW.verification_code,
            'content', NEW.content
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-Instalación del Trigger para escuchar de nuevo la tabla SMS_LOGS
DROP TRIGGER IF EXISTS tr_forward_sms ON public.sms_logs;
CREATE TRIGGER tr_forward_sms
AFTER INSERT ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.process_sms_forwarding();

/* 
-- TEST MANUAL EN LA TABLA SMS_LOGS:
INSERT INTO public.sms_logs (user_id, slot_id, sender, content, verification_code)
VALUES ('TU-USER-ID', 'TU-PORT-ID', 'TELSIM_REVERT', 'Mensaje de validación para sms_logs con slot_id.', '999111');

SELECT * FROM public.automation_logs ORDER BY created_at DESC LIMIT 5;
*/