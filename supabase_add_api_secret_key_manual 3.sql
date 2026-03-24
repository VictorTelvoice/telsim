-- ==========================================
-- TELSIM · Añadir api_secret_key y RLS (ejecutar en Supabase SQL Editor)
-- ==========================================
-- Copia y pega este script en: Supabase Dashboard → SQL Editor → New query → Run
-- Si ya tienes políticas RLS con otros nombres en public.users, comenta los bloques 3 y 4
-- y asegúrate de que permitan UPDATE y SELECT donde auth.uid() = id.

-- 1. Añadir la columna api_secret_key a public.users (si no existe)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS api_secret_key text;

-- 2. Asegurar que RLS está activado en la tabla users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Política para que cada usuario pueda actualizar su propia fila (incluido api_secret_key)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Política para que cada usuario pueda leer su propia fila (necesaria para cargar api_secret_key)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);
