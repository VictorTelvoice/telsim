-- ==========================================
-- Sincronizar auth.users → public.users
-- Ejecutar en Supabase SQL Editor si el trigger no existe.
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, nombre)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', new.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- También insertar manualmente los usuarios que ya existen en auth pero no en users:
INSERT INTO public.users (id, email, nombre)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
