import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabaseUrl = 'https://blujavukpveehdkpwfsq.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdWphdnVrcHZlZWhka3B3ZnNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI3ODgyMiwiZXhwIjoyMDgxODU0ODIyfQ.avFVTAS9u4qvtqUW_E-TEjXBG9nsaXATurwqxQjYUt0';

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('--- Attempting exec_sql RPC ---');
  
  const sql = `
      -- 1. Table
      CREATE TABLE IF NOT EXISTS public.api_clients (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          secret_key_hash text NOT NULL, 
          jwt_secret text, 
          status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
          created_at timestamptz DEFAULT now()
      );

      -- 2. Alter
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='slots' AND column_name='api_client_id') THEN
          ALTER TABLE public.slots ADD COLUMN api_client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL;
        END IF;
      END $$;

      -- 3. RLS
      ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Enable read access for all service roles" ON public.api_clients;
      DROP POLICY IF EXISTS "Enable all access for service roles only" ON public.api_clients;
      CREATE POLICY "Enable read access for all service roles" ON public.api_clients FOR SELECT USING (true);
      CREATE POLICY "Enable all access for service roles only" ON public.api_clients FOR ALL USING (auth.role() = 'service_role');

      -- 4. Insert
      INSERT INTO public.api_clients (id, name, secret_key_hash, status)
      VALUES ('edf64997-aa8b-4d9e-9a4d-8e9a8608bcaf', 'goauth', 'hash_test', 'active')
      ON CONFLICT (id) DO NOTHING;

      -- 5. Notify
      NOTIFY pgrst, 'reload schema';
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.error('❌ RPC exec_sql failed:', error.message);
    console.log('This usually means the project does not have a "exec_sql" stored procedure defined.');
  } else {
    console.log('✅ RPC success!', data);
  }
}

run();
