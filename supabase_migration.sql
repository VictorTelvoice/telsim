
-- ==========================================
-- TELSIM BACKEND AUTOMATION v19.0 - HISTORY ENABLED
-- ==========================================

-- 1. Remover restricción de unicidad si existe para permitir múltiples registros por slot (Historial)
DO $$ 
BEGIN 
  -- Intentar encontrar el nombre de la restricción UNIQUE en slot_id si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='subscriptions' AND constraint_type='UNIQUE'
  ) THEN
    -- Buscamos el nombre exacto de la constraint para borrarla
    EXECUTE (
      SELECT 'ALTER TABLE public.subscriptions DROP CONSTRAINT ' || quote_ident(constraint_name)
      FROM information_schema.constraint_column_usage 
      WHERE table_name = 'subscriptions' AND column_name = 'slot_id'
      LIMIT 1
    );
  END IF;
END $$;

-- 2. Asegurar que las políticas RLS permitan ver el historial
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Trigger de automatización (Asegurar que use el slot_id correcto del mensaje)
CREATE OR REPLACE FUNCTION public.process_sms_forwarding()
RETURNS TRIGGER AS $$
DECLARE
    u_rec RECORD;
    v_fwd_active BOOLEAN;
BEGIN
    SELECT telegram_enabled, telegram_token, telegram_chat_id 
    INTO u_rec FROM public.users WHERE id = NEW.user_id;

    SELECT forwarding_active INTO v_fwd_active
    FROM public.slots WHERE slot_id = NEW.slot_id;

    IF NOT COALESCE(u_rec.telegram_enabled, FALSE) OR NOT COALESCE(v_fwd_active, FALSE) THEN
        RETURN NEW;
    END IF;

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
