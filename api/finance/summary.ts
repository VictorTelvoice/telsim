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

function toNumber(v: any): number {
  if (v == null) return 0;
  const n = typeof v === 'string' ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body ?? {};
  const now = new Date();

  const start = body.startDate ? new Date(body.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const end = body.endDate ? new Date(body.endDate) : now;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid startDate/endDate' });
  }

  const startDateOnly = start.toISOString().slice(0, 10); // YYYY-MM-DD
  const endDateOnly = end.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const { data: ledgerRows, error: ledgerErr } = await supabaseAdmin
      .from('billing_ledger_v')
      .select(
        'cash_revenue_cents, booked_sales_cents, booked_monthly_equivalent_cents, failed_payments_count, revenue_at_risk_cents, churn_count, estimated_cost_cents, period_date'
      )
      .gte('period_date', startDateOnly)
      .lte('period_date', endDateOnly);

    if (ledgerErr) {
      return res.status(500).json({ error: `billing_ledger_v error: ${ledgerErr.message}` });
    }

    const totals = (ledgerRows ?? []).reduce(
      (acc: any, r: any) => {
        acc.cash_revenue_cents += toNumber(r.cash_revenue_cents);
        acc.booked_sales_cents += toNumber(r.booked_sales_cents);
        acc.booked_monthly_equivalent_cents += toNumber(r.booked_monthly_equivalent_cents);
        acc.failed_payments_count += toNumber(r.failed_payments_count);
        acc.revenue_at_risk_cents += toNumber(r.revenue_at_risk_cents);
        acc.churn_count += toNumber(r.churn_count);
        return acc;
      },
      {
        cash_revenue_cents: 0,
        booked_sales_cents: 0,
        booked_monthly_equivalent_cents: 0,
        failed_payments_count: 0,
        revenue_at_risk_cents: 0,
        churn_count: 0,
      }
    );

    const { data: stateRows, error: stateErr } = await supabaseAdmin
      .from('finance_state_current_v')
      .select('*');

    if (stateErr) {
      return res.status(500).json({ error: `finance_state_current_v error: ${stateErr.message}` });
    }

    const state = (stateRows?.[0] ?? {}) as any;

    return res.status(200).json({
      cash_revenue_cents: totals.cash_revenue_cents,
      booked_sales_cents: totals.booked_sales_cents,
      booked_monthly_equivalent_cents: totals.booked_monthly_equivalent_cents,
      mrr_cents: toNumber(state.mrr_cents),
      arr_cents: toNumber(state.arr_cents),
      failed_payments_count: totals.failed_payments_count,
      revenue_at_risk_cents: totals.revenue_at_risk_cents,

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

