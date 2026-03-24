import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  MessageSquare, ChevronRight, Loader2, RefreshCw,
  AlertCircle, Clock, CheckCircle2, Search, Tag,
  Users, Inbox, BarChart2,
} from 'lucide-react';

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  category: string;
  created_at: string;
  updated_at: string | null;
  user_email?: string | null;
  message_count?: number;
};

const STATUS_CFG = {
  open:    { label: 'Abierto',    dot: 'bg-blue-500',   text: 'text-blue-600',   badge: 'bg-blue-50 text-blue-600 border border-blue-100',     icon: AlertCircle },
  pending: { label: 'Respondido', dot: 'bg-amber-400',  text: 'text-amber-600',  badge: 'bg-amber-50 text-amber-600 border border-amber-100',  icon: Clock },
  closed:  { label: 'Cerrado',    dot: 'bg-slate-400',  text: 'text-slate-500',  badge: 'bg-slate-100 text-slate-500 border border-slate-200', icon: CheckCircle2 },
} as const;

const CATEGORY_CFG: Record<string, { label: string; color: string }> = {
  technical: { label: 'Técnico',     color: 'text-violet-600' },
  billing:   { label: 'Facturación', color: 'text-emerald-600' },
  sales:     { label: 'Ventas',      color: 'text-sky-600' },
  account:   { label: 'Cuenta',      color: 'text-amber-600' },
  other:     { label: 'Otro',        color: 'text-slate-500' },
};

