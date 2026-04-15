import dns from 'dns/promises';
import pg from 'pg';

const { Client } = pg;

async function run() {
  const projectRef = 'blujavukpveehdkpwfsq';
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || '';
  
  // Lista de posibles hostnames
  const hosts = [
    `db.${projectRef}.supabase.co`,
    `db.${projectRef}.supabase.com`,
    `db.${projectRef}.supabase.net`,
    `aws-0-us-east-1.pooler.supabase.com`, // General
    `aws-0-sa-east-1.pooler.supabase.com`  // Latam
  ];

  console.log('--- Probing Hostnames ---');

  for (const host of hosts) {
    try {
      console.log(`Checking ${host}...`);
      const addresses = await dns.lookup(host, { all: true });
      console.log(`Found:`, addresses);

      // Try to connect
      const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@${host}:5432/postgres?sslmode=require`;
      // Note: for pooler it's often user 'postgres.[ref]'
      
      const client = new Client({
        connectionString,
        connectionTimeoutMillis: 5000
      });

      try {
        await client.connect();
        console.log(`✅ SUCCESS! Connected to ${host}`);
        
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
        
        await client.query(sql);
        console.log('🚀 MIGRATION APPLIED!');
        await client.end();
        return;
      } catch (connErr) {
        console.log(`❌ Connection failed for ${host}:`, connErr.message);
      }
    } catch (dnsErr) {
      console.log(`❌ DNS Resolution failed for ${host}`);
    }
  }
}

run();
