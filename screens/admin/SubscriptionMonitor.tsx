import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, Loader2, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import AdminFicha360 from '../../components/admin/AdminFicha360';

export type SubRow = {
  id: string;
  user_id: string;
  plan_name: string | null;
  amount: number | null;
  billing_type: string | null;
  status: string | null;
  created_at: string;
  trial_end: string | null;
  user_email?: string | null;
  user_nombre?: string | null;
  next_payment?: string | null;
};

const PLAN_LABEL: Record<string, string> = {
  Starter: 'Starter',
  Pro: 'Pro',
  Power: 'Power',
};

/** Formato DD/MM/YYYY */
function formatDDMMYYYY(isoOrUnix: string | number | null | undefined): string {
  if (isoOrUnix == null) return '—';
  const d = typeof isoOrUnix === 'number'
    ? new Date(isoOrUnix * 1000)
    : new Date(isoOrUnix);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Calcula próximo cobro: current_period_end (unix) o renewal_date (iso) o created_at + 1 mes/año según billing_type */
function computeNextPayment(
  row: { current_period_end?: number | null; renewal_date?: string | null; created_at: string; billing_type?: string | null }
): string {
  if (row.current_period_end != null && row.current_period_end > 0) {
    return formatDDMMYYYY(row.current_period_end);
  }
  if (row.renewal_date) {
    return formatDDMMYYYY(row.renewal_date);
  }
  const created = new Date(row.created_at);
  if (Number.isNaN(created.getTime())) return '—';
  const next = new Date(created);
  const bt = (row.billing_type || '').toLowerCase();
  if (bt === 'annual' || bt === 'anual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return formatDDMMYYYY(next.toISOString());
}

/** Badge de colores por status */
function StatusBadge({ status }: { status: string | null }) {
  const s = (status || '').toLowerCase();
  const label = s === 'past_due' ? 'Past due' : (status || '—');
  const classes =
    s === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'trialing'
        ? 'bg-slate-100 text-slate-600'
        : s === 'canceled' || s === 'cancelled'
          ? 'bg-red-100 text-red-700'
          : s === 'past_due'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wide ${classes}`}>
      {label}
    </span>
  );
}

type SortKey = 'user_id' | 'created_at' | 'next_payment' | 'status';
type SortDir = 'asc' | 'desc';

/**
 * Monitor de suscripciones: Fecha Creación, USER_ID (tooltip nombre/email), Plan, Ciclo, Precio, Próximo Cobro, Estado.
 * Ordenamiento por columnas. Gráfico de notificaciones últimos 7 días.
 */
const SubscriptionMonitor: React.FC = () => {
  const { user } = useAuth();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMorosos, setFilterMorosos] = useState(false);
  const [filterAltas, setFilterAltas] = useState(false);
  const [fichaUserId, setFichaUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [last7Days, setLast7Days] = useState<Array<{ date: string; count: number }>>([]);

  const fetchSubs = useCallback(async () => {
    const { data: subsData, error } = await supabase
      .from('subscriptions')
      .select('id, plan_name, amount, billing_type, status, subscription_status, created_at, user_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SubscriptionMonitor] Error cargando suscripciones:', error);
      setSubs([]);
      return;
    }

    const rows = (subsData || []) as Array<{
      id: string;
      user_id: string;
      plan_name: string | null;
      amount: number | null;
      billing_type: string | null;
      status?: string | null;
      subscription_status?: string | null;
      created_at: string;
    }>;

    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    let userMap: Record<string, { nombre: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, nombre, email')
        .in('id', userIds);
      (usersData || []).forEach((u: { id: string; nombre?: string | null; email?: string | null }) => {
        userMap[u.id] = { nombre: u.nombre ?? null, email: u.email ?? null };
      });
    }

    setSubs(
      rows.map((s) => ({
        id: s.id,
        user_id: s.user_id,
        plan_name: s.plan_name,
        amount: s.amount,
        billing_type: s.billing_type ?? null,
        status: (s.status ?? s.subscription_status ?? null) as string | null,
        created_at: s.created_at,
        trial_end: null,
        user_email: userMap[s.user_id]?.email ?? null,
        user_nombre: userMap[s.user_id]?.nombre ?? null,
        next_payment: computeNextPayment({
          created_at: s.created_at,
          billing_type: s.billing_type,
        }),
      }))
    );
  }, []);

  const fetchNotificationStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-notification-stats', userId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.last7Days)) setLast7Days(data.last7Days);
      else setLast7Days([]);
    } catch {
      setLast7Days([]);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    fetchSubs().finally(() => setLoading(false));
  }, [fetchSubs]);

  useEffect(() => {
    fetchNotificationStats();
  }, [fetchNotificationStats]);

  const filtered = useMemo(
    () =>
      subs.filter((s) => {
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const matchId = (s.id || '').toLowerCase().includes(q);
          const matchUser = (s.user_id || '').toLowerCase().includes(q);
          const matchPlan = (s.plan_name || '').toLowerCase().includes(q);
          if (!matchId && !matchUser && !matchPlan) return false;
        }
        const st = (s.status || '').toLowerCase();
        if (filterMorosos && st !== 'past_due') return false;
        if (filterAltas) {
          const isHigh = s.plan_name === 'Power' || (s.amount != null && s.amount >= 99);
          if (!isHigh) return false;
        }
        return true;
      }),
    [subs, searchQuery, filterMorosos, filterAltas]
  );

  const filteredAndSorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'user_id') cmp = (a.user_id || '').localeCompare(b.user_id || '');
      else if (sortBy === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === 'next_payment') cmp = (a.next_payment || '').localeCompare(b.next_payment || '');
      else if (sortBy === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const maxCount = Math.max(1, ...last7Days.map((d) => d.count));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900 mb-1">Suscripciones (Ventas)</h2>
          <p className="text-sm text-slate-500 mb-4">
            Fecha creación · Próximo cobro (Stripe o calculado por ciclo). Ordena por columnas. Tooltip en USER_ID: nombre y email.
          </p>

          {/* Gráfico últimos 7 días: notificaciones enviadas */}
          {last7Days.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Notificaciones enviadas (últimos 7 días)</p>
              <div className="flex items-end gap-1 h-16">
                {last7Days.map(({ date, count }) => (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full min-h-[4px] rounded-t bg-slate-200 overflow-hidden"
                      style={{ height: `${Math.max(4, (count / maxCount) * 48)}px` }}
                      title={`${date}: ${count}`}
                    >
                      <div className="h-full w-full bg-emerald-500 rounded-t" />
                    </div>
                    <span className="text-[10px] text-slate-500">{date.slice(8)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            type="search"
            placeholder="Buscar por ID, user_id o plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm mb-4"
          />
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <Filter size={16} />
              Filtros:
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterMorosos}
                onChange={(e) => setFilterMorosos(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-slate-700">Solo Morosos</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterAltas}
                onChange={(e) => setFilterAltas(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-slate-700">Suscripciones Altas</span>
            </label>
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('user_id')}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      USER_ID
                      {sortBy === 'user_id' ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                    </button>
                  </th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Plan</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Ciclo</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Precio exacto</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('created_at')}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      Fecha Creación
                      {sortBy === 'created_at' ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                    </button>
                  </th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('next_payment')}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      Próximo Cobro
                      {sortBy === 'next_payment' ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                    </button>
                  </th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('status')}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      Estado Real
                      {sortBy === 'status' ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setFichaUserId(s.user_id)}
                    className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                  >
                    <td
                      className="px-4 py-3 text-sm text-slate-800 truncate max-w-[220px] font-mono text-xs"
                      title={`Nombre: ${s.user_nombre ?? '—'}\nEmail: ${s.user_email ?? '—'}`}
                    >
                      {s.user_id ? (
                        <Link
                          to={`/admin/users?search=${encodeURIComponent(s.user_id)}`}
                          className="text-emerald-600 hover:text-emerald-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {s.user_id}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {s.plan_name ? PLAN_LABEL[s.plan_name] ?? s.plan_name : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {s.billing_type === 'annual' ? 'Anual' : s.billing_type === 'monthly' ? 'Mensual' : s.billing_type ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {s.amount != null ? `$${Number(s.amount).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {formatDDMMYYYY(s.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {s.next_payment || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center bg-slate-50/50">
              <CreditCard size={40} className="mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500">
                {filterMorosos || filterAltas ? 'No hay suscripciones que coincidan con los filtros.' : 'No hay suscripciones.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <AdminFicha360
        open={fichaUserId !== null}
        onClose={() => setFichaUserId(null)}
        userId={fichaUserId}
      />
    </div>
  );
};

export default SubscriptionMonitor;
