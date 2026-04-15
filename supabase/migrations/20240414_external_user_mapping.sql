-- SCRIPT: External User Mapping for Traceability
-- Permite vincular usuarios de plataformas externas (GoAuth) con usuarios internos de Telsim.

CREATE TABLE IF NOT EXISTS public.external_user_mappings (
    api_client_id uuid REFERENCES public.api_clients(id) ON DELETE CASCADE,
    external_user_id text NOT NULL, -- ID del usuario en la plataforma origen (GoAuth)
    telsim_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (api_client_id, external_user_id)
);

-- Asegurar que la tabla public.users tenga una columna para identificar el origen si es necesario
-- (Opcional, pero útil para trazabilidad)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='origin_client_id') THEN
    ALTER TABLE public.users ADD COLUMN origin_client_id uuid REFERENCES public.api_clients(id);
  END IF;
END $$;
