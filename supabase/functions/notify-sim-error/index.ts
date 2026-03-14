/**
 * TELSIM · Edge Function: notify-sim-error
 *
 * Envía una alerta urgente por Telegram al CEO cuando un slot pasa a status 'error'.
 * Invocada por el trigger de PostgreSQL en la tabla slots.
 *
 * Variables de entorno:
 *   TELEGRAM_ADMIN_TOKEN, TELEGRAM_ADMIN_CHAT_ID  (bot y chat del CEO)
 *   SLOT_ERROR_WEBHOOK_SECRET  (clave para autorizar invocación desde el trigger)
 *
 * Payload (body JSON): { "slot_id": string, "phone_number": string | null }
 * Autorización: Header X-Webhook-Secret o body.webhook_secret === SLOT_ERROR_WEBHOOK_SECRET
 */

const TELEGRAM_ADMIN_TOKEN = Deno.env.get('TELEGRAM_ADMIN_TOKEN') ?? '';
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';
const SLOT_ERROR_WEBHOOK_SECRET = Deno.env.get('SLOT_ERROR_WEBHOOK_SECRET') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: { slot_id?: string; phone_number?: string | null; webhook_secret?: string } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const slotId = typeof body.slot_id === 'string' ? body.slot_id.trim() : '';
  const phoneNumber = body.phone_number != null ? String(body.phone_number).trim() : '';
  const headerSecret = req.headers.get('X-Webhook-Secret');
  const bodySecret = body.webhook_secret;

  const authorized =
    SLOT_ERROR_WEBHOOK_SECRET.length >= 8 &&
    (headerSecret === SLOT_ERROR_WEBHOOK_SECRET || bodySecret === SLOT_ERROR_WEBHOOK_SECRET);

  if (!authorized) {
    console.warn('notify-sim-error: Unauthorized (missing or invalid webhook secret)');
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (!TELEGRAM_ADMIN_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.error('notify-sim-error: TELEGRAM_ADMIN_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set');
    return jsonResponse({ error: 'Telegram not configured' }, 500);
  }

  if (!slotId) {
    return jsonResponse({ error: 'slot_id is required' }, 400);
  }

  const phoneLine = phoneNumber ? `\n📱 Teléfono: ${phoneNumber}` : '';
  const message = `⚠️ *ALERTA DE INFRAESTRUCTURA:* El Slot *${slotId}* ha entrado en estado de error. Por favor, revisa el panel de administración.${phoneLine}`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_ADMIN_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const tgResult = await tgRes.json();
    if (!tgRes.ok) {
      console.error('notify-sim-error: Telegram API error', tgResult);
      return jsonResponse({ error: 'Telegram send failed', details: tgResult }, 502);
    }

    return jsonResponse({
      ok: true,
      message: 'Alert sent',
      slot_id: slotId,
      phone_number: phoneNumber || null,
    });
  } catch (e) {
    console.error('notify-sim-error:', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});
