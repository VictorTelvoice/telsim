import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// Si no hay EXTERNAL_API_SECRET en el .env, usará 'secret' por default como se configuró en auth.ts
const JWT_SECRET = process.env.EXTERNAL_API_SECRET || process.env.SUPABASE_JWT_SECRET || 'secret';

function generateClientDev() {
    const clientId = randomUUID();
    
    // Firmar por 10 años para testing
    const token = jwt.sign({ clientId }, JWT_SECRET, { expiresIn: '3650d' });

    console.log(`\n============ CLIENTE API AUTOGENERADO ============\n`);
    console.log(`1️⃣ Ejecuta esto en el SQL Editor de Supabase para registrar al cliente:\n`);
    console.log(`INSERT INTO public.api_clients (id, name, secret_key_hash, status)`);
    console.log(`VALUES ('${clientId}', 'goauth', 'hash_test', 'active');`);
    console.log(`\n2️⃣ Usa este JWT en el Header (Authorization: Bearer <TKN>) de tus peticiones CURL/Postman:\n`);
    console.log(token);
    console.log(`\n==================================================\n`);
}

generateClientDev();
