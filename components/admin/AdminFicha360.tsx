import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { X, Loader2, DollarSign, Cpu, Shield } from 'lucide-react';

export type Ficha360Data = {
  financial: {
    plan: string | null;
    ltv: number;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  };
  technical: {
    simPhone: string | null;
    slotId: string | null;
    smsLastMonth: number;
  };
  securityLogs: { id: string; event_type: string; message: string | null; created_at: string }[];
  user: { id: string; email: string | null } | null;
};

type AdminFicha360Props = {
  open: boolean;
  onClose: () => void;
  userId: string | null;
};

/**
 * Panel lateral (slide-over) con la Ficha 360°:
 * - Datos Financieros: plan, LTV, ID Stripe
 * - Datos Técnicos: SIM asignada, slot, SMS último mes
 * - Logs de Seguridad: últimos 5 registros de actividad
 */
const AdminFicha360: React.FC<AdminFicha360Props> = ({ open, onClose, userId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Ficha360Data | null>(null);

  const fetch360 = useCallback(async (uid: string) => {
    setLoading(true);
    setData(null);
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('id, email, stripe_customer_id')
        .eq('id', uid)
        .maybeSingle();

      const user = userRow as { id: string; email: string | null; stripe_customer_id?: string | null } | null;
      const email = user?.email?.trim()?.toLowerCase() || '';

      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('id, plan_name, amount, slot_id, stripe_subscription_id, subscription_status, status')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      const subs = (subsData || []) as {
        plan_name: string | null;
        amount: number | null;
        slot_id: string | null;
        stripe_subscription_id: string | null;
        subscription_status?: string;
        status?: string;
      }[];
      const statusOf = (s: { subscription_status?: string; status?: string }) => (s.subscription_status ?? s.status ?? '').toLowerCase();
      const activeSub = subs.find((s) => statusOf(s) === 'active' || statusOf(s) === 'trialing');
      const ltv = subs.reduce((sum, s) => sum + (s.amount != null ? Number(s.amount) : 0), 0);

      let slotId: string | null = activeSub?.slot_id ?? subs[0]?.slot_id ?? null;
      let simPhone: string | null = null;
      if (slotId) {
        const { data: slotRow } = await supabase.from('slots').select('phone_number').eq('slot_id', slotId).maybeSingle();
        simPhone = (slotRow as { phone_number?: string | null } | null)?.phone_number ?? null;
      }
      if (!slotId) {
        const { data: assignedSlots } = await supabase.from('slots').select('slot_id, phone_number').eq('assigned_to', uid).limit(1).maybeSingle();
        if (assignedSlots) {
          const a = assignedSlots as { slot_id: string; phone_number: string | null };
          slotId = a.slot_id;
          simPhone = a.phone_number;
        }
      }

      const startOfLastMonth = new Date();
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      startOfLastMonth.setDate(1);
      startOfLastMonth.setHours(0, 0, 0, 0);
      const { count: smsCount } = await supabase
        .from('sms_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('received_at', startOfLastMonth.toISOString());

      let securityLogs: { id: string; event_type: string; message: string | null; created_at: string }[];
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const auditRes = await fetch('/api/manage', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'list-audit-logs',
          emailSearch: email || undefined,
          payloadUserId: email ? undefined : uid,
          limit: email ? 5 : 50,
          accessToken: session?.access_token || null,
        }),
      });
      const auditBody = await auditRes.json().catch(() => ({}));
      const auditLogs = (auditRes.ok ? ((auditBody as { logs?: any[] }).logs || []) : []) as Array<{
        id: string;
        event_type: string;
        message: string | null;
        created_at: string;
      }>;
      securityLogs = auditLogs.slice(0, 5).map((a) => ({
        id: a.id,
        event_type: a.event_type,
        message: a.message,
        created_at: a.created_at,
      }));

      setData({
        financial: {
          plan: activeSub?.plan_name ?? subs[0]?.plan_name ?? null,
          ltv,
          stripeCustomerId: user?.stripe_customer_id ?? null,
          stripeSubscriptionId: activeSub?.stripe_subscription_id ?? subs[0]?.stripe_subscription_id ?? null,
        },
        technical: {
          simPhone,
          slotId,
          smsLastMonth: smsCount ?? 0,
        },
        securityLogs,
        user: user ? { id: user.id, email: user.email ?? null } : null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && userId) fetch360(userId);
    if (!open) setData(null);
  }, [open, userId, fetch360]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Ficha 360°"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
          <h2 className="text-lg font-black text-slate-900">Ficha 360°</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="text-slate-400 animate-spin" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              {data.user && (
                <p className="text-sm text-slate-600 truncate" title={data.user.email ?? ''}>
                  {data.user.email || '—'}
                </p>
              )}

              {/* Datos Financieros */}
              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  <DollarSign size={14} />
                  Datos Financieros
                </h3>
                <dl className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Plan</dt>
                    <dd className="font-semibold text-slate-800">{data.financial.plan || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Total pagado (LTV)</dt>
                    <dd className="font-semibold text-slate-800">${data.financial.ltv.toFixed(2)}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-slate-500">ID Stripe (cliente)</dt>
                    <dd className="font-mono text-xs text-slate-700 break-all">
                      {data.financial.stripeCustomerId || '—'}
                    </dd>
                  </div>
                  {data.financial.stripeSubscriptionId && (
                    <div className="flex flex-col gap-1">
                      <dt className="text-slate-500">ID Suscripción Stripe</dt>
                      <dd className="font-mono text-xs text-slate-700 break-all">
                        {data.financial.stripeSubscriptionId}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Datos Técnicos */}
              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  <Cpu size={14} />
                  Datos Técnicos
                </h3>
                <dl className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <dt className="text-slate-500">SIM asignada</dt>
                    <dd className="font-mono text-slate-800">{data.technical.simPhone || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Slot</dt>
                    <dd className="font-mono text-slate-800">{data.technical.slotId || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">SMS último mes</dt>
                    <dd className="font-semibold text-slate-800">{data.technical.smsLastMonth}</dd>
                  </div>
                </dl>
              </section>

              {/* Logs de Seguridad */}
              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  <Shield size={14} />
                  Logs de Seguridad (últimos 5)
                </h3>
                <ul className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {data.securityLogs.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-slate-500">Sin registros recientes</li>
                  ) : (
                    data.securityLogs.map((log) => (
                      <li key={log.id} className="px-4 py-3 bg-white hover:bg-slate-50/80">
                        <p className="text-sm font-medium text-slate-800">{log.event_type}</p>
                        {log.message && <p className="text-xs text-slate-500 mt-0.5 truncate">{log.message}</p>}
                        <p className="text-[10px] text-slate-400 mt-1">{formatDate(log.created_at)}</p>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              {data.user && (
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/admin/users/${data.user!.id}`);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  Ver detalle completo del usuario
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-8">Selecciona un usuario o suscripción.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminFicha360;
