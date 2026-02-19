-- ==========================================
-- TELSIM BACKEND AUTOMATION v14.0 - INBOX_SMS SYNC
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

-- 2. Función de validación y registro (Sin usar pg_net)
-- Esta función prepara los datos. El envío real se hace vía "Database Webhooks"
-- configurados en la UI de Supabase apuntando a la Edge Function.
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

    -- B. Obtener estado del Slot
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
    -- Este registro confirma que el SMS pasó las reglas y está listo para que el Webhook lo tome.
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

    -- NOTA PARA EL USUARIO:
    -- Como pg_net no está disponible, ahora debes ir a:
    -- Database -> Webhooks -> Create New Webhook
    -- Name: "Forward to Edge"
    -- Table: "automation_logs"
    -- Events: "INSERT"
    -- Type: "HTTP Request" (POST)
    -- URL: "https://blujavukpveehdkpwfsq.supabase.co/functions/v1/telegram-forwarder"
    -- Header: apikey = [TU_ANON_KEY]
    -- Body: Usa el payload de la fila insertada.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-Instalación del Trigger para escuchar la nueva tabla INBOX_SMS
DROP TRIGGER IF EXISTS tr_forward_sms ON public.inbox_sms;
CREATE TRIGGER tr_forward_sms
AFTER INSERT ON public.inbox_sms
FOR EACH ROW
EXECUTE FUNCTION public.process_sms_forwarding();

/* 
-- TEST MANUAL EN LA NUEVA TABLA:
INSERT INTO public.inbox_sms (user_id, slot_id, sender, content, verification_code)
VALUES ('TU-USER-ID', 'TU-PORT-ID', 'TELSIM_TEST', 'Mensaje de validación para inbox_sms.', '777888');

SELECT * FROM public.automation_logs ORDER BY created_at DESC LIMIT 5;
*/