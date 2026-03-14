import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Loader2 } from 'lucide-react';

export type SubRow = {
  id: string;
  user_id: string;
  plan_name: string | null;
  amount: number | null;
  billing_type: string | null;
  status: string | null;
  created_at: string;
  user_email?: string | null;
  next_payment?: string | null;
};

/**
 * Lista de suscripciones activas. Columnas: Usuario, Plan, Monto, Fecha próximo pago.
 * Fecha próximo pago se muestra si existe en BD; si no, "—".
 */
const SubscriptionMonitor: React.FC = () => {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = useCallback(async () => {
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan_name, amount, billing_type, status, created_at')
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false });

    if (!subsData?.length) {
      setSubs([]);
      return;
    }

    const userIds = [...new Set((subsData as SubRow[]).map((s) => s.user_id))];
    const { data: usersData } = await supabase.from('users').select('id, email').in('id', userIds);
    const emailByUserId = (usersData || []).reduce((acc: Record<string, string>, u: { id: string; email: string | null }) => {
      acc[u.id] = u.email ?? '';
      return acc;
    }, {});

    setSubs(
      (subsData as SubRow[]).map((s) => ({
        ...s,
        user_email: emailByUserId[s.user_id] ?? null,
        next_payment: null,
      }))
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSubs().finally(() => setLoading(false));
  }, [fetchSubs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-black text-white mb-2">Monitor de suscripciones</h2>
      <p className="text-sm text-slate-400 mb-6">
        Suscripciones activas: usuario, plan, monto y fecha de próximo pago.
      </p>

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Usuario</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Plan</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Monto</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Fecha próximo pago</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-slate-800 bg-slate-800/20">
                  <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-[220px]" title={s.user_email ?? ''}>
                    {s.user_email || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-white">{s.plan_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {s.amount != null ? `$${s.amount}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {s.next_payment || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {subs.length === 0 && (
        <div className="mt-6 rounded-xl bg-slate-900/80 border border-slate-800 p-8 text-center">
          <CreditCard size={40} className="mx-auto text-slate-500 mb-3" />
          <p className="text-slate-400">No hay suscripciones activas</p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionMonitor;
