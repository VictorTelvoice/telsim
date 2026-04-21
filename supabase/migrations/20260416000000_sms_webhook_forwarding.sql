-- ==========================================
-- TELSIM · Migración: SMS a Webhook de Usuario
-- ==========================================

CREATE OR REPLACE FUNCTION public.process_sms_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    v_fwd_active BOOLEAN;
    v_phone_number TEXT;
    v_webhook_payload JSONB;
BEGIN
    -- Obtener configuración del usuario (Telegram y Webhook)
    SELECT 
        telegram_enabled, 
        telegram_token, 
        telegram_chat_id, 
        user_webhook_url, 
        webhook_is_active
    INTO u_rec 
    FROM public.users 
    WHERE id = NEW.user_id;

    -- Obtener datos del slot (número de teléfono y estado de reenvío)
    SELECT phone_number, forwarding_active 
    INTO v_phone_number, v_fwd_active
    FROM public.slots 
    WHERE slot_id = NEW.slot_id;

    -- 1. Reenvío a Telegram (Si está habilitado el bot del usuario)
    IF COALESCE(u_rec.telegram_enabled, FALSE) AND COALESCE(v_fwd_active, FALSE) THEN
        INSERT INTO public.automation_logs (user_id, slot_id, status, payload)
        VALUES (
            NEW.user_id, 
            NEW.slot_id, 
            'queued', 
            json_build_object(
                'token', u_rec.telegram_token,
                'chat_id', u_rec.telegram_chat_id,
                'sender', NEW.sender,
                'code', NEW.verification_code,
                'text', NEW.content
            )
        );
    END IF;

    -- 2. Reenvío a Webhook de Usuario (Si está configurado y activo)
    -- Se envía independientemente de Telegram.
    IF COALESCE(u_rec.webhook_is_active, FALSE) AND u_rec.user_webhook_url IS NOT NULL AND trim(u_rec.user_webhook_url) != '' THEN
        v_webhook_payload := jsonb_build_object(
            'event', 'sms.received',
            'sender', NEW.sender,
            'content', NEW.content,
            'verification_code', NEW.verification_code,
            'service', NEW.service_name,
            'slot_id', NEW.slot_id,
            'phone_number', v_phone_number,
            'received_at', NEW.received_at
        );
        
        -- Invocar función de notificación (internamente usa pg_net para POST asíncrono)
        PERFORM public.notify_user_webhook(NEW.user_id, v_webhook_payload);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.process_sms_forwarding() IS 
'Procesa el reenvío de SMS entrantes tanto a Telegram (vía automation_logs) como a Webhooks de usuario registrados.';
