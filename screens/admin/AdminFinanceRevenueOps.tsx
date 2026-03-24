import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Download, RefreshCw } from 'lucide-react';

type FinanceSummary = {
  cash_revenue_cents: number;
  gross_cash_revenue_cents: number;
  refunds_amount_cents: number;
  chargebacks_amount_cents: number;
  net_cash_revenue_cents: number;
  booked_sales_cents: number;
  booked_monthly_equivalent_cents: number;
  mrr_cents: number;
  arr_cents: number;
  failed_payments_count: number;
  revenue_at_risk_cents: number;
  estimated_cost_cents: number;
  gross_margin_cents: number;
  gross_margin_pct: number;
  active_subscriptions_count: number;
  active_sims_count: number;
  paid_count: number;
  provisioned_count: number;
  on_air_count: number;
  failed_count: number;
};

type FinanceLedgerEvent = {
  id: string;
  stripe_event_id?: string;
  finance_event_type: string;
  plan_name: string | null;
  billing_type: string | null;
  occurred_at: string;
  user_id: string | null;
  amount_cents: string | number | null;
  risk_amount_cents: string | number | null;
  currency: string;
  subscription_id: string | null;
  slot_id: string | null;
  metadata: any;
};

type TrendsRow = {
  date: string; // YYYY-MM-DD
  label: string;
  cash: number;
  booked: number;
  bookedMonthlyEquivalent: number;
};

const formatCents = (cents: number, currency = 'USD') => {
  const code = (currency || 'USD').toUpperCase();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
  }).format((cents || 0) / 100);
};

