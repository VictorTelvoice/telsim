/**
 * TELSIM · /api/finance/summary
 *
 * POST: resumen de KPIs financieros (Fase 4).
 * Body:
 *  - startDate?: string (ISO o YYYY-MM-DD)
 *  - endDate?: string (ISO o YYYY-MM-DD)
 *
 * Notas:
 *  - Cash/Booked/Risk en base a `public.billing_ledger_v` (agregado por occurred_at).
 *  - MRR/ARR/Activos/Funnel actual en base a `public.finance_state_current_v` (snapshot).
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body ?? {};
  const now = new Date();

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!token) {
    return res.status(401).json({ error: 'No autorizado (missing bearer token).' });
  }
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    return res.status(500).json({ error: 'Configuración de auth faltante (anon key).' });
  }

  // Autorización: usuario normal solo ve sus propios datos; admin puede ver global o por userId.
  const supabaseAuth = createClient(process.env.SUPABASE_URL || '', anonKey, { global: { fetch } });
  const { data: authData, error: authErr } = await supabaseAuth.auth.getUser(token);
  if (authErr || !authData?.user) {
    return res.status(401).json({ error: 'No autorizado (invalid token).' });
  }
  const requesterId = authData.user.id;
  const isAdmin = isAdminUid(requesterId);

  const start = body.startDate ? new Date(body.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const end = body.endDate ? new Date(body.endDate) : now;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid startDate/endDate' });
  }

  const startDateOnly = start.toISOString().slice(0, 10); // YYYY-MM-DD
  const endDateOnly = end.toISOString().slice(0, 10); // YYYY-MM-DD
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const requestedUserId = typeof body.userId === 'string' ? body.userId : undefined;
  const scopedUserId = isAdmin ? requestedUserId ?? null : requesterId;

  try {
    let totals: {
      cash_revenue_cents: number;
      gross_cash_revenue_cents: number;
      refunds_amount_cents: number;
      chargebacks_amount_cents: number;
      net_cash_revenue_cents: number;
      booked_sales_cents: number;
      booked_monthly_equivalent_cents: number;
      failed_payments_count: number;
      revenue_at_risk_cents: number;
      estimated_cost_cents: number;
    } = {
      cash_revenue_cents: 0,
      gross_cash_revenue_cents: 0,
      refunds_amount_cents: 0,
      chargebacks_amount_cents: 0,
      net_cash_revenue_cents: 0,
      booked_sales_cents: 0,
      booked_monthly_equivalent_cents: 0,
      failed_payments_count: 0,
      revenue_at_risk_cents: 0,
      estimated_cost_cents: 0,
    };

    // Ledger por período:
    if (scopedUserId == null) {
      // Admin global: usar vistas agregadas por período.
      const { data: ledgerRows, error: ledgerErr } = await supabaseAdmin
        .from('billing_ledger_v')
        .select(
          'cash_revenue_cents, booked_sales_cents, booked_monthly_equivalent_cents, failed_payments_count, revenue_at_risk_cents, estimated_cost_cents, refunds_amount_cents, chargebacks_amount_cents, period_date'
        )
        .gte('period_date', startDateOnly)
        .lte('period_date', endDateOnly);

      if (ledgerErr) {
        return res.status(500).json({ error: `billing_ledger_v error: ${ledgerErr.message}` });
      }

      totals = (ledgerRows ?? []).reduce(
        (acc: any, r: any) => {
          acc.cash_revenue_cents += toNumber(r.cash_revenue_cents);
          acc.gross_cash_revenue_cents += toNumber(r.cash_revenue_cents);
          acc.refunds_amount_cents += toNumber(r.refunds_amount_cents);
          acc.chargebacks_amount_cents += toNumber(r.chargebacks_amount_cents);
          acc.booked_sales_cents += toNumber(r.booked_sales_cents);
          acc.booked_monthly_equivalent_cents += toNumber(r.booked_monthly_equivalent_cents);
          acc.failed_payments_count += toNumber(r.failed_payments_count);
          acc.revenue_at_risk_cents += toNumber(r.revenue_at_risk_cents);
          acc.estimated_cost_cents += toNumber(r.estimated_cost_cents);
          return acc;
        },
        totals
      );
    } else {
      // Usuario normal / admin por userId: usar `finance_events` filtrado por user_id.
      const { data: events, error: eventsErr } = await supabaseAdmin
        .from('finance_events')
        .select('finance_event_type, amount_cents, risk_amount_cents, metadata')
        .gte('occurred_at', startIso)
        .lte('occurred_at', endIso)
        .eq('user_id', scopedUserId)
        .in('finance_event_type', [
          'cash_revenue',
          'booked_revenue',
          'payment_failed_attempt',
          'estimated_cost',
          'refund',
          'chargeback',
        ]);

      if (eventsErr) {
        return res.status(500).json({ error: `finance_events error: ${eventsErr.message}` });
      }

      for (const r of events ?? []) {
        const ft = r.finance_event_type;
        if (ft === 'cash_revenue') {
          totals.cash_revenue_cents += toNumber(r.amount_cents);
          totals.gross_cash_revenue_cents += toNumber(r.amount_cents);
        } else if (ft === 'booked_revenue') {
          totals.booked_sales_cents += toNumber(r.amount_cents);
          const monthlyEquiv = r.metadata?.monthly_equivalent_cents;
          totals.booked_monthly_equivalent_cents += toNumber(monthlyEquiv);
        } else if (ft === 'payment_failed_attempt') {
          totals.failed_payments_count += 1;
          totals.revenue_at_risk_cents += toNumber(r.risk_amount_cents);
        } else if (ft === 'estimated_cost') {
          totals.estimated_cost_cents += toNumber(r.amount_cents);
        } else if (ft === 'refund') {
          totals.refunds_amount_cents += toNumber(r.amount_cents);
        } else if (ft === 'chargeback') {
          totals.chargebacks_amount_cents += toNumber(r.amount_cents);
        }
      }
    }

    totals.net_cash_revenue_cents =
      totals.gross_cash_revenue_cents - totals.refunds_amount_cents - totals.chargebacks_amount_cents;

    const gross_margin_cents = totals.net_cash_revenue_cents - totals.estimated_cost_cents;
    const gross_margin_pct =
      totals.net_cash_revenue_cents === 0
        ? 0
        : Math.round((gross_margin_cents / totals.net_cash_revenue_cents) * 10000) / 100;

    // Estado actual (snapshot): si es global admin, usamos vista; si no, calculamos por user_id.
    let state: any = {};
    if (scopedUserId == null) {
      const { data: stateRows, error: stateErr } = await supabaseAdmin
        .from('finance_state_current_v')
        .select('*');

      if (stateErr) {
        return res.status(500).json({ error: `finance_state_current_v error: ${stateErr.message}` });
      }

      state = (stateRows?.[0] ?? {}) as any;
    } else {
      const { data: subs, error: subsErr } = await supabaseAdmin
        .from('subscriptions')
        .select('status, billing_type, amount, activation_state')
        .eq('user_id', scopedUserId)
        .in('status', ['active', 'trialing']);

      if (subsErr) {
        return res.status(500).json({ error: `subscriptions error: ${subsErr.message}` });
      }

      const activeSubs = subs ?? [];
      const paidCount = activeSubs.filter((s: any) => s.activation_state === 'paid').length;
      const provisionedCount = activeSubs.filter((s: any) => s.activation_state === 'provisioned').length;
      const onAirCount = activeSubs.filter((s: any) => s.activation_state === 'on_air').length;
      const failedCount = activeSubs.filter((s: any) => s.activation_state === 'failed').length;

      let mrrCents = 0;
      for (const s of activeSubs) {
        if (s.status !== 'active') continue; // trialing no cuenta como MRR
        const amount = toNumber(s.amount); // nominal mensual o anual según billing_type
        const centsPerUnit = Math.round(amount * 100);
        if ((s.billing_type ?? '') === 'annual') {
          mrrCents += Math.round(centsPerUnit / 12);
        } else {
          mrrCents += centsPerUnit;
        }
      }

      // Active SIMs: slots asignados a user con cualquier status (equivalente al OR del view).
      const { count: slotsCount, error: slotsErr } = await supabaseAdmin
        .from('slots')
        .select('slot_id', { count: 'exact' })
        .eq('assigned_to', scopedUserId)
        ;

      if (slotsErr) {
        return res.status(500).json({ error: `slots error: ${slotsErr.message}` });
      }

      const activeSubscriptionsCount = activeSubs.length;

      state = {
        active_subscriptions_count: activeSubscriptionsCount,
        active_sims_count: slotsCount ?? 0,
        mrr_cents: mrrCents,
        arr_cents: mrrCents * 12,
        paid_count: paidCount,
        provisioned_count: provisionedCount,
        on_air_count: onAirCount,
        failed_count: failedCount,
      };
    }

    return res.status(200).json({
      cash_revenue_cents: totals.cash_revenue_cents,
      gross_cash_revenue_cents: totals.gross_cash_revenue_cents,
      refunds_amount_cents: totals.refunds_amount_cents,
      chargebacks_amount_cents: totals.chargebacks_amount_cents,
      net_cash_revenue_cents: totals.net_cash_revenue_cents,
      booked_sales_cents: totals.booked_sales_cents,
      booked_monthly_equivalent_cents: totals.booked_monthly_equivalent_cents,
      mrr_cents: toNumber(state.mrr_cents),
      arr_cents: toNumber(state.arr_cents),
      failed_payments_count: totals.failed_payments_count,
      revenue_at_risk_cents: totals.revenue_at_risk_cents,
      estimated_cost_cents: totals.estimated_cost_cents,
      gross_margin_cents,
      gross_margin_pct,

      active_subscriptions_count: toNumber(state.active_subscriptions_count),
      active_sims_count: toNumber(state.active_sims_count),

      paid_count: toNumber(state.paid_count),
      provisioned_count: toNumber(state.provisioned_count),
      on_air_count: toNumber(state.on_air_count),
      failed_count: toNumber(state.failed_count),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Unknown error', timestamp: new Date().toISOString() });
  }
}
