import pg from 'pg';

const { Client } = pg;

async function run() {
  // Configuración manual basada en las llaves proporcionadas
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || '';
  const projectRef = 'blujavukpveehdkpwfsq'; 
  
  const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
  
  console.log(`Connecting to: db.${projectRef}.supabase.co...`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase via Direct Postgres Connection!');

    const sql = `
      -- 1. Crear tabla de clientes externos
      CREATE TABLE IF NOT EXISTS public.api_clients (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          secret_key_hash text NOT NULL, 
          jwt_secret text, 
          status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
          created_at timestamptz DEFAULT now()
      );

      -- 2. Vincular los números (slots) con los clientes externos
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='slots' AND column_name='api_client_id') THEN
          ALTER TABLE public.slots ADD COLUMN api_client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL;
        END IF;
      END $$;

      -- 3. Habilitar seguridad (RLS)
      ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Enable read access for all service roles" ON public.api_clients;
      DROP POLICY IF EXISTS "Enable all access for service roles only" ON public.api_clients;
      
      CREATE POLICY "Enable read access for all service roles" ON public.api_clients FOR SELECT USING (true);
      CREATE POLICY "Enable all access for service roles only" ON public.api_clients FOR ALL USING (auth.role() = 'service_role');

      -- 4. INSERTAR AL CLIENTE 'goauth'
      INSERT INTO public.api_clients (id, name, secret_key_hash, status)
      VALUES ('edf64997-aa8b-4d9e-9a4d-8e9a8608bcaf', 'goauth', 'hash_test', 'active')
      ON CONFLICT (id) DO NOTHING;

      -- 5. Refrescar el cache de la API de PostgREST
      NOTIFY pgrst, 'reload schema';
    `;

    await client.query(sql);
    console.log('🚀 SQL Migration applied successfully! The database is now updated.');

  } catch (err) {
    console.error('❌ Failed to apply migration:', err);
  } finally {
    await client.end();
  }
}

run();