const SupportCenter: React.FC = () => {
  const navigate = useNavigate();
  const [all, setAll]         = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [filterStatus, setFilterStatus]     = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [lastFetch, setLastFetch] = useState(new Date());

  const fetchTickets = useCallback(async () => {
    setError(null);

    const query = supabase
      .from('support_tickets')
      .select('id, user_id, subject, status, category, created_at, updated_at')
      .order('updated_at', { ascending: false, nullsFirst: false });

    const { data: rows, error: err } = await query;

    if (err) {
      if (err.code === '42703') {
        const { data: rows2, error: err2 } = await supabase
          .from('support_tickets')
          .select('id, user_id, subject, status, category, created_at')
          .order('created_at', { ascending: false });
        if (err2) { setError(`${err2.message} (${err2.code})`); setAll([]); return; }
        return processRows(rows2 ?? []);
      }
      setError(`${err.message} (${err.code})`);
      setAll([]);
      return;
    }

    await processRows(rows ?? []);
  }, []);

  const processRows = async (
    rows: Array<Pick<SupportTicket, 'id' | 'user_id' | 'subject' | 'status' | 'category' | 'created_at'> & { updated_at?: string | null }>
  ) => {
    if (!rows.length) { setAll([]); setLastFetch(new Date()); return; }

    const ids = [...new Set(rows.map(r => r.user_id))];
    const { data: users } = await supabase.from('users').select('id, email').in('id', ids);
    const emailMap: Record<string, string> = {};
    (users ?? []).forEach((u: { id: string; email: string }) => { emailMap[u.id] = u.email; });

    const ticketIds = rows.map(r => r.id);
    const { data: msgs } = await supabase
      .from('support_messages')
      .select('ticket_id')
      .in('ticket_id', ticketIds);
    const countMap: Record<string, number> = {};
    (msgs ?? []).forEach((m: { ticket_id: string }) => {
      countMap[m.ticket_id] = (countMap[m.ticket_id] ?? 0) + 1;
    });

    setAll(rows.map(r => ({
      ...r,
      category: r.category ?? 'technical',
      updated_at: (r as SupportTicket).updated_at ?? (r as SupportTicket).created_at ?? null,
      user_email: emailMap[r.user_id] ?? null,
      message_count: countMap[r.id] ?? 0,
    })));
    setLastFetch(new Date());
  };

  useEffect(() => {
    setLoading(true);
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  useEffect(() => {
    const ch = supabase.channel('admin-tickets-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchTickets())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchTickets]);

  const stats = {
    open:    all.filter(t => t.status === 'open').length,
    pending: all.filter(t => t.status === 'pending').length,
    closed:  all.filter(t => t.status === 'closed').length,
  };

  const filtered = all.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.subject?.toLowerCase().includes(q) && !t.user_email?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const timeAgo = (iso: string | null) => {
    if (!iso) return '—';
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'Ahora'; if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Soporte / Tickets</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona las solicitudes de soporte de tus usuarios</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchTickets().finally(() => setLoading(false)); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {(['open', 'pending', 'closed'] as const).map(s => {
          const cfg = STATUS_CFG[s];
          const Icon = cfg.icon;
          const isActive = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(isActive ? 'all' : s)}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left shadow-sm ${
                isActive
                  ? 'bg-white border-primary ring-2 ring-primary/10'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cfg.badge}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">{stats[s]}</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">{cfg.label}</p>
              </div>
              {isActive && <div className={`ml-auto w-2 h-2 rounded-full ${cfg.dot}`} />}
            </button>
          );
        })}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm font-bold text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por asunto o email..."
            className="w-full pl-9 pr-4 h-9 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-300 outline-none focus:border-primary transition-colors"
          />
        </div>
        <select
          value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 outline-none focus:border-primary transition-colors"
        >
          <option value="all">Todas las categorías</option>
          {Object.entries(CATEGORY_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(['all', 'open', 'pending', 'closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 h-9 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                filterStatus === s
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Realtime indicator ── */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Realtime activo · {filtered.length} ticket{filtered.length !== 1 ? 's' : ''} · actualizado {timeAgo(lastFetch.toISOString())}
        </p>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 size={28} className="text-slate-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 flex flex-col items-center gap-3 text-center shadow-sm">
          <Inbox size={40} className="text-slate-300" />
          <p className="text-slate-500 font-bold">
            {all.length === 0 ? 'Sin tickets todavía' : 'Sin resultados para este filtro'}
          </p>
          <p className="text-slate-400 text-xs">
            {all.length === 0
              ? 'Cuando un usuario abra un ticket aparecerá aquí en tiempo real.'
              : 'Prueba cambiando los filtros de búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-[1fr_160px_110px_110px_80px_40px] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
            {['Ticket', 'Usuario', 'Categoría', 'Estado', 'Fecha', ''].map((h, i) => (
              <p key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</p>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {filtered.map(t => {
              const sc  = STATUS_CFG[t.status]  ?? STATUS_CFG.open;
              const cat = CATEGORY_CFG[t.category] ?? CATEGORY_CFG.other;
              const Icon = sc.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`/admin/support/${t.id}`)}
                  className="w-full grid grid-cols-[1fr_160px_110px_110px_80px_40px] gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left items-center group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                      {t.subject || 'Sin asunto'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MessageSquare size={10} className="text-slate-300" />
                      <span className="text-[10px] text-slate-400">{t.message_count} mensaje{t.message_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                    <Users size={11} className="text-slate-300 shrink-0" />
                    {t.user_email ?? <span className="text-slate-300 font-mono text-[10px]">{t.user_id.slice(0,8)}…</span>}
                  </p>

                  <p className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${cat.color}`}>
                    <Tag size={10} />
                    {cat.label}
                  </p>

                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${sc.badge} w-fit`}>
                    <Icon size={9} />
                    {sc.label}
                  </span>

                  <p className="text-[11px] text-slate-400 font-bold">
                    {timeAgo(t.updated_at ?? t.created_at)}
                  </p>

                  <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      {!loading && all.length > 0 && (
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
          <span className="flex items-center gap-1.5"><BarChart2 size={11} /> {all.length} ticket{all.length !== 1 ? 's' : ''} en total</span>
          <span>{stats.open} abierto{stats.open !== 1 ? 's' : ''} · {stats.pending} respondido{stats.pending !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
};

export default SupportCenter;
