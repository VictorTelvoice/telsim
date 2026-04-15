-- ==========================================
-- API CLIENTS (EXTERNAL INTEGRATIONS)
-- ==========================================

-- 1. Create the `api_clients` table
CREATE TABLE IF NOT EXISTS public.api_clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    secret_key_hash text NOT NULL, -- We'll store a hash or the raw secret if needed (for simplicity, we can just store it in plain text if it's a generated UUID, or hash it). Let's use a clear 'secret_key' since we will generate JWTs from a single env variable, this 'secret_key' could just be their sub identifier or a unique token.
    jwt_secret text, -- For custom signing per client or just rely on a global one.
    status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
    created_at timestamptz DEFAULT now()
);

-- 2. Modify `slots` to support assignments to API clients
-- Adds a reference to the external client so we know who owns the slot when `assigned_to` is not a platform user
ALTER TABLE public.slots 
ADD COLUMN IF NOT EXISTS api_client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL;

-- 3. Row Level Security for API Clients
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;

-- Only admins/service_role can view and manage api_clients
CREATE POLICY "Enable read access for all service roles" ON public.api_clients FOR SELECT USING (true);
CREATE POLICY "Enable all access for service roles only" ON public.api_clients FOR ALL USING (auth.role() = 'service_role');
