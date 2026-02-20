-- AJUSTE DE INFRAESTRUCTURA TELSIM
-- 1. Añadir columna details para metadatos de activación
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS details JSONB;

-- 2. Desactivar RLS temporalmente para permitir inserciones desde el sistema de cobros
-- Nota: En producción final, se recomienda usar políticas de Service Role.
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 3. Asegurar que la tabla subscriptions soporte el ID de sesión de Stripe
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;