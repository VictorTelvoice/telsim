import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Loader2, Search } from 'lucide-react';

export type SubRow = {
  id: string;
  user_id: string;
  slot_id: string;
  phone_number: string | null;
  plan_name: string | null;
  amount: number | null;
  billing_type: string | null;
  status: string | null;
  created_at: string;
  user_email?: string | null;
};

const AdminSubscriptions: React.FC = () => {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [filtered, setFiltered] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSubs = useCallback(async () => {
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('*, users(*)')
      .order('created_at', { ascending: false });

    if (!subsData?.length) {
      setSubs([]);
      setFiltered([]);
      return;
    }

    const withEmail = (subsData as (SubRow & { users?: { id: string; email: string | null } | null })[]).map((s) => ({
      id: s.id,
      user_id: s.user_id,
      slot_id: s.slot_id,
      phone_number: s.phone_number,
      plan_name: s.plan_name,
      amount: s.amount,
      billing_type: s.billing_type,
      status: s.status,
      created_at: s.created_at,
      user_email: s.users?.email ?? null,
    }));
    setSubs(withEmail);
    setFiltered(withEmail);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSubs().finally(() => setLoading(false));
  }, [fetchSubs]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(subs);
      return;
    }
    setFiltered(subs.filter((s) => (s.user_email ?? '').toLowerCase().includes(q)));
  }, [search, subs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-black text-white mb-2">Monitor de Suscripciones</h2>
      <p className="text-sm text-slate-400 mb-6">
        Clientes con plan, fecha de creación y monto. Busca por email.
      </p>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Email</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Plan</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Tipo</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Estado</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Monto</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-slate-800 bg-slate-800/20">
                  <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-[200px]" title={s.user_email ?? ''}>
                    {s.user_email || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-white">{s.plan_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{s.billing_type === 'annual' ? 'Anual' : 'Mensual'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                        s.status === 'active' || s.status === 'trialing'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {s.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {s.amount != null ? `$${s.amount}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(s.created_at).toLocaleDateString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="mt-6 rounded-xl bg-slate-900/80 border border-slate-800 p-8 text-center">
          <CreditCard size={40} className="mx-auto text-slate-500 mb-3" />
          <p className="text-slate-400">{search ? 'No hay resultados para ese email' : 'No hay suscripciones'}</p>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions;
