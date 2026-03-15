import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, Loader2, ChevronUp, ChevronDown, Copy, X, Download, ExternalLink } from 'lucide-react';
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
  stripe_subscription_id?: string | null;
  ltv?: number;
};

const PLAN_LABEL: Record<string, string> = {
  Starter: 'Starter',
  Pro: 'Pro',
  Power: 'Power',
};

const STRIPE_LIVEMODE = (import.meta as unknown as { env?: { VITE_STRIPE_LIVEMODE?: string } }).env?.VITE_STRIPE_LIVEMODE !== 'false';
function stripeSubscriptionUrl(subscriptionId: string | null | undefined): string {
  const id = subscriptionId?.trim?.();
  if (!id || id.length < 3) return '#';
  const base = STRIPE_LIVEMODE ? 'https://dashboard.stripe.com' : 'https://dashboard.stripe.com/test';
  return `${base}/subscriptions/${encodeURIComponent(id)}`;
}

/** Formato YYYY-MM-DD para Excel/CSV */
function formatYYYYMMDD(isoOrDDMMYYYY: string | null | undefined): string {
  if (!isoOrDDMMYYYY) return '';
  const s = String(isoOrDDMMYYYY).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${month}-${day}`;
}

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

/** Badge de colores: verde active, amarillo trialing, rojo canceled, ámbar past_due */
function StatusBadge({ status }: { status: string | null }) {
  const s = (status || '').toLowerCase();
  const label = s === 'past_due' ? 'Past due' : (status || '—');
  const classes =
    s === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'trialing'
        ? 'bg-amber-100 text-amber-700'
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

/** Fila de tabla con fallback si algo falla al renderizar */
function SubscriptionTableRow({
  s,
  idx,
  page,
  pageSize,
  tooltipRowId,
  setTooltipRowId,
  setFichaUserId,
  copyToClipboard,
}: {
  s: SubRow;
  idx: number;
  page: number;
  pageSize: number;
  tooltipRowId: string | null;
  setTooltipRowId: (id: string | null) => void;
  setFichaUserId: (id: string | null) => void;
  copyToClipboard: (text: string, e: React.MouseEvent) => void;
}) {
  try {
    const rowId = s?.id ?? '';
    const userId = s?.user_id ?? '';
    const ltv = s?.ltv ?? 0;
    const stripeId = s?.stripe_subscription_id ?? null;
    const nombre = (s?.user_nombre ?? s?.user_email) ? (s?.user_nombre ?? '—') : 'Desconocido';
    const email = s?.user_email ?? 'Desconocido';

    return (
      <tr
        key={rowId}
        onClick={() => setFichaUserId(userId || null)}
        className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer"
      >
        <td className="w-12 text-center text-slate-400 text-xs font-medium px-2 py-3">
          {(page - 1) * pageSize + idx + 1}
        </td>
        <td
          className="px-4 py-3 max-w-[220px] relative"
          onMouseEnter={() => setTooltipRowId(rowId)}
          onMouseLeave={() => setTooltipRowId(null)}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {userId ? (
              <>
                <Link
                  to={`/admin/users?search=${encodeURIComponent(userId)}`}
                  className="text-[10px] font-mono text-slate-400 hover:text-slate-600 truncate min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {userId}
                </Link>
                <button
                  type="button"
                  onClick={(e) => copyToClipboard(userId, e)}
                  className="flex-shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  title="Copiar UUID"
                >
                  <Copy size={12} />
                </button>
              </>
            ) : (
              <span className="text-[10px] text-slate-400">—</span>
            )}
          </div>
          {tooltipRowId === rowId && (
            <div className="absolute left-4 top-full z-20 mt-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs shadow-lg border border-slate-700 min-w-[180px]">
              <p className="font-semibold text-slate-200">Nombre:</p>
              <p className="text-white truncate">{nombre}</p>
              <p className="font-semibold text-slate-200 mt-1">Email:</p>
              <p className="text-white truncate">{email}</p>
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
          {s?.plan_name ? (PLAN_LABEL[s.plan_name] ?? s.plan_name) : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 min-w-0">
            {stripeId ? (
              <>
                <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]" title={stripeId}>
                  {stripeId}
                </span>
                <a
                  href={stripeSubscriptionUrl(stripeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 p-0.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                  title="Abrir en Stripe Dashboard"
                >
                  <ExternalLink size={12} />
                </a>
              </>
            ) : (
              <span className="text-[10px] text-slate-400">—</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">
          {s?.billing_type === 'annual' ? 'Anual' : s?.billing_type === 'monthly' ? 'Mensual' : (s?.billing_type ?? '—')}
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-semibold text-slate-900">
            {s?.amount != null ? `$${Number(s.amount).toFixed(2)}` : '—'}
          </span>
        </td>
        <td className="px-4 py-3 relative group">
          {ltv > 0 ? (
            <span
              className={`text-sm font-semibold ${ltv >= 500 ? 'text-emerald-600 font-bold' : 'text-slate-700'}`}
              title={`Este cliente ha generado $${Number(ltv).toFixed(2)} en ingresos totales`}
            >
              ${Number(ltv).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          )}
          {ltv > 0 && (
            <div className="absolute left-4 top-full z-20 mt-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs shadow-lg border border-slate-700 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Este cliente ha generado ${Number(ltv).toFixed(2)} en ingresos totales.
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
          {formatDDMMYYYY(s?.created_at)}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
          {s?.next_payment || '—'}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={s?.status ?? null} />
        </td>
      </tr>
    );
  } catch (err) {
    console.error('[SubscriptionMonitor] Error renderizando fila:', s, err);
    return (
      <tr key={s?.id ?? idx} className="border-b border-slate-100 bg-red-50/50">
        <td colSpan={10} className="px-4 py-3 text-sm text-red-600">
          Error al cargar esta fila. Revisa la consola.
        </td>
      </tr>
    );
  }
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceled' | 'trialing'>('all');
  const [fichaUserId, setFichaUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [last7Days, setLast7Days] = useState<Array<{ date: string; count: number }>>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tooltipRowId, setTooltipRowId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const copyToClipboard = useCallback((text: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => showToast('Copiado'));
  }, [showToast]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
  }, []);

  const filteredByDateAndSearch = useMemo(
    () =>
      subs.filter((s) => {
        if (!s) return false;
        const created = s?.created_at ? new Date(s.created_at).getTime() : 0;
        if (Number.isNaN(created)) return false;
        if (dateFrom) {
          const from = new Date(dateFrom + 'T00:00:00').getTime();
          if (created < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo + 'T23:59:59.999').getTime();
          if (created > to) return false;
        }
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const matchId = (s?.id || '').toLowerCase().includes(q);
          const matchUser = (s?.user_id || '').toLowerCase().includes(q);
          const matchPlan = (s?.plan_name || '').toLowerCase().includes(q);
          if (!matchId && !matchUser && !matchPlan) return false;
        }
        return true;
      }),
    [subs, searchQuery, dateFrom, dateTo]
  );

  const statusCounts = useMemo(() => {
    const total = filteredByDateAndSearch.length;
    const active = filteredByDateAndSearch.filter((s) => (s?.status || '').toLowerCase() === 'active').length;
    const canceled = filteredByDateAndSearch.filter((s) => {
      const st = (s?.status || '').toLowerCase();
      return st === 'canceled' || st === 'cancelled';
    }).length;
    const trialing = filteredByDateAndSearch.filter((s) => (s?.status || '').toLowerCase() === 'trialing').length;
    return { total, active, canceled, trialing };
  }, [filteredByDateAndSearch]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return filteredByDateAndSearch;
    return filteredByDateAndSearch.filter((s) => {
      const st = (s?.status || '').toLowerCase();
      if (statusFilter === 'active') return st === 'active';
      if (statusFilter === 'canceled') return st === 'canceled' || st === 'cancelled';
      if (statusFilter === 'trialing') return st === 'trialing';
      return true;
    });
  }, [filteredByDateAndSearch, statusFilter]);

  const filteredAndSorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      const aCreated = (a?.created_at && !Number.isNaN(new Date(a.created_at).getTime())) ? new Date(a.created_at).getTime() : 0;
      const bCreated = (b?.created_at && !Number.isNaN(new Date(b.created_at).getTime())) ? new Date(b.created_at).getTime() : 0;
      if (sortBy === 'user_id') cmp = (a?.user_id || '').localeCompare(b?.user_id || '');
      else if (sortBy === 'created_at') cmp = aCreated - bCreated;
      else if (sortBy === 'next_payment') cmp = (a?.next_payment || '').localeCompare(b?.next_payment || '');
      else if (sortBy === 'status') cmp = (a?.status || '').localeCompare(b?.status || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // Exporta exactamente lo que el CEO ve tras aplicar fechas, búsqueda y filtro de estado (todos los registros que coinciden)
  const exportCsv = useCallback(() => {
    showToast('Generando archivo de exportación...');
    const escapeCsv = (v: string): string => {
      const s = String(v ?? '').replace(/"/g, '""');
      return /[,"\n\r]/.test(s) ? `"${s}"` : s;
    };
    const rows = filteredAndSorted.filter(Boolean);
    const headers = [
      'ID Suscripción',
      'UUID Usuario',
      'Email Usuario',
      'Plan',
      'Suscripción (Stripe)',
      'Monto',
      'LTV',
      'Ciclo',
      'Estado',
      'Fecha Creación',
      'Próximo Cobro',
    ];
    const createdYmd = (iso: string) => formatYYYYMMDD(iso) || '';
    const nextYmd = (next: string | null | undefined) => formatYYYYMMDD(next) || '';
    const lines = [
      headers.map(escapeCsv).join(','),
      ...rows.map((s) =>
        [
          escapeCsv(s?.id ?? ''),
          escapeCsv(s?.user_id ?? ''),
          escapeCsv(s?.user_email ?? ''),
          escapeCsv(s?.plan_name ?? ''),
          escapeCsv(s?.stripe_subscription_id ?? ''),
          s?.amount != null ? String(s.amount) : '',
          (s?.ltv != null && s.ltv !== 0) ? String(s.ltv) : '',
          s?.billing_type === 'annual' ? 'Anual' : s?.billing_type === 'monthly' ? 'Mensual' : escapeCsv(s?.billing_type ?? ''),
          escapeCsv(s?.status ?? ''),
          createdYmd(s?.created_at ?? ''),
          nextYmd(s?.next_payment ?? ''),
        ].join(',')
      ),
    ];
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suscripciones_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => showToast('Exportación completada'), 400);
  }, [filteredAndSorted, showToast]);

  const fetchSubs = useCallback(async () => {
    const { data: subsData, error } = await supabase
      .from('subscriptions')
      .select('id, plan_name, amount, billing_type, status, subscription_status, created_at, user_id, stripe_subscription_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SubscriptionMonitor] Error cargando suscripciones:', error);
      setSubs([]);
      return;
    }

    const rawRows = (subsData || []) as Array<{
      id?: string;
      user_id?: string;
      plan_name?: string | null;
      amount?: number | null;
      billing_type?: string | null;
      status?: string | null;
      subscription_status?: string | null;
      created_at?: string;
      stripe_subscription_id?: string | null;
    } | null>;
    const rows = rawRows.filter((r): r is NonNullable<typeof r> => r != null && (r.id != null || r.user_id != null));

    const ltvByUser: Record<string, number> = {};
    rows.forEach((r) => {
      const uid = r.user_id;
      if (!uid) return;
      const amt = Number(r.amount) || 0;
      ltvByUser[uid] = (ltvByUser[uid] ?? 0) + amt;
    });

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
      rows.map((s) => {
        const uid = s?.user_id ?? '';
        const created = s?.created_at ?? '';
        let nextPayment = '—';
        try {
          nextPayment = computeNextPayment({
            created_at: created,
            billing_type: s?.billing_type,
          });
        } catch {
          nextPayment = '—';
        }
        return {
          id: s?.id ?? '',
          user_id: uid,
          plan_name: s?.plan_name ?? null,
          amount: s?.amount ?? null,
          billing_type: s?.billing_type ?? null,
          status: (s?.status ?? s?.subscription_status ?? null) as string | null,
          created_at: created,
          trial_end: null,
          user_email: userMap[uid]?.email ?? null,
          user_nombre: userMap[uid]?.nombre ?? null,
          next_payment: nextPayment,
          stripe_subscription_id: s?.stripe_subscription_id ?? null,
          ltv: uid ? (ltvByUser[uid] ?? 0) : 0,
        };
      })
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

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [filteredAndSorted.length, pageSize, currentPage]);

  const totalFiltered = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const displayedRows = useMemo(
    () => filteredAndSorted.filter((r): r is SubRow => r != null).slice((page - 1) * pageSize, page * pageSize),
    [filteredAndSorted, page, pageSize]
  );

  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = Number(e.target.value);
    setPageSize(v);
    setCurrentPage(1);
  }, []);

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

          {/* Gráfico últimos 7 días: notificaciones enviadas (notification_history) */}
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

          {/* Rango de fechas (Fecha Creación) + Limpiar filtros */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-sm font-medium text-slate-600">Rango de fechas (Fecha Creación):</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
            />
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium"
            >
              <X size={14} />
              Limpiar Filtros
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-medium"
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            <input
              type="search"
              placeholder="Buscar por ID, user_id o plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] max-w-md px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
            />
            <div className="flex items-center gap-2">
              <label htmlFor="page-size" className="text-sm font-medium text-slate-600 whitespace-nowrap">Mostrar</label>
              <select
                id="page-size"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-slate-500">registros</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2 py-1.5 rounded border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2 py-1.5 rounded border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
          {/* Filtros por estado: contadores dinámicos (recalculan con fechas y búsqueda). Filtro activo con borde y sombra. */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white ring-2 ring-slate-600 shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos
              <span className="inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded text-xs font-bold bg-slate-500 text-white">
                {statusCounts.total}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-500 shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Activas
              <span className={`inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded text-xs font-bold ${
                statusFilter === 'active' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {statusCounts.active}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('canceled')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'canceled'
                  ? 'bg-red-700 text-white ring-2 ring-red-500 shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Canceladas
              <span className={`inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded text-xs font-bold ${
                statusFilter === 'canceled' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
              }`}>
                {statusCounts.canceled}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('trialing')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'trialing'
                  ? 'bg-amber-600 text-white ring-2 ring-amber-500 shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Trialing
              <span className={`inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded text-xs font-bold ${
                statusFilter === 'trialing' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'
              }`}>
                {statusCounts.trialing}
              </span>
            </button>
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-12 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-3">N°</th>
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
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Suscripción</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Ciclo</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Precio exacto</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">LTV</th>
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
                {displayedRows.map((s, idx) => (
                  <SubscriptionTableRow
                    key={s?.id ?? `row-${idx}`}
                    s={s}
                    idx={idx}
                    page={page}
                    pageSize={pageSize}
                    tooltipRowId={tooltipRowId}
                    setTooltipRowId={setTooltipRowId}
                    setFichaUserId={setFichaUserId}
                    copyToClipboard={copyToClipboard}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center bg-slate-50/50">
              <CreditCard size={40} className="mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500">
                {statusFilter !== 'all' || dateFrom || dateTo || searchQuery.trim() ? 'No hay suscripciones que coincidan con los filtros.' : 'No hay suscripciones.'}
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

      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium shadow-lg animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default SubscriptionMonitor;
