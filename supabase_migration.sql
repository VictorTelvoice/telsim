-- ==========================================
-- TELSIM BACKEND AUTOMATION v18.0 - DB CLEANUP
-- ==========================================

-- 1. Forzar renombrado de columna si quedó residual en alguna tabla
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='sim_id') THEN
    ALTER TABLE public.subscriptions RENAME COLUMN sim_id TO slot_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sms_logs' AND column_name='sim_id') THEN
    ALTER TABLE public.sms_logs RENAME COLUMN sim_id TO slot_id;
  END IF;
END $$;

-- 2. Actualizar políticas de seguridad (RLS) que pudieran estar rotas
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update their own subscriptions" 
ON public.subscriptions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Trigger de automatización corregido
CREATE OR REPLACE FUNCTION public.process_sms_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    v_fwd_active BOOLEAN;
BEGIN
    -- Obtener perfil
    SELECT telegram_enabled, telegram_token, telegram_chat_id 
    INTO u_rec FROM public.users WHERE id = NEW.user_id;

    -- Obtener estado del puerto (Cambiado a slot_id)
    SELECT forwarding_active INTO v_fwd_active
    FROM public.slots WHERE slot_id = NEW.slot_id;

    IF NOT COALESCE(u_rec.telegram_enabled, FALSE) OR NOT COALESCE(v_fwd_active, FALSE) THEN
        RETURN NEW;
    END IF;

    -- Registro en cola de automatización
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;