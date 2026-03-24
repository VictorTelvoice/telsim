import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Unlock, LayoutGrid, List, AlertCircle, CheckCircle2, Search, ChevronUp, ChevronDown } from 'lucide-react';

export type SlotRow = {
  slot_id: string;
  phone_number: string | null;
  status: string;
  assigned_to: string | null;
  plan_type: string | null;
  user_email?: string | null;
};
type SlotUserJoin = { email: string | null };

type ViewMode = 'table' | 'mosaic';
type CeoFilter = 'all' | 'error' | 'free' | 'occupied';
type SortKey = 'slot_id' | 'status' | 'phone_number' | 'user';

/**
 * Gestiona los slots: tabla y mosaico de inventario.
 * Filtros CEO: SIMs con Error (rojo, mantenimiento) y SIMs Libres (verde, inventario disponible).
 */
const InventoryManager: React.FC = () => {
  const [searchParams] = useSearchParams();
  const userFilterId = searchParams.get('user')?.trim() || null;

  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [freeing, setFreeing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('mosaic');
  const [ceoFilter, setCeoFilter] = useState<CeoFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('slot_id');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotRow | null>(null);

  const fetchSlots = useCallback(async () => {
    const { data: slotsData, error } = await supabase
      .from('slots')
      .select('slot_id, phone_number, status, assigned_to, plan_type, users(email)')
      .order('slot_id', { ascending: true });

    if (error) {
      const { data: slotsOnly } = await supabase
        .from('slots')
        .select('slot_id, phone_number, status, assigned_to, plan_type')
        .order('slot_id', { ascending: true });
      const rows = (slotsOnly || []) as { slot_id: string; phone_number: string | null; status: string; assigned_to: string | null; plan_type: string | null }[];
      setSlots(
        rows.map((s) => ({
          slot_id: s.slot_id,
          phone_number: s.phone_number,
          status: s.status ?? 'libre',
          assigned_to: s.assigned_to,
          plan_type: s.plan_type,
          user_email: null,
        }))
      );
      return;
    }

    if (!slotsData?.length) {
      setSlots([]);
      return;
    }

    setSlots(
      (slotsData as (SlotRow & { users?: SlotUserJoin | SlotUserJoin[] | null })[]).map((s) => {
        const userRow = Array.isArray(s.users) ? s.users[0] : s.users;
        return ({
        slot_id: s.slot_id,
        phone_number: s.phone_number,
        status: s.status ?? 'libre',
        assigned_to: s.assigned_to,
        plan_type: s.plan_type,
        user_email: userRow?.email ?? null,
      });
      })
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSlots().finally(() => setLoading(false));
  }, [fetchSlots]);

  const filteredSlots = useMemo(() => {
    let list = slots;
    if (userFilterId) {
      list = list.filter((s) => s.assigned_to === userFilterId);
    }
    if (ceoFilter === 'all') {
      // no filter
    } else if (ceoFilter === 'error') {
      list = list.filter((s) => (s.status || '').toLowerCase() === 'error');
    } else if (ceoFilter === 'free') {
      list = list.filter((s) => !s.assigned_to);
    } else if (ceoFilter === 'occupied') {
      list = list.filter((s) => s.assigned_to != null);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          (s.slot_id || '').toLowerCase().includes(q) ||
          (s.phone_number || '').toLowerCase().includes(q) ||
          (s.assigned_to || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [slots, ceoFilter, userFilterId, searchQuery]);

  const sortedSlots = useMemo(() => {
    const arr = [...filteredSlots];
    const mult = sortAsc ? 1 : -1;
    arr.sort((a, b) => {
      let va: string, vb: string;
      if (sortKey === 'slot_id') {
        va = a.slot_id || '';
        vb = b.slot_id || '';
      } else if (sortKey === 'status') {
        va = (a.status || '').toLowerCase();
        vb = (b.status || '').toLowerCase();
      } else if (sortKey === 'phone_number') {
        va = a.phone_number || '';
        vb = b.phone_number || '';
      } else {
        va = a.user_email || a.assigned_to || '';
        vb = b.user_email || b.assigned_to || '';
      }
      return va.localeCompare(vb) * mult;
    });
    return arr;
  }, [filteredSlots, sortKey, sortAsc]);

  const errorCount = useMemo(() => slots.filter((s) => (s.status || '').toLowerCase() === 'error').length, [slots]);
  const freeCount = useMemo(() => slots.filter((s) => !s.assigned_to).length, [slots]);
  const occupiedCount = useMemo(() => slots.filter((s) => s.assigned_to != null).length, [slots]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  /** Liberación vía POST /api/manage action=cancel (único camino autorizado). */
  const liberarSlot = async (slotId: string) => {
    if (!confirm('¿Liberar este slot? Se pondrá estado libre y se quitará la asignación de usuario.')) return;
    setFreeing(slotId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'cancel', slot_id: slotId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Error al liberar el slot: ${(data as { error?: string }).error || res.statusText}`);
        return;
      }

      await fetchSlots();
      setSelectedSlot(null);
    } finally {
      setFreeing(null);
    }
  };

  const slotStatusStyle = (s: SlotRow) => {
    const status = (s.status || '').toLowerCase();
    if (status === 'error') return { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-600', label: 'Error' };
    if (!s.assigned_to) return { bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-600', label: 'Libre' };
    return { bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-600', label: 'Ocupado' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 py-6 px-2 sm:px-4">
      {userFilterId && (
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Mostrando solo slots del usuario <code className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded">{userFilterId.slice(0, 8)}…</code>
          {' · '}
          <Link to="/admin/inventory" className="font-medium underline">Ver todos</Link>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Gestión de inventario</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vista</span>
            <button
              onClick={() => setViewMode('mosaic')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'mosaic' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              title="Mosaico"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              title="Tabla"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Buscador + Filtros CEO */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Slot ID (ej: 43A), Número (ej: 56953687365) o ID de usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm shadow-sm"
            />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtros CEO</span>
          <button
            onClick={() => setCeoFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              ceoFilter === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({slots.length})
          </button>
          <button
            onClick={() => setCeoFilter('free')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              ceoFilter === 'free' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'
            }`}
            title="assigned_to es NULL"
          >
            <CheckCircle2 size={14} />
            Libres ({freeCount})
          </button>
          <button
            onClick={() => setCeoFilter('occupied')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              ceoFilter === 'occupied' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
            }`}
            title="assigned_to NO es NULL"
          >
            Ocupados ({occupiedCount})
          </button>
          <button
            onClick={() => setCeoFilter('error')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              ceoFilter === 'error' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
            }`}
            title="status === 'error'"
          >
            <AlertCircle size={14} />
            Error ({errorCount})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {viewMode === 'mosaic' ? (
        <>
          <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {sortedSlots.map((s) => {
              const style = slotStatusStyle(s);
              return (
                <button
                  key={s.slot_id}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`${style.bg} border rounded-xl p-3 text-left transition-all hover:ring-2 hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400`}
                >
                  <div className="font-mono text-sm font-bold text-slate-900 mb-1 truncate" title={s.slot_id}>
                    {s.slot_id}
                  </div>
                  <div className="text-xs text-slate-600 font-mono truncate mb-1" title={s.phone_number || 'Sin número'}>
                    {s.phone_number || '—'}
                  </div>
                  <div className="flex items-center justify-end">
                    <span className={`text-[10px] font-bold ${style.text}`}>{style.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {sortedSlots.length === 0 && (
            <p className="text-sm text-slate-500 py-8 text-center">
              {searchQuery.trim() ? 'No hay slots que coincidan con la búsqueda.' : ceoFilter === 'all' ? 'No hay slots.' : ceoFilter === 'error' ? 'No hay SIMs con error.' : ceoFilter === 'free' ? 'No hay SIMs libres.' : 'No hay SIMs ocupadas.'}
            </p>
          )}
        </>
      ) : (
        <div className="overflow-x-auto -mx-px">
            <table className="w-full text-left min-w-[640px]" role="grid" aria-label="Inventario de slots">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('slot_id')}
                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors rounded-lg px-2 py-1.5 -ml-2 ${
                        sortKey === 'slot_id' ? 'text-slate-800 bg-slate-200/80' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      slot_id
                      {sortKey === 'slot_id' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors rounded-lg px-2 py-1.5 -ml-2 ${
                        sortKey === 'status' ? 'text-slate-800 bg-slate-200/80' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      Estado
                      {sortKey === 'status' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('phone_number')}
                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors rounded-lg px-2 py-1.5 -ml-2 ${
                        sortKey === 'phone_number' ? 'text-slate-800 bg-slate-200/80' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      phone_number
                      {sortKey === 'phone_number' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('user')}
                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors rounded-lg px-2 py-1.5 -ml-2 ${
                        sortKey === 'user' ? 'text-slate-800 bg-slate-200/80' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      Usuario (assigned_to)
                      {sortKey === 'user' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </button>
                  </th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3 w-28">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sortedSlots.map((s) => {
                  const style = slotStatusStyle(s);
                  return (
                    <tr
                      key={s.slot_id}
                      className="border-b border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-slate-800">{s.slot_id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-mono">{s.phone_number || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[200px]" title={s.user_email || s.assigned_to || ''}>
                        {s.user_email ? (
                          s.user_email
                        ) : s.assigned_to ? (
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {s.assigned_to.slice(0, 8)}…
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.assigned_to && (
                          <button
                            onClick={() => liberarSlot(s.slot_id)}
                            disabled={freeing === s.slot_id}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-bold disabled:opacity-50"
                            title="Liberar slot"
                          >
                            {freeing === s.slot_id ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                            Liberar Slot
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      )}
      </div>

      {/* Modal / panel detalle slot (mosaico) */}
      {selectedSlot && viewMode === 'mosaic' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setSelectedSlot(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Detalle del slot"
        >
          <div
            className={`rounded-2xl border p-5 max-w-sm w-full shadow-xl bg-white ${slotStatusStyle(selectedSlot).bg} border-slate-200`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono font-bold text-slate-900">{selectedSlot.slot_id}</h3>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500 text-xs uppercase font-bold">phone_number</dt>
                <dd className="font-mono text-slate-800">{selectedSlot.phone_number || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase font-bold">Estado</dt>
                <dd><span className={slotStatusStyle(selectedSlot).text}>{slotStatusStyle(selectedSlot).label}</span></dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase font-bold">Usuario (assigned_to)</dt>
                <dd className="text-slate-700 truncate" title={selectedSlot.user_email || selectedSlot.assigned_to || ''}>
                  {selectedSlot.user_email ? (
                    selectedSlot.user_email
                  ) : selectedSlot.assigned_to ? (
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {selectedSlot.assigned_to.slice(0, 8)}…
                    </span>
                  ) : (
                    '--'
                  )}
                </dd>
              </div>
            </dl>
            {selectedSlot.assigned_to && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => liberarSlot(selectedSlot.slot_id)}
                  disabled={freeing === selectedSlot.slot_id}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40 text-sm font-bold disabled:opacity-50"
                >
                  {freeing === selectedSlot.slot_id ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
                  Liberar Slot
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
