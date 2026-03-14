import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Loader2, Filter } from 'lucide-react';
import AdminFicha360 from '../../components/admin/AdminFicha360';

export type SubRow = {
  id: string;
  user_id: string;
  plan_name: string | null;
  amount: number | null;
  billing_type: string | null;
  subscription_status: string | null;
  created_at: string;
  trial_end: string | null;
  user_email?: string | null;
  next_payment?: string | null;
};

const PLAN_LABEL: Record<string, string> = {
  Starter: 'Starter',
  Pro: 'Pro',
  Power: 'Power',
};

/**
 * Monitor de suscripciones: Cliente, Plan, Ciclo, Precio, Próximo cobro, Estado.
 * Filtros: Solo Morosos (past_due), Suscripciones Altas (Power o monto alto).
 */
const SubscriptionMonitor: React.FC = () => {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMorosos, setFilterMorosos] = useState(false);
  const [filterAltas, setFilterAltas] = useState(false);
  const [fichaUserId, setFichaUserId] = useState<string | null>(null);

  const fetchSubs = useCallback(async () => {
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('*, users(*)')
      .order('created_at', { ascending: false });

    if (!subsData?.length) {
      setSubs([]);
      return;
    }

    const statusCol = (s: Record<string, unknown>) => (s.subscription_status ?? s.status) as string | null;
    const activeStatuses = ['active', 'trialing', 'past_due'];
    setSubs(
      (subsData as (SubRow & { users?: { id: string; email: string | null } | null; status?: string | null })[])
        .filter((s) => activeStatuses.includes((statusCol(s) || '').toLowerCase()))
        .map((s) => {
          const st = statusCol(s);
          let nextPayment: string | null = null;
          if (st === 'trialing' && s.trial_end) {
            nextPayment = new Date(s.trial_end).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
          }
          const userEmail = s.users?.email ?? null;
          return {
            id: s.id,
            user_id: s.user_id,
            plan_name: s.plan_name,
            amount: s.amount,
            billing_type: s.billing_type,
            subscription_status: st ?? null,
            created_at: s.created_at,
            trial_end: s.trial_end ?? null,
            user_email: userEmail,
            next_payment: nextPayment,
          };
        })
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSubs().finally(() => setLoading(false));
  }, [fetchSubs]);

  const filtered = subs.filter((s) => {
    const st = (s.subscription_status || '').toLowerCase();
    if (filterMorosos && st !== 'past_due') return false;
    if (filterAltas) {
      const isHigh = s.plan_name === 'Power' || (s.amount != null && s.amount >= 99);
      if (!isHigh) return false;
    }
    return true;
  });

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
            amount, plan_name, subscription_status. MRR = suma de amount donde subscription_status = active.
          </p>
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
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Cliente</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Plan</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Ciclo</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Precio exacto</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Próximo cobro</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Estado real</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setFichaUserId(s.user_id)}
                  className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-slate-800 truncate max-w-[220px]" title={s.user_email ?? ''}>
                    {s.user_email || '—'}
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
                    {s.next_payment || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wide ${
                        (s.subscription_status || '').toLowerCase() === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : (s.subscription_status || '').toLowerCase() === 'trialing'
                            ? 'bg-blue-100 text-blue-700'
                            : (s.subscription_status || '').toLowerCase() === 'past_due'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {(s.subscription_status || '').toLowerCase() === 'past_due' ? 'Past_due' : s.subscription_status || '—'}
                    </span>
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
              {filterMorosos || filterAltas ? 'No hay suscripciones que coincidan con los filtros.' : 'No hay suscripciones activas, en trial o morosas.'}
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
