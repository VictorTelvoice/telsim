import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Loader2, Unlock } from 'lucide-react';

export type SlotRow = {
  slot_id: string;
  phone_number: string | null;
  status: string;
  assigned_to: string | null;
  plan_type: string | null;
  user_email?: string | null;
};

/**
 * Gestiona los slots: consulta tabla slots y obtiene email del usuario
 * vía assigned_to (users). Botón Liberar Slot pone status libre y user_id null.
 */
const InventoryManager: React.FC = () => {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [freeing, setFreeing] = useState<string | null>(null);

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
      (slotsData as (SlotRow & { users?: { id: string; email: string | null } | null })[]).map((s) => ({
        slot_id: s.slot_id,
        phone_number: s.phone_number,
        status: s.status,
        assigned_to: s.assigned_to,
        plan_type: s.plan_type,
        user_email: s.users?.email ?? (s.assigned_to ? null : null),
      }))
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSlots().finally(() => setLoading(false));
  }, [fetchSlots]);

  const liberarSlot = async (slotId: string) => {
    if (!confirm('¿Liberar este slot? Se pondrá estado libre y se quitará la asignación de usuario.')) return;
    setFreeing(slotId);
    try {
      await supabase
        .from('slots')
        .update({ status: 'libre', assigned_to: null, plan_type: null })
        .eq('slot_id', slotId);
      await fetchSlots();
    } finally {
      setFreeing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-black text-white mb-2">Gestión de inventario</h2>
      <p className="text-sm text-slate-400 mb-6">
        Tabla de slots con estado, número y email del usuario. Liberar Slot deja el slot libre (user_id y status en null).
      </p>

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">ID de Slot</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Estado</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Número</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Email del usuario</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3 w-28">Acción</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr
                  key={s.slot_id}
                  className={`border-b border-slate-800 ${s.status === 'ocupado' ? 'bg-slate-800/30' : 'bg-slate-900/30'}`}
                >
                  <td className="px-4 py-3 text-sm font-mono text-slate-300">{s.slot_id}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                        s.status === 'libre' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {s.status === 'libre' ? 'Libre' : 'Ocupado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 font-mono">{s.phone_number || '—'}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;