function parseCents(v: any): number {
  if (v == null) return 0;
  const n = typeof v === 'string' ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(v: any): string {
  const s = v == null ? '' : String(v);
  const needsQuotes = s.includes(',') || s.includes('"') || s.includes('\n');
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

const AdminFinanceRevenueOps: React.FC = () => {
  const { session } = useAuth();

  const token = session?.access_token;
  const authHeaders = useMemo(() => {
    if (!token) return null;
    return {
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const [loading, setLoading] = useState(true);
  const [summary7d, setSummary7d] = useState<FinanceSummary | null>(null);
  const [summary30d, setSummary30d] = useState<FinanceSummary | null>(null);

  const [trendDays, setTrendDays] = useState<7 | 14 | 30>(14);
  const [ledgerStartDate, setLedgerStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [ledgerEndDate, setLedgerEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [ledgerTypes, setLedgerTypes] = useState<string[]>([
    'cash_revenue',
    'booked_revenue',
    'payment_failed_attempt',
    'churn_event',
    'refund',
    'chargeback',
  ]);
  const [ledgerUserId, setLedgerUserId] = useState<string>('');
  const [ledgerPlanName, setLedgerPlanName] = useState<string>('');

  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [ledgerLimit] = useState(100);
  const [ledgerEvents, setLedgerEvents] = useState<FinanceLedgerEvent[]>([]);
  const [ledgerTotalLoaded, setLedgerTotalLoaded] = useState(0);

  const [trends, setTrends] = useState<TrendsRow[]>([]);

  const buildDateRange = useCallback((days: number) => {
    const end = new Date();
    const start = new Date(end.getTime());
    start.setDate(start.getDate() - (days - 1));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, []);

  const fetchSummary = useCallback(
    async (days: number) => {
      if (!authHeaders) throw new Error('Missing auth token');
      const { startDate, endDate } = buildDateRange(days);
      const res = await fetch('/api/finance/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ startDate, endDate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load summary');
      return json as FinanceSummary;
    },
    [authHeaders, buildDateRange]
  );

  const fetchTrends = useCallback(
    async () => {
      if (!authHeaders) return;
      const { startDate, endDate } = buildDateRange(trendDays);
      const res = await fetch('/api/finance/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          startDate,
          endDate,
          granularity: 'day',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load trends');

      const rows = (json?.rows ?? []) as {
        period_date: string;
        cash_revenue_cents: number;
        booked_sales_cents: number;
        booked_monthly_equivalent_cents: number;
      }[];

      setTrends(
        rows.map((r) => {
          const key = r.period_date?.slice(0, 10) ?? '';
          const d = key ? new Date(key + 'T00:00:00.000Z') : null;
          const label = d ? d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : key;
          return {
            date: key,
            label,
            cash: r.cash_revenue_cents ?? 0,
            booked: r.booked_sales_cents ?? 0,
            bookedMonthlyEquivalent: r.booked_monthly_equivalent_cents ?? 0,
          } as TrendsRow;
        })
      );
    },
    [authHeaders, buildDateRange, trendDays]
  );

  const fetchLedger = useCallback(
    async (reset: boolean) => {
      if (!authHeaders) return;
      const { startDate, endDate } = { startDate: ledgerStartDate, endDate: ledgerEndDate };

      const res = await fetch('/api/finance/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          startDate,
          endDate,
          financeEventTypes: ledgerTypes,
          userId: ledgerUserId || undefined,
          planName: ledgerPlanName || undefined,
          limit: ledgerLimit,
          offset: reset ? 0 : ledgerOffset,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load ledger');

      const events = (json?.events ?? []) as FinanceLedgerEvent[];
      if (reset) {
        setLedgerEvents(events);
        setLedgerOffset(0);
        setLedgerTotalLoaded(events.length);
      } else {
        setLedgerEvents((prev) => [...prev, ...events]);
        setLedgerOffset((o) => o + events.length);
        setLedgerTotalLoaded((n) => n + events.length);
      }
    },
    [
      authHeaders,
      ledgerEndDate,
      ledgerLimit,
      ledgerOffset,
      ledgerPlanName,
      ledgerStartDate,
      ledgerTypes,
      ledgerUserId,
    ]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s7, s30] = await Promise.all([fetchSummary(7), fetchSummary(30)]);
      setSummary7d(s7);
      setSummary30d(s30);
      await fetchTrends();
      await fetchLedger(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchLedger, fetchSummary, fetchTrends]);

  useEffect(() => {
    if (!authHeaders) return;
    refreshAll().catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  useEffect(() => {
    if (!authHeaders) return;
    fetchTrends()
      .then(() => undefined)
      .catch((e) => console.error(e));
  }, [authHeaders, fetchTrends, trendDays]);

  const trendsChart = useMemo(() => {
    // Simple 3-line svg chart (cash / booked / bookedMonthlyEquivalent)
    const maxVal = Math.max(
      1,
      ...trends.flatMap((r) => [r.cash, r.booked, r.bookedMonthlyEquivalent])
    );
    const width = 600;
    const height = 160;
    const padding = { top: 10, right: 20, bottom: 26, left: 46 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const points = trends.map((row, i) => {
      const x = padding.left + (i / Math.max(1, trends.length - 1)) * innerW;
      const yCash = padding.top + innerH - (row.cash / maxVal) * innerH;
      const yBooked = padding.top + innerH - (row.booked / maxVal) * innerH;
      const yBookedMonthly = padding.top + innerH - (row.bookedMonthlyEquivalent / maxVal) * innerH;
      return { x, yCash, yBooked, yBookedMonthly, label: row.label };
    });

    const toPath = (ys: (p: any) => number) => {
      if (points.length === 0) return '';
      return points
        .map((p, i) => {
          const cmd = i === 0 ? 'M' : 'L';
          return `${cmd} ${p.x} ${ys(p)}`;
        })
        .join(' ');
    };

    return {
      width,
      height,
      padding,
      points,
      pathCash: toPath((p) => p.yCash),
      pathBooked: toPath((p) => p.yBooked),
      pathBookedMonthly: toPath((p) => p.yBookedMonthly),
      maxVal,
    };
  }, [trends]);

  const exportCurrentLedgerCsv = useCallback(() => {
    if (ledgerEvents.length === 0) return;
    const header = [
      'occurred_at',
      'finance_event_type',
      'user_id',
      'plan_name',
      'billing_type',
      'amount_cents',
      'risk_amount_cents',
      'currency',
      'subscription_id',
      'slot_id',
      'stripe_event_id',
    ];
    const rows = ledgerEvents.map((ev) => [
      ev.occurred_at,
      ev.finance_event_type,
      ev.user_id,
      ev.plan_name,
      ev.billing_type,
      ev.amount_cents,
      ev.risk_amount_cents,
      ev.currency,
      ev.subscription_id,
      ev.slot_id,
      ev.stripe_event_id ?? '',
    ]);
    const csv = [header, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\n');
    const filename = `finance_ledger_${ledgerStartDate}_to_${ledgerEndDate}.csv`;
    downloadCsv(filename, csv);
  }, [ledgerEndDate, ledgerEvents, ledgerStartDate]);

  if (loading && !summary7d && !summary30d) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Cash Revenue 7d', value: formatCents(summary7d?.cash_revenue_cents ?? 0) },
    { label: 'Gross Cash Revenue 30d', value: formatCents(summary30d?.gross_cash_revenue_cents ?? 0) },
    { label: 'Booked Sales 30d', value: formatCents(summary30d?.booked_sales_cents ?? 0) },
    { label: 'Booked Monthly Equivalent 30d', value: formatCents(summary30d?.booked_monthly_equivalent_cents ?? 0) },
    { label: 'Refunds Amount 30d', value: formatCents(summary30d?.refunds_amount_cents ?? 0) },
    { label: 'Chargebacks Amount 30d', value: formatCents(summary30d?.chargebacks_amount_cents ?? 0) },
    { label: 'Net Cash Revenue 30d', value: formatCents(summary30d?.net_cash_revenue_cents ?? 0) },
    { label: 'Estimated Cost 30d', value: formatCents(summary30d?.estimated_cost_cents ?? 0) },
    { label: 'Gross Margin 30d (net)', value: formatCents(summary30d?.gross_margin_cents ?? 0) },
    { label: 'Gross Margin % (net)', value: `${summary30d?.gross_margin_pct ?? 0}%` },
    { label: 'MRR', value: formatCents(summary30d?.mrr_cents ?? 0) },
    { label: 'ARR', value: formatCents(summary30d?.arr_cents ?? 0) },
    { label: 'Revenue at Risk', value: formatCents(summary30d?.revenue_at_risk_cents ?? 0) },
    { label: 'Failed Payments Count', value: String(summary30d?.failed_payments_count ?? 0) },
    { label: 'Active Subscriptions', value: String(summary30d?.active_subscriptions_count ?? 0) },
    { label: 'Active SIMs', value: String(summary30d?.active_sims_count ?? 0) },
  ];

  const funnel = [
    { label: 'paid', value: summary30d?.paid_count ?? 0 },
    { label: 'provisioned', value: summary30d?.provisioned_count ?? 0 },
    { label: 'on_air', value: summary30d?.on_air_count ?? 0 },
    { label: 'failed', value: summary30d?.failed_count ?? 0 },
  ];

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-black text-slate-900">Revenue Ops</h1>
          <p className="text-sm text-slate-500">KPIs, tendencias y drilldown financiero (Fase 5)</p>
        </div>
        <button
          onClick={() => refreshAll()}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-700 flex items-center gap-2"
          disabled={loading}
          title="Refrescar"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      {/* 1) Resumen ejecutivo */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Resumen ejecutivo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.label}</p>
              <p className="text-lg font-black text-slate-900 mt-2 tabular-nums">{c.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2) Activation funnel */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mt-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Activation funnel</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {funnel.map((f) => (
            <div key={f.label} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</p>
              <p className="text-lg font-black text-slate-900 mt-2 tabular-nums">{f.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3) Revenue trends */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mt-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Revenue trends</h2>
            <p className="text-sm text-slate-500">cash_revenue / booked_revenue por período</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ventana</label>
            <select
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
              value={trendDays}
              onChange={(e) => setTrendDays(Number(e.target.value) as any)}
              disabled={loading}
            >
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${trendsChart.width} ${trendsChart.height}`} className="w-full h-[190px]">
            <defs>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="bookedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="bookedEqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(147 51 234)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(147 51 234)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Grid */}
            {Array.from({ length: 4 }).map((_, i) => {
              const y = trendsChart.padding.top + (i / 3) * (trendsChart.height - trendsChart.padding.top - trendsChart.padding.bottom);
              return <line key={i} x1={trendsChart.padding.left} x2={trendsChart.width - trendsChart.padding.right} y1={y} y2={y} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />;
            })}

            {/* Lines */}
            <path d={trendsChart.pathCash} fill="none" stroke="rgb(16 185 129)" strokeWidth="2" strokeLinecap="round" />
            <path d={trendsChart.pathBooked} fill="none" stroke="rgb(59 130 246)" strokeWidth="2" strokeLinecap="round" />
            <path d={trendsChart.pathBookedMonthly} fill="none" stroke="rgb(147 51 234)" strokeWidth="2" strokeLinecap="round" />

            {/* Points */}
            {trendsChart.points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.yCash} r="3" fill="rgb(16 185 129)" />
                <circle cx={p.x} cy={p.yBooked} r="3" fill="rgb(59 130 246)" />
                <circle cx={p.x} cy={p.yBookedMonthly} r="3" fill="rgb(147 51 234)" />
              </g>
            ))}

            {/* X labels (show fewer if long) */}
            {trendsChart.points.map((p, i) => {
              const shouldShow = trendDays >= 30 ? i % 5 === 0 : trendDays >= 14 ? i % 2 === 0 : i % 1 === 0;
              if (!shouldShow) return null;
              return (
                <text key={i} x={p.x} y={trendsChart.height - 10} textAnchor="middle" fontSize="10" fill="rgba(71,85,105,0.9)">
                  {p.label}
                </text>
              );
            })}
          </svg>

          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> cash
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> booked
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> booked monthly eq
              </span>
            </div>
            <div className="text-xs text-slate-400 tabular-nums">{formatCents(trendsChart.maxVal)}</div>
          </div>
        </div>
      </section>

      {/* 4) Ledger / drilldown */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mt-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Ledger / drilldown</h2>
            <p className="text-sm text-slate-500">Filtra y exporta desde `finance_events`.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCurrentLedgerCsv}
              disabled={ledgerEvents.length === 0}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4">
          <div className="lg:col-span-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Start</label>
            <input type="date" value={ledgerStartDate} onChange={(e) => setLedgerStartDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800" />
          </div>
          <div className="lg:col-span-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">End</label>
            <input type="date" value={ledgerEndDate} onChange={(e) => setLedgerEndDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800" />
          </div>
          <div className="lg:col-span-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Plan</label>
            <input placeholder="plan_name" value={ledgerPlanName} onChange={(e) => setLedgerPlanName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800" />
          </div>
          <div className="lg:col-span-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">User (opcional)</label>
            <input placeholder="user_id" value={ledgerUserId} onChange={(e) => setLedgerUserId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800" />
          </div>

          <div className="lg:col-span-12">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'cash_revenue', label: 'cash_revenue' },
                { key: 'booked_revenue', label: 'booked_revenue' },
                { key: 'payment_failed_attempt', label: 'payment_failed_attempt' },
                { key: 'churn_event', label: 'churn_event' },
                { key: 'refund', label: 'refund' },
                { key: 'chargeback', label: 'chargeback' },
              ].map((t) => {
                const checked = ledgerTypes.includes(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() =>
                      setLedgerTypes((prev) => (prev.includes(t.key) ? prev.filter((x) => x !== t.key) : [...prev, t.key]))
                    }
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition ${
                      checked ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    type="button"
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="lg:col-span-12 flex items-center justify-end gap-2">
            <button
              onClick={() => fetchLedger(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition disabled:opacity-50"
              disabled={loading}
              type="button"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-separate" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                {[
                  'Fecha',
                  'finance_event_type',
                  'Usuario',
                  'Plan',
                  'billing_type',
                  'amount_cents',
                  'risk_amount_cents',
                  'Moneda',
                  'subscription_id',
                  'slot_id',
                ].map((h) => (
                  <th key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2 border-b border-slate-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledgerEvents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    Sin eventos para el período.
                  </td>
                </tr>
              ) : (
                ledgerEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-600">
                      {ev.occurred_at ? new Date(ev.occurred_at).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-700 font-black text-[12px]">
                      {ev.finance_event_type}
                    </td>
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-600">
                      {ev.user_id ?? '—'}
                    </td>
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-600">
                      {ev.plan_name ?? '—'}
                    </td>
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-600">
                      {ev.billing_type ?? '—'}
                    </td>
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-900 font-black tabular-nums">
                      {ev.amount_cents == null ? '—' : formatCents(parseCents(ev.amount_cents), ev.currency)}
                    </td>
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-900 font-black tabular-nums">
                      {ev.risk_amount_cents == null ? '—' : formatCents(parseCents(ev.risk_amount_cents), ev.currency)}
                    </td>
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-600">
                      {(ev.currency || 'USD').toUpperCase()}
                    </td>
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-600">
                      {ev.subscription_id ?? '—'}
                    </td>
                    <td className="px-2 py-3 border-b border-slate-100 text-slate-600">
                      {ev.slot_id ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 mt-4">
          <p className="text-xs text-slate-500">Cargados: {ledgerTotalLoaded}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await fetchLedger(false);
                } catch (err) {
                  console.error(err);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={ledgerEvents.length < ledgerLimit}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition disabled:opacity-50 text-slate-700"
              type="button"
            >
              Cargar más
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminFinanceRevenueOps;

