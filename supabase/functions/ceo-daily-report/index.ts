/**
 * TELSIM · Edge Function: ceo-daily-report
 *
 * Envía un resumen ejecutivo diario al CEO por Telegram.
 * Solo puede ser disparada por el sistema o con la clave secreta de CRON.
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   TELEGRAM_ADMIN_TOKEN, TELEGRAM_ADMIN_CHAT_ID  (bot y chat del CEO)
 *   CEO_REPORT_CRON_SECRET  (clave para autorizar invocación desde CRON/sistema)
 *
 * Invocación autorizada:
 *   - Header: X-Cron-Secret: <CEO_REPORT_CRON_SECRET>
 *   - O Header: Authorization: Bearer <CEO_REPORT_CRON_SECRET>
 *   - O Body JSON: { "cron_secret": "<CEO_REPORT_CRON_SECRET>" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_ADMIN_TOKEN = Deno.env.get('TELEGRAM_ADMIN_TOKEN') ?? '';
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';
const CEO_REPORT_CRON_SECRET = Deno.env.get('CEO_REPORT_CRON_SECRET') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function isAuthorized(req: Request): boolean {
  if (!CEO_REPORT_CRON_SECRET || CEO_REPORT_CRON_SECRET.length < 8) {
    console.warn('ceo-daily-report: CEO_REPORT_CRON_SECRET not set or too short');
    return false;
  }
  const headerSecret = req.headers.get('X-Cron-Secret');
  if (headerSecret === CEO_REPORT_CRON_SECRET) return true;
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ') && auth.slice(7) === CEO_REPORT_CRON_SECRET) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let bodySecret: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    bodySecret = (body as { cron_secret?: string }).cron_secret ?? null;
  } catch {
    // body optional
  }

  const authorized =
    isAuthorized(req) ||
    (CEO_REPORT_CRON_SECRET && bodySecret === CEO_REPORT_CRON_SECRET);

  if (!authorized) {
    console.warn('ceo-daily-report: Unauthorized request (missing or invalid CRON secret)');
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (!TELEGRAM_ADMIN_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.error('ceo-daily-report: TELEGRAM_ADMIN_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set');
    return jsonResponse({ error: 'Telegram not configured' }, 500);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [activeSubsRes, subs24hRes, slotsRes, usersRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('amount')
        .or('status.eq.active,status.eq.trialing'),
      supabase.from('subscriptions').select('amount').gte('created_at', last24h),
      supabase.from('slots').select('slot_id, status, assigned_to'),
      supabase.from('users').select('id').gte('created_at', startOfToday),
    ]);

    const activeSubs = (activeSubsRes.data || []) as { amount: number | null }[];
    const subs24h = (subs24hRes.data || []) as { amount: number | null }[];
    const slots = (slotsRes.data || []) as { slot_id: string; status: string; assigned_to: string | null }[];
    const newUsersTodayList = (usersRes.data || []) as { id: string }[];

    const mrr = activeSubs.reduce((sum, s) => sum + (s.amount != null ? Number(s.amount) : 0), 0);
    const sales24h = subs24h.reduce((sum, s) => sum + (s.amount != null ? Number(s.amount) : 0), 0);
    const slotsFree = slots.filter((s) => (s.status || '').toLowerCase() === 'libre' && !s.assigned_to).length;
    const slotsOccupied = slots.filter((s) => (s.status || '').toLowerCase() === 'ocupado' || s.assigned_to != null).length;
    const newRegistrationsToday = newUsersTodayList.length;

    const dateStr = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const message = `📈 *Resumen Ejecutivo Telsim*
${dateStr}

💰 *Datos financieros*
• Ventas últimas 24h: *$${sales24h.toFixed(2)}*
• MRR total: *$${mrr.toFixed(2)}*

📱 *Inventario SIMs*
• Ocupadas: *${slotsOccupied}*
• Libres: *${slotsFree}*
• Total: *${slots.length}*

👤 *Usuarios*
• Nuevos registros hoy: *${newRegistrationsToday}*

_Generado automáticamente por ceo-daily-report_`;

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
      console.error('ceo-daily-report: Telegram API error', tgResult);
      return jsonResponse({ error: 'Telegram send failed', details: tgResult }, 502);
    }

    return jsonResponse({
      ok: true,
      message: 'Report sent',
      metrics: { sales24h, mrr, slotsFree, slotsOccupied, totalSlots: slots.length, newRegistrationsToday },
    });
  } catch (e) {
    console.error('ceo-daily-report:', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});
