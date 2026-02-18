-- ==========================================
-- TELSIM BACKEND CORE - HOTFIX TELEGRAM BRIDGE
-- ==========================================

-- 1. Asegurar extensión necesaria para peticiones HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Asegurar que la columna existe en slots
ALTER TABLE public.slots 
ADD COLUMN IF NOT EXISTS forwarding_active BOOLEAN DEFAULT FALSE;

-- 3. Función de Reenvío con Logging y Validación Estricta
CREATE OR REPLACE FUNCTION public.process_sms_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    s_rec RECORD;
    tg_msg TEXT;
    http_resp_id BIGINT;
BEGIN
    -- LOG INICIAL
    RAISE NOTICE 'TELSIM BRIDGE: Procesando nuevo SMS ID % para Slot %', NEW.id, NEW.slot_id;

    -- A. Validar estado del Slot (Switch Individual)
    SELECT forwarding_active INTO s_rec FROM public.slots WHERE port_id = NEW.slot_id;
    
    IF s_rec IS NULL THEN
        RAISE WARNING 'TELSIM ERROR: No se encontró el slot %', NEW.slot_id;
        RETURN NEW;
    END IF;

    IF NOT COALESCE(s_rec.forwarding_active, FALSE) THEN
        RAISE NOTICE 'TELSIM DEBUG: Reenvío omitido. Slot % tiene el switch APAGADO.', NEW.slot_id;
        RETURN NEW;
    END IF;

    -- B. Obtener configuración del usuario (Switch Global)
    SELECT telegram_enabled, telegram_token, telegram_chat_id, api_enabled, api_url 
    INTO u_rec
    FROM public.users 
    WHERE id = NEW.user_id;

    IF NOT FOUND THEN
        RAISE WARNING 'TELSIM ERROR: Usuario % no encontrado en la tabla users.', NEW.user_id;
        RETURN NEW;
    END IF;

    -- C. LÓGICA TELEGRAM: Validación de credenciales
    IF u_rec.telegram_enabled AND u_rec.telegram_token IS NOT NULL AND u_rec.telegram_chat_id IS NOT NULL THEN
        
        tg_msg := '<b>[TELSIM] 🔔 Nuevo SMS Recibido</b>' || chr(10) || 
                  '📱 <b>Línea:</b> ' || NEW.slot_id || chr(10) || 
                  '👤 <b>De:</b> ' || NEW.sender || chr(10) || 
                  '💬 <b>Mensaje:</b> ' || NEW.content || chr(10) || 
                  '🔑 <b>Código:</b> <code>' || COALESCE(NEW.verification_code, '---') || '</code>';

        BEGIN
            SELECT net.http_post(
                url := 'https://api.telegram.org/bot' || u_rec.telegram_token || '/sendMessage',
                body := json_build_object(
                    'chat_id', u_rec.telegram_chat_id,
                    'text', tg_msg,
                    'parse_mode', 'HTML'
                )::text,
                headers := '{"Content-Type": "application/json"}'::jsonb
            ) INTO http_resp_id;
            
            RAISE NOTICE 'TELSIM SUCCESS: SMS enviado a Telegram. Request ID: %', http_resp_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'TELSIM CRITICAL: Fallo al conectar con Telegram API: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TELSIM DEBUG: Telegram no configurado o desactivado para el usuario %', NEW.user_id;
    END IF;

    -- D. LÓGICA CUSTOM API (Si aplica)
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

-- 4. Creación del Trigger (IMPORTANTE: Se ejecuta después de cada insert en sms_logs)
DROP TRIGGER IF EXISTS tr_forward_sms ON public.sms_logs;
CREATE TRIGGER tr_forward_sms
AFTER INSERT ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.process_sms_forwarding();


/* 
   ----------------------------------------------------------
   PRUEBA MANUAL DE BACKEND (Copiar y pegar en SQL Editor)
   ----------------------------------------------------------
   
   -- 1. Primero activa el reenvío para un puerto de prueba:
   UPDATE public.slots SET forwarding_active = true WHERE port_id = 'TU_PORT_ID_AQUI';

   -- 2. Simula la llegada de un SMS (esto disparará el Telegram):
   INSERT INTO public.sms_logs (user_id, slot_id, sender, content, verification_code, is_read)
   VALUES (
     'TU_USER_ID_AQUI', 
     'TU_PORT_ID_AQUI', 
     'TELSIM_TEST', 
     'Este es un mensaje de prueba para el puente de Telegram.', 
     '123456', 
     false
   );
   
   -- 3. Revisa la pestaña "Logs" > "Postgres" en Supabase para ver los RAISE NOTICE.
*/