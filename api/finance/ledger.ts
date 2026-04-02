/**
 * TELSIM · /api/finance/ledger
 *
 * POST: lista de filas de `public.finance_events` filtradas.
 * Body:
 *  - startDate: string (ISO o YYYY-MM-DD)  [requerido]
 *  - endDate: string (ISO o YYYY-MM-DD)    [requerido]
 *  - financeEventTypes?: string[]          [opcional]
 *  - userId?: string                       [opcional]
 *  - planName?: string                     [opcional]
 *  - limit?: number                        [opcional] default 200
 *  - offset?: number                       [opcional] default 0
 */
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const ADMIN_UIDS = [
  '8e7bcada-3f7a-482f-93a7-9d0fd4828231',
  'd310eaf8-2c82-4c29-9ea8-6d64616774da',
];

function isAdminUid(uid: string | null | undefined): boolean {
  return ADMIN_UIDS.some((adminUid) => adminUid.toLowerCase() === String(uid || '').toLowerCase());
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body ?? {};
  const start = body.startDate ? new Date(body.startDate) : null;
  const end = body.endDate ? new Date(body.endDate) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'startDate/endDate requeridos y con formato válido' });
  }

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!token) {
    return res.status(401).json({ error: 'No autorizado (missing bearer token).' });
  }
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    return res.status(500).json({ error: 'Configuración de auth faltante (anon key).' });
  }

  const supabaseAuth = createClient(process.env.SUPABASE_URL || '', anonKey, { global: { fetch } });
  const { data: authData, error: authErr } = await supabaseAuth.auth.getUser(token);
  if (authErr || !authData?.user) {
    return res.status(401).json({ error: 'No autorizado (invalid token).' });
  }

  const requesterId = authData.user.id;
  const isAdmin = isAdminUid(requesterId);

  const financeEventTypes = Array.isArray(body.financeEventTypes)
    ? body.financeEventTypes
    : (typeof body.financeEventTypes === 'string' ? [body.financeEventTypes] : []);

  const limit = typeof body.limit === 'number' ? body.limit : 200;
  const offset = typeof body.offset === 'number' ? body.offset : 0;

  const requestedUserId = typeof body.userId === 'string' ? body.userId : undefined;
  const scopedUserId = isAdmin ? requestedUserId ?? null : requesterId;

  const q = supabaseAdmin
    .from('finance_events')
    .select(
      'id, stripe_event_id, stripe_event_type, finance_event_type, occurred_at, user_id, subscription_id, slot_id, plan_name, billing_type, currency, amount_cents, risk_amount_cents, metadata, created_at'
    )
    .gte('occurred_at', startIso)
    .lte('occurred_at', endIso)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (financeEventTypes.length > 0) {
    q.in('finance_event_type', financeEventTypes);
  }

  // Autorización por alcance:
  // - usuario normal: siempre filtra por el user_id del token
  // - admin: global si no envía userId, o por userId si lo envía
  if (scopedUserId != null) {
    q.eq('user_id', scopedUserId);
  }
  if (body.planName) {
    q.eq('plan_name', body.planName);
  }

  try {
    const { data: events, error } = await q;
    if (error) {
      return res.status(500).json({ error: `finance_events error: ${error.message}` });
    }

    return res.status(200).json({
      events: events ?? [],
      pagination: {
        limit,
        offset,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Unknown error', timestamp: new Date().toISOString() });
  }
}
