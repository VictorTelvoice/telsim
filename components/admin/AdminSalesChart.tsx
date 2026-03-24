import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Loader2, ShoppingBag } from 'lucide-react';

type DayRevenue = { date: string; label: string; revenue: number };
type LastSale = { id: string; email: string | null; user_id: string | null; plan_name: string | null; amount: number | null; created_at: string; pais: string | null };
type SubscriptionUserJoin = { email: string | null; pais: string | null };

const COUNTRY_TO_CODE: Record<string, string> = {
  Chile: 'CL',
  Argentina: 'AR',
  México: 'MX',
  Colombia: 'CO',
  Perú: 'PE',
  España: 'ES',
  'United States': 'US',
  USA: 'US',
  Brazil: 'BR',
  Ecuador: 'EC',
};

function countryToFlag(pais: string | null): string {
  if (!pais || !pais.trim()) return '🌐';
  const name = pais.trim();
  const code = COUNTRY_TO_CODE[name] || (name.length === 2 ? name.toUpperCase() : null);
  if (!code || code.length !== 2) return '🌐';
  return code.split('').map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
}

/**
 * Gráfico de áreas (ingresos últimos 7 días) + lista Últimas 5 Ventas (email, plan, bandera país).
 * Datos: subscriptions (+ users para email y país) y audit_logs.
 */
const AdminSalesChart: React.FC = () => {
  const [days, setDays] = useState<DayRevenue[]>([]);
  const [lastSales, setLastSales] = useState<LastSale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const fromIso = sevenDaysAgo.toISOString();

    const { data: chartData } = await supabase
      .from('subscriptions')
      .select('created_at, amount')
      .gte('created_at', fromIso);

    const subsChart = (chartData || []) as { created_at: string; amount: number | null }[];
    const dayMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = 0;
    }
    subsChart.forEach((s) => {
      const key = s.created_at.slice(0, 10);
      if (dayMap[key] !== undefined) {
        dayMap[key] += s.amount != null ? Number(s.amount) : 0;
      }
    });

    const sortedKeys = Object.keys(dayMap).sort();
    setDays(
      sortedKeys.map((date) => ({
        date,
        label: new Date(date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }),
        revenue: dayMap[date],
      }))
    );

    const { data: lastSalesData, error: lastSalesError } = await supabase
      .from('subscriptions')
      .select('id, plan_name, amount, created_at, user_id, users(email, pais)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (lastSalesError) {
      const { data: fallbackData } = await supabase
        .from('subscriptions')
        .select('id, plan_name, amount, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);
      const fallback = (fallbackData || []) as { id: string; plan_name: string | null; amount: number | null; created_at: string; user_id: string }[];
      setLastSales(
        fallback.map((s) => ({
          id: s.id,
          email: null,
          user_id: s.user_id,
          plan_name: s.plan_name,
          amount: s.amount,
          created_at: s.created_at,
          pais: null,
        }))
      );
    } else {
      const subsLast = (lastSalesData || []) as {
        id: string;
        plan_name: string | null;
        amount: number | null;
        created_at: string;
        user_id?: string;
        users?: SubscriptionUserJoin | SubscriptionUserJoin[] | null;
      }[];
      setLastSales(
        subsLast.map((s) => {
          const userRow = Array.isArray(s.users) ? s.users[0] : s.users;
          return ({
          id: s.id,
          email: userRow?.email ?? null,
          user_id: s.user_id ?? null,
          plan_name: s.plan_name,
          amount: s.amount,
          created_at: s.created_at,
          pais: userRow?.pais ?? null,
        });
        })
      );
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={28} className="text-slate-400 animate-spin" />
      </div>
    );
  }

    const maxRevenue = Math.max(1, ...days.map((d) => d.revenue));
  const chartWidth = 400;
  const chartHeight = 140;
  const padding = { top: 8, right: 8, bottom: 24, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const points = days.map((d, i) => {
    const x = padding.left + (i / Math.max(1, days.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (d.revenue / maxRevenue) * innerHeight;
    return { x, y, ...d };
  });
  const areaPath =
    points.length > 0
      ? [
          `M ${points[0].x} ${padding.top + innerHeight}`,
          ...points.map((p) => `L ${p.x} ${p.y}`),
          `L ${points[points.length - 1].x} ${padding.top + innerHeight}`,
          'Z',
        ].join(' ')
      : '';
  const linePath = points.length > 0 ? 'M ' + points.map((p) => `${p.x} ${p.y}`).join(' L ') : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ingresos últimos 7 días</h3>
            <p className="text-xs text-slate-500">Por día desde suscripciones</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[160px]" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#salesAreaGradient)" />
          <path d={linePath} fill="none" stroke="rgb(16 185 129)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="rgb(16 185 129)" />
          ))}
        </svg>
        <div className="flex justify-between px-1 mt-1 text-[10px] text-slate-500">
          {days.map((d) => (
            <span key={d.date} title={d.label}>
              {d.label}
            </span>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400">
          <span>$0</span>
          <span>${maxRevenue.toFixed(0)}</span>
        </div>
      </div>

      <div className="p-5 pt-0">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <ShoppingBag size={14} />
          Últimas 5 ventas
        </h4>
        <ul className="space-y-2">
          {lastSales.length === 0 ? (
            <li className="text-sm text-slate-500 py-4 text-center">No hay ventas recientes</li>
          ) : (
            lastSales.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <span className="text-xl flex-shrink-0" title={s.pais || 'País'}>
                  {countryToFlag(s.pais)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.email || s.user_id || '—'}</p>
                  <p className="text-xs text-slate-500">
                    {s.plan_name || '—'} · {s.amount != null ? `$${Number(s.amount).toFixed(2)}` : '—'}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(s.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default AdminSalesChart;
