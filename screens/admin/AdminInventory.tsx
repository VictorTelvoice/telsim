import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Trash2 } from 'lucide-react';

export type SlotRow = {
  slot_id: string;
  phone_number: string | null;
  status: string;
  assigned_to: string | null;
  plan_type: string | null;
  user_email?: string | null;
};

const AdminInventory: React.FC = () => {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);

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
        user_email: s.users?.email ?? null,
      }))
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSlots().finally(() => setLoading(false));
  }, [fetchSlots]);

  /** Liberación vía POST /api/manage action=cancel (único camino autorizado). */
  const clearSlot = async (slotId: string) => {
    if (!confirm('¿Limpiar este slot? La SIM quedará libre. El cliente perderá la asignación.')) return;
    setClearing(slotId);
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
    } finally {
      setClearing(null);
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
      <h2 className="text-xl font-black text-white mb-2">Inventario de SIMs</h2>
      <p className="text-sm text-slate-400 mb-6">
        Slot, estado, número y usuario asignado. Usa «Limpiar Slot» si una SIM falla para liberarla manualmente.
      </p>

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Slot</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Estado</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Número</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Usuario</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3 w-24">Acción</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr
                  key={s.slot_id}
                  className={`border-b border-slate-800 ${
                    s.status === 'ocupado' ? 'bg-slate-800/30' : 'bg-slate-900/30'
                  }`}
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
                  <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-[180px]" title={s.user_email ?? ''}>
                    {s.user_email || (s.assigned_to ? '—' : '—')}
                  </td>
                  <td className="px-4 py-3">
                    {s.status === 'ocupado' && (
                      <button
                        onClick={() => clearSlot(s.slot_id)}
                        disabled={clearing === s.slot_id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[11px] font-bold disabled:opacity-50"
                        title="Limpiar slot (liberar SIM)"
                      >
                        {clearing === s.slot_id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Limpiar
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

export default AdminInventory;
