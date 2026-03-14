import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Unlock, LayoutGrid, List, AlertCircle, CheckCircle2, Signal } from 'lucide-react';

export type SlotRow = {
  slot_id: string;
  phone_number: string | null;
  status: string;
  assigned_to: string | null;
  plan_type: string | null;
  user_email?: string | null;
  /** Opcional: 4G, 5G, LTE, etc. Si la tabla slots tiene columna signal */
  signal?: string | null;
};

type ViewMode = 'table' | 'mosaic';
type CeoFilter = 'all' | 'error' | 'free';

/**
 * Gestiona los slots: tabla y mosaico de inventario.
 * Filtros CEO: SIMs con Error (rojo, mantenimiento) y SIMs Libres (verde, inventario disponible).
 */
const InventoryManager: React.FC = () => {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [freeing, setFreeing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('mosaic');
  const [ceoFilter, setCeoFilter] = useState<CeoFilter>('all');
  const [selectedSlot, setSelectedSlot] = useState<SlotRow | null>(null);

  const fetchSlots = useCallback(async () => {
    const { data: slotsData } = await supabase
      .from('slots')
      .select('*, users(*)')
      .order('slot_id', { ascending: true });

    if (!slotsData?.length) {
      setSlots([]);
      return;
    }

    setSlots(
      (slotsData as (SlotRow & { users?: { id: string; email: string | null } | null; signal?: string | null })[]).map((s) => ({
        slot_id: s.slot_id,
        phone_number: s.phone_number,
        status: s.status ?? 'libre',
        assigned_to: s.assigned_to,
        plan_type: s.plan_type,
        user_email: s.users?.email ?? (s.assigned_to ? null : null),
        signal: s.signal ?? null,
      }))
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSlots().finally(() => setLoading(false));
  }, [fetchSlots]);

  const filteredSlots = useMemo(() => {
    if (ceoFilter === 'all') return slots;
    if (ceoFilter === 'error') return slots.filter((s) => (s.status || '').toLowerCase() === 'error');
    if (ceoFilter === 'free') return slots.filter((s) => (s.status || '').toLowerCase() === 'libre');
    return slots;
  }, [slots, ceoFilter]);

  const liberarSlot = async (slotId: string) => {
    if (!confirm('¿Liberar este slot? Se pondrá estado libre y se quitará la asignación de usuario.')) return;
    setFreeing(slotId);
    try {
      await supabase
        .from('slots')
        .update({ status: 'libre', assigned_to: null, plan_type: null })
        .eq('slot_id', slotId);
      await fetchSlots();
      setSelectedSlot(null);
    } finally {
      setFreeing(null);
    }
  };

  const slotStatusStyle = (s: SlotRow) => {
    const status = (s.status || '').toLowerCase();
    if (status === 'error') return { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-300', label: 'Error' };
    if (status === 'libre') return { bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-300', label: 'Libre' };
    return { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-300', label: 'Ocupado' };
  };

  const SignalIndicator: React.FC<{ signal?: string | null }> = ({ signal }) => {
    if (!signal) return <span className="text-slate-500 text-[10px]">—</span>;
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
        <Signal size={10} className="text-slate-500" />
        {signal}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-1">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-white mb-1">Gestión de inventario</h2>
          <p className="text-sm text-slate-400">
            Tabla o mosaico de slots. Filtros CEO: SIMs con error (mantenimiento) y SIMs libres (inventario).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vista</span>
          <button
            onClick={() => setViewMode('mosaic')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'mosaic' ? 'bg-slate-700 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}
            title="Mosaico"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-slate-700 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}
            title="Tabla"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Filtros CEO */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtros CEO</span>
        <button
          onClick={() => setCeoFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            ceoFilter === 'all' ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Todos ({slots.length})
        </button>
        <button
          onClick={() => setCeoFilter('error')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            ceoFilter === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-300'
          }`}
          title="SIMs con error para enviar a mantenimiento"
        >
          <AlertCircle size={14} />
          SIMs con Error ({slots.filter((s) => (s.status || '').toLowerCase() === 'error').length})
        </button>
        <button
          onClick={() => setCeoFilter('free')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            ceoFilter === 'free' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-300'
          }`}
          title="Inventario disponible para vender"
        >
          <CheckCircle2 size={14} />
          SIMs Libres ({slots.filter((s) => (s.status || '').toLowerCase() === 'libre').length})
        </button>
      </div>

      {viewMode === 'mosaic' ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
            {filteredSlots.map((s) => {
              const style = slotStatusStyle(s);
              return (
                <button
                  key={s.slot_id}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`${style.bg} border rounded-xl p-3 text-left transition-all hover:ring-2 hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-white/30`}
                >
                  <div className="font-mono text-sm font-bold text-white mb-1 truncate" title={s.slot_id}>
                    {s.slot_id}
                  </div>
                  <div className="text-xs text-slate-300 font-mono truncate mb-1" title={s.phone_number || 'Sin número'}>
                    {s.phone_number || '—'}
                  </div>
                  <div className="flex items-center justify-between">
                    <SignalIndicator signal={s.signal} />
                    <span className={`text-[10px] font-bold ${style.text}`}>{style.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredSlots.length === 0 && (
            <p className="text-sm text-slate-500 py-8 text-center">
              {ceoFilter === 'all' ? 'No hay slots.' : ceoFilter === 'error' ? 'No hay SIMs con error.' : 'No hay SIMs libres.'}
            </p>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">ID de Slot</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Estado</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Número</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Señal</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Email del usuario</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3 w-28">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlots.map((s) => {
                  const style = slotStatusStyle(s);
                  return (
                    <tr
                      key={s.slot_id}
                      className={`border-b border-slate-800 ${s.status === 'ocupado' ? 'bg-slate-800/30' : 'bg-slate-900/30'}`}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-slate-300">{s.slot_id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">{s.phone_number || '—'}</td>
                      <td className="px-4 py-3"><SignalIndicator signal={s.signal} /></td>
                      <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-[200px]" title={s.user_email ?? ''}>
                        {s.user_email || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {s.status === 'ocupado' && (
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
        </div>
      )}

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
            className={`rounded-2xl border p-5 max-w-sm w-full shadow-xl ${slotStatusStyle(selectedSlot).bg} border-slate-700`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono font-bold text-white">{selectedSlot.slot_id}</h3>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500 text-xs uppercase font-bold">Teléfono</dt>
                <dd className="font-mono text-slate-200">{selectedSlot.phone_number || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase font-bold">Señal</dt>
                <dd><SignalIndicator signal={selectedSlot.signal} /></dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase font-bold">Estado</dt>
                <dd><span className={slotStatusStyle(selectedSlot).text}>{slotStatusStyle(selectedSlot).label}</span></dd>
              </div>
              {selectedSlot.user_email && (
                <div>
                  <dt className="text-slate-500 text-xs uppercase font-bold">Usuario</dt>
                  <dd className="text-slate-300 truncate" title={selectedSlot.user_email}>{selectedSlot.user_email}</dd>
                </div>
              )}
            </dl>
            {(selectedSlot.status || '').toLowerCase() === 'ocupado' && (
              <div className="mt-4 pt-4 border-t border-slate-700">
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
