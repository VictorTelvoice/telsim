import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Load local env manually for a simple script
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[match[1].trim()] = val;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 
// Caution: if we don't have service role key in local env, we use anon. 
// Let's assume the client will run tests where we might lack permissions if not using service role, but anon might have RLS blocked.

const supabase = createClient(supabaseUrl!, supabaseKey!);
const JWT_SECRET = process.env.EXTERNAL_API_SECRET || process.env.SUPABASE_JWT_SECRET || 'secret';

function createMockRes() {
    return {
        _statusCode: 200,
        _data: null,
        status(code: number) { this._statusCode = code; return this; },
        json(val: any) { this._data = val; return { statusCode: this._statusCode, data: this._data }; },
        end() { return { statusCode: this._statusCode, data: this._data }; },
        setHeader() { return this; },
    };
}

async function runTests() {
  const mod = await import('../api/external/numbers.js');
  const numbersHandler = mod.default;

  console.log('Testing SQL schema execution if not exists...');
  
  // 1. Validar si la tabla existe insertando un test
  const testId = '00000000-0000-0000-0000-000000000000';
  let { error: testTableErr } = await supabase.from('api_clients').select('id').limit(1);

  if (testTableErr && testTableErr.code === '42P01') {
      console.error('❌ ERRROR: Table "api_clients" does not exist. Please run the "supabase_api_clients_auth.sql" script via Supabase Studio SQL editor first.');
      return;
  }

  // Ensure mock client
  const mockClientId = '11111111-1111-1111-1111-111111111111';
  await supabase.from('api_clients').upsert({
      id: mockClientId,
      name: 'Test Client',
      secret_key_hash: 'test_hash',
      status: 'active'
  });

  // Generate Token
  const token = jwt.sign({ clientId: mockClientId }, JWT_SECRET, { expiresIn: '1h' });
  console.log(`Generated JWT for tests: ${token}\\n`);

  console.log('--- TEST 1: POST /api/external/numbers ---');
  let reqPost = {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: {
          region: 'US',
          plan_type: 'basic',
          label: 'Test con Usuario Sombra',
          user_id: 'goauth-user-123',
          user_name: 'Test User GoAuth',
          user_email: 'test@goauth.ai'
      }
  };
  let res1 = await (numbersHandler(reqPost as any, createMockRes() as any) as any);
  console.log('POST Result:', res1);

  if (res1.statusCode !== 201) {
      console.log('Fallo el POST: deteniendo tests.');
      return;
  }
  const createdSlotId = res1.data.data.slot_id;

  console.log('\\n--- TEST 2: GET /api/external/numbers ---');
  let reqGetList = {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
      query: {}
  };
  let resGetList = await (numbersHandler(reqGetList as any, createMockRes() as any) as any);
  console.log('GET Result (List):', resGetList.data.data.length, 'lineas asigandas. Ultima:', resGetList.data.data[0]);

  console.log('\\n--- TEST 3: DELETE /api/external/numbers ---');
  let reqDelete = {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
      query: { id: createdSlotId }
  };
  let resDelete = await (numbersHandler(reqDelete as any, createMockRes() as any) as any);
  console.log('DELETE Result:', resDelete);

  console.log('\\n✅ Pruebas finalizadas.');
}

runTests().catch(err => console.error(err));
