import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Star, RefreshCw, Loader2, MessageSquare, Users, TrendingUp, Inbox } from 'lucide-react';

interface Rating {
  id: string;
  user_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  user_email?: string | null;
}

const STAR_COLORS = ['', 'text-red-500', 'text-orange-400', 'text-amber-400', 'text-lime-500', 'text-emerald-500'];
const STAR_BG    = ['', 'bg-red-50 border-red-100', 'bg-orange-50 border-orange-100', 'bg-amber-50 border-amber-100', 'bg-lime-50 border-lime-100', 'bg-emerald-50 border-emerald-100'];
const STAR_LABEL = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

const AdminRatings: React.FC = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStar, setFilterStar] = useState(0); // 0 = all
  const [lastFetch, setLastFetch] = useState(new Date());

  const fetchRatings = useCallback(async () => {
    const { data: rows } = await supabase
      .from('user_ratings')
      .select('id, user_id, rating, comment, created_at')
      .order('created_at', { ascending: false });

    if (!rows?.length) { setRatings([]); setLastFetch(new Date()); return; }

    // Two-step: get emails from public.users
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const { data: users } = await supabase.from('users').select('id, email').in('id', ids);
    const emailMap: Record<string, string> = {};
    (users ?? []).forEach((u: { id: string; email: string }) => { emailMap[u.id] = u.email; });

    setRatings(rows.map(r => ({ ...r, user_email: r.user_id ? (emailMap[r.user_id] ?? null) : null })));
    setLastFetch(new Date());
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRatings().finally(() => setLoading(false));
  }, [fetchRatings]);

  /* ─── Stats ─────────────────────────────────────────────────────────────── */
  const total = ratings.length;
  const avg = total ? (ratings.reduce((s, r) => s + r.rating, 0) / total) : 0;
  const dist = [1, 2, 3, 4, 5].map(n => ({ star: n, count: ratings.filter(r => r.rating === n).length }));
  const withComment = ratings.filter(r => r.comment?.trim()).length;

  const filtered = filterStar === 0 ? ratings : ratings.filter(r => r.rating === filterStar);

  const timeAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'Ahora'; if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24); if (d < 30) return `${d}d`;
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const StarDisplay: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size} className={n <= value ? `${STAR_COLORS[value]} fill-current` : 'text-slate-200 fill-current'} />
      ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Encuestas de Satisfacción</h2>
          <p className="text-sm text-slate-500 mt-0.5">Calificaciones de usuarios al cerrar sesión</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchRatings().finally(() => setLoading(false)); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {/* Average */}
        <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Promedio</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-slate-900 leading-none">{avg ? avg.toFixed(1) : '—'}</p>
            <Star size={20} className={avg >= 4 ? 'text-amber-400 fill-amber-400 mb-0.5' : 'text-slate-300 fill-slate-300 mb-0.5'} />
          </div>
          {total > 0 && <StarDisplay value={Math.round(avg)} size={13} />}
        </div>

        {/* Total responses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Respuestas</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-slate-900 leading-none">{total}</p>
            <Users size={18} className="text-slate-300 mb-0.5" />
          </div>
          <p className="text-[11px] text-slate-400">encuestas totales</p>
        </div>

        {/* With comment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Con comentario</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-slate-900 leading-none">{withComment}</p>
            <MessageSquare size={18} className="text-slate-300 mb-0.5" />
          </div>
          <p className="text-[11px] text-slate-400">{total ? Math.round(withComment / total * 100) : 0}% del total</p>
        </div>

        {/* Trend (5-star %) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Excelentes</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-slate-900 leading-none">
              {total ? Math.round(ratings.filter(r => r.rating === 5).length / total * 100) : 0}%
            </p>
            <TrendingUp size={18} className="text-emerald-400 mb-0.5" />
          </div>
          <p className="text-[11px] text-slate-400">calificaron 5 estrellas</p>
        </div>
      </div>

      {/* ── Distribution bar ── */}
      {total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Distribución por estrella</p>
          <div className="space-y-2.5">
            {[5,4,3,2,1].map(n => {
              const count = dist.find(d => d.star === n)?.count ?? 0;
              const pct = total ? (count / total) * 100 : 0;
              return (
                <button
                  key={n}
                  onClick={() => setFilterStar(filterStar === n ? 0 : n)}
                  className={`w-full flex items-center gap-3 group ${filterStar === n ? 'opacity-100' : 'opacity-80 hover:opacity-100'} transition-opacity`}
                >
                  <div className="flex items-center gap-1 w-24 shrink-0">
                    <Star size={12} className={`${STAR_COLORS[n]} fill-current`} />
                    <span className={`text-[11px] font-black ${STAR_COLORS[n]}`}>{STAR_LABEL[n]}</span>
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        n === 5 ? 'bg-emerald-400' : n === 4 ? 'bg-lime-400' : n === 3 ? 'bg-amber-400' : n === 2 ? 'bg-orange-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-16 shrink-0 flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-600">{count}</span>
                    <span className="text-[10px] text-slate-400">{pct.toFixed(0)}%</span>
                  </div>
                  {filterStar === n && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-primary shrink-0">Filtrado</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filter pill ── */}
      {filterStar > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Filtrando por:</span>
          <button
            onClick={() => setFilterStar(0)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black ${STAR_BG[filterStar]} ${STAR_COLORS[filterStar]}`}
          >
            <Star size={10} className="fill-current" /> {filterStar} estrella{filterStar > 1 ? 's' : ''} — {STAR_LABEL[filterStar]}
            <span className="ml-1 opacity-60">✕</span>
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 size={28} className="text-slate-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 flex flex-col items-center gap-3 text-center shadow-sm">
          <Inbox size={40} className="text-slate-300" />
          <p className="text-slate-500 font-bold">
            {total === 0 ? 'Aún no hay encuestas respondidas' : 'Sin resultados para este filtro'}
          </p>
          <p className="text-slate-400 text-xs">
            {total === 0 ? 'Las calificaciones aparecerán aquí cuando los usuarios cierren sesión.' : 'Prueba quitando el filtro de estrella.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-[1fr_140px_200px_100px] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
            {['Comentario', 'Calificación', 'Usuario', 'Fecha'].map((h, i) => (
              <p key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</p>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.map(r => (
              <div key={r.id} className="grid grid-cols-[1fr_140px_200px_100px] gap-4 px-5 py-4 items-start hover:bg-slate-50 transition-colors">
                {/* Comment */}
                <p className="text-sm text-slate-700 leading-relaxed">
                  {r.comment?.trim()
                    ? <span>"{r.comment.trim()}"</span>
                    : <span className="text-slate-300 italic text-xs">Sin comentario</span>
                  }
                </p>

                {/* Stars */}
                <div className="flex flex-col gap-1">
                  <StarDisplay value={r.rating} size={14} />
                  <span className={`text-[10px] font-black ${STAR_COLORS[r.rating]}`}>{STAR_LABEL[r.rating]}</span>
                </div>

                {/* User */}
                <p className="text-xs text-slate-500 truncate pt-0.5">
                  {r.user_email ?? <span className="text-slate-300 font-mono">{r.user_id?.slice(0, 10) ?? 'Anónimo'}…</span>}
                </p>

                {/* Date */}
                <p className="text-[11px] text-slate-400 font-bold pt-0.5">{timeAgo(r.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {!loading && total > 0 && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
          Mostrando {filtered.length} de {total} encuesta{total !== 1 ? 's' : ''} · Última actualización: {timeAgo(lastFetch.toISOString())}
        </p>
      )}
    </div>
  );
};

export default AdminRatings;
