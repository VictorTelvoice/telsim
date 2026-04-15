-- Esquema para pruebas locales de la API externa de Telsim

-- 1. Crear tabla de clientes externos
CREATE TABLE IF NOT EXISTS public.api_clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    secret_key_hash text NOT NULL, 
    jwt_secret text, 
    status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
    created_at timestamptz DEFAULT now()
);

-- 2. Crear tabla de slots (Inventario de números)
CREATE TABLE IF NOT EXISTS public.slots (
    slot_id text PRIMARY KEY,
    phone_number text NOT NULL UNIQUE,
    plan_type text DEFAULT 'basic',
    status text DEFAULT 'libre' CHECK (status IN ('libre', 'ocupado', 'reserved', 'active')),
    region text DEFAULT 'US',
    label text,
    api_client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
    assigned_to text, -- UUID o ID de usuario/cliente
    forwarding_active boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 3. Insertar cliente de prueba (GoAuth)
INSERT INTO public.api_clients (id, name, secret_key_hash, status)
VALUES ('edf64997-aa8b-4d9e-9a4d-8e9a8608bcaf', 'goauth', 'hash_test', 'active')
ON CONFLICT (id) DO NOTHING;

-- 4. Insertar números de prueba (Inventario)
INSERT INTO public.slots (slot_id, phone_number, status, region, label)
VALUES 
    ('SLOT-001', '+12345440001', 'libre', 'US', 'Test Number 1'),
    ('SLOT-002', '+12345440002', 'libre', 'US', 'Test Number 2'),
    ('SLOT-003', '+12345440003', 'libre', 'CL', 'Test Number Chile')
ON CONFLICT (slot_id) DO NOTHING;
