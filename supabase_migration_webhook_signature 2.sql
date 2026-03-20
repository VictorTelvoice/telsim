-- ==========================================
-- TELSIM · Firma de Seguridad (HMAC-SHA256) en Webhooks
-- ==========================================
-- Requiere: extensión pg_net (habilitar en Dashboard) y pgcrypto.

-- 1. Habilitar pgcrypto para HMAC (si no está ya)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Columna api_secret_key en users (para firma de webhooks)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS api_secret_key text;

-- 2b. RLS: permitir que usuarios autenticados actualicen y lean su propia fila (api_secret_key)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- 3. Función que notifica al webhook del usuario con firma X-Telsim-Signature
CREATE OR REPLACE FUNCTION public.notify_user_webhook(
  p_user_id uuid,
  p_body jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_body_text text;
  v_signature_hex text;
  v_headers jsonb;
  v_request_id bigint;
BEGIN
  -- Obtener URL del webhook y api_secret_key del usuario
  SELECT u.user_webhook_url, u.api_secret_key
  INTO v_url, v_secret
  FROM public.users u
  WHERE u.id = p_user_id
  LIMIT 1;

  -- Si no hay URL configurada, no hacer la petición
  IF v_url IS NULL OR trim(v_url) = '' THEN
    RETURN NULL;
  END IF;

  -- Cuerpo del JSON como texto (lo que se enviará en el POST)
  v_body_text := p_body::text;

  -- Calcular HMAC-SHA256 del cuerpo usando la clave secreta del usuario
  -- Si no hay api_secret_key, enviamos sin firma (comportamiento legacy)
  IF v_secret IS NOT NULL AND trim(v_secret) != '' THEN
    v_signature_hex := encode(hmac(v_body_text, v_secret, 'sha256'), 'hex');
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Telsim-Signature', 'sha256=' || v_signature_hex
    );
  ELSE
    v_headers := '{"Content-Type": "application/json"}'::jsonb;
  END IF;

  -- Realizar la petición POST asíncrona con pg_net
  SELECT net.http_post(
    url := v_url,
    body := p_body,
    headers := v_headers,
    timeout_milliseconds := 10000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

COMMENT ON FUNCTION public.notify_user_webhook(uuid, jsonb) IS
  'Envía un POST al webhook del usuario con el body dado. Añade X-Telsim-Signature: sha256=<HMAC-SHA256(body, api_secret_key)> si el usuario tiene api_secret_key.';
