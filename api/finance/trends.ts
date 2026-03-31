/**
 * TELSIM · /api/finance/trends
 *
 * POST: serie agregada (day/month) para trends evitando grouping en frontend.
 *
 * Body:
 *  - startDate: string (ISO o YYYY-MM-DD)
 *  - endDate: string (ISO o YYYY-MM-DD)
 *  - granularity?: 'day' | 'month' (default 'day')
 *  - userId?: string (admin: opcional para scoping por usuario)
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

function toNumber(v: any): number {
  if (v == null) return 0;
  const n = typeof v === 'string' ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildPeriodKeysDay(startDateOnly: string, endDateOnly: string): string[] {
  const start = new Date(startDateOnly + 'T00:00:00.000Z');
  const end = new Date(endDateOnly + 'T00:00:00.000Z');
  const keys: string[] = [];
  for (let d = new Date(start.getTime()); d.getTime() <= end.getTime(); d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function buildPeriodKeysMonth(startDateOnly: string, endDateOnly: string): string[] {
  const startD = new Date(startDateOnly + 'T00:00:00.000Z');
  startD.setUTCDate(1);
  const endD = new Date(endDateOnly + 'T00:00:00.000Z');
  endD.setUTCDate(1);

  const keys: string[] = [];
  for (let d = new Date(startD.getTime()); d.getTime() <= endD.getTime(); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function computeGrossPct(netCash: number, gross: number): number {
  if (netCash === 0) return 0;
  return Math.round((gross / netCash) * 10000) / 100; // 2 decimales
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body ?? {};

  const start = body.startDate ? new Date(body.startDate) : null;
  const end = body.endDate ? new Date(body.endDate) : null;
  const granularity = (body.granularity === 'month' ? 'month' : 'day') as 'day' | 'month';

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'startDate/endDate requeridos y con formato válido' });
  }

  const startDateOnly = start.toISOString().slice(0, 10);
  const endDateOnly = end.toISOString().slice(0, 10);
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
  const requestedUserId = typeof body.userId === 'string' ? body.userId : undefined;
  const scopedUserId = isAdmin ? requestedUserId ?? null : requesterId;

  try {
    type Row = {
      period_date: string;
      cash_revenue_cents: number;
      booked_sales_cents: number;
      booked_monthly_equivalent_cents: number;
      estimated_cost_cents: number;
      gross_margin_cents: number;
      gross_margin_pct: number;
    };

    // Caso 1: admin global (sin userId) => query a vistas agregadas
    if (isAdmin && scopedUserId == null) {
      const view = granularity === 'day' ? 'billing_ledger_v' : 'finance_trends_monthly_v';
      const { data: rows, error } = await supabaseAdmin
        .from(view)
        .select(
          'period_date,cash_revenue_cents,booked_sales_cents,booked_monthly_equivalent_cents,estimated_cost_cents,gross_margin_cents,gross_margin_pct'
        )
        .gte('period_date', startDateOnly)
        .lte('period_date', endDateOnly)
        .order('period_date', { ascending: true });

      if (error) return res.status(500).json({ error: `trends view error: ${error.message}` });

      return res.status(200).json({
        granularity,
        rows: (rows ?? []).map((r: any) => ({
          period_date: String(r.period_date),
          cash_revenue_cents: toNumber(r.cash_revenue_cents),
          booked_sales_cents: toNumber(r.booked_sales_cents),
          booked_monthly_equivalent_cents: toNumber(r.booked_monthly_equivalent_cents),
          estimated_cost_cents: toNumber(r.estimated_cost_cents),
          gross_margin_cents: toNumber(r.gross_margin_cents),
          gross_margin_pct: toNumber(r.gross_margin_pct),
        })),
      });
    }

    // Caso 2: user (o admin con userId) => agregación en backend desde finance_events
    const { data: events, error } = await supabaseAdmin
      .from('finance_events')
      .select('occurred_at, finance_event_type, amount_cents, metadata')
      .gte('occurred_at', startIso)
      .lte('occurred_at', endIso)
      .eq('user_id', scopedUserId)
      .in('finance_event_type', ['cash_revenue', 'booked_revenue', 'estimated_cost', 'refund', 'chargeback']);

    if (error) return res.status(500).json({ error: `finance_events error: ${error.message}` });

    const buckets: Record<string, { cash: number; refunds: number; chargebacks: number; booked: number; bookedMonthlyEq: number; estimatedCost: number }> = {};
    for (const ev of events ?? []) {
      const occurredAt = String(ev.occurred_at);
      const d = new Date(occurredAt);
      if (Number.isNaN(d.getTime())) continue;

      if (granularity === 'day') {
        const key = d.toISOString().slice(0, 10);
        if (!buckets[key]) buckets[key] = { cash: 0, refunds: 0, chargebacks: 0, booked: 0, bookedMonthlyEq: 0, estimatedCost: 0 };
        if (ev.finance_event_type === 'cash_revenue') buckets[key].cash += toNumber(ev.amount_cents);
        if (ev.finance_event_type === 'refund') buckets[key].refunds += toNumber(ev.amount_cents);
        if (ev.finance_event_type === 'chargeback') buckets[key].chargebacks += toNumber(ev.amount_cents);
        if (ev.finance_event_type === 'booked_revenue') {
          buckets[key].booked += toNumber(ev.amount_cents);
          buckets[key].bookedMonthlyEq += toNumber(ev.metadata?.monthly_equivalent_cents);
        }
        if (ev.finance_event_type === 'estimated_cost') buckets[key].estimatedCost += toNumber(ev.amount_cents);
      } else {
        d.setUTCDate(1);
        const key = d.toISOString().slice(0, 10);
        if (!buckets[key]) buckets[key] = { cash: 0, refunds: 0, chargebacks: 0, booked: 0, bookedMonthlyEq: 0, estimatedCost: 0 };
        if (ev.finance_event_type === 'cash_revenue') buckets[key].cash += toNumber(ev.amount_cents);
        if (ev.finance_event_type === 'refund') buckets[key].refunds += toNumber(ev.amount_cents);
        if (ev.finance_event_type === 'chargeback') buckets[key].chargebacks += toNumber(ev.amount_cents);
        if (ev.finance_event_type === 'booked_revenue') {
          buckets[key].booked += toNumber(ev.amount_cents);
          buckets[key].bookedMonthlyEq += toNumber(ev.metadata?.monthly_equivalent_cents);
        }
        if (ev.finance_event_type === 'estimated_cost') buckets[key].estimatedCost += toNumber(ev.amount_cents);
      }
    }

    const keys = granularity === 'day' ? buildPeriodKeysDay(startDateOnly, endDateOnly) : buildPeriodKeysMonth(startDateOnly, endDateOnly);
    const rows: Row[] = keys.map((key) => {
      const b = buckets[key] ?? { cash: 0, refunds: 0, chargebacks: 0, booked: 0, bookedMonthlyEq: 0, estimatedCost: 0 };
      const netCash = b.cash - b.refunds - b.chargebacks;
      const gross = netCash - b.estimatedCost;
      return {
        period_date: key,
        cash_revenue_cents: b.cash,
        booked_sales_cents: b.booked,
        booked_monthly_equivalent_cents: b.bookedMonthlyEq,
        estimated_cost_cents: b.estimatedCost,
        gross_margin_cents: gross,
        gross_margin_pct: computeGrossPct(netCash, gross),
      };
    });

    return res.status(200).json({ granularity, rows });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Unknown error', timestamp: new Date().toISOString() });
  }
}
