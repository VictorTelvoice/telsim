/**
 * Script de prueba: envía un correo de test a la Edge Function send-email.
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... npx tsx test-email.ts
 *
 * Opcional: TO_EMAIL=tu@email.com para recibir el correo en tu bandeja.
 * Por defecto usa test@example.com (puede no llegar si no tienes Resend configurado para ese dominio).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TO_EMAIL = process.env.TO_EMAIL || 'test@example.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Ejemplo:');
  console.error('  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... npx tsx test-email.ts');
  process.exit(1);
}

const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/send-email`;

const body = {
  event: 'purchase_success',
  to_email: TO_EMAIL,
  data: {
    plan: 'Pro',
    phone_number: '+56 9 5319 4056',
    billing_type: 'Mensual',
    next_date: '15/04/2026',
  },
};

console.log('Enviando a:', url);
console.log('Payload:', JSON.stringify(body, null, 2));

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let json: unknown;
try {
  json = JSON.parse(text);
} catch {
  json = text;
}

if (!res.ok) {
  console.error('Error', res.status, json);
  process.exit(1);
}

console.log('OK', res.status, json);
