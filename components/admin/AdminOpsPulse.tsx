import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, BellRing, Headset, Loader2, MessageSquareText, ShieldAlert } from 'lucide-react';

type OpsMetrics = {
  activeSubs: number;
  trialingSubs: number;
  pendingReactivation: number;
  sms24h: number;
  notifications24h: number;
  openTickets: number;
  proLines: number;
  powerLines: number;
  starterLines: number;
};

const AdminOpsPulse: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<OpsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const res = await fetch('/api/manage', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'get-admin-ops-pulse',
        accessToken: session?.access_token || null,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok && (body as { metrics?: OpsMetrics }).metrics) {
      setMetrics((body as { metrics: OpsMetrics }).metrics);
    } else {
      setMetrics(null);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchMetrics().finally(() => setLoading(false));
  }, [fetchMetrics, user]);

  const totalLive = useMemo(() => {
    if (!metrics) return 0;
    return metrics.activeSubs + metrics.trialingSubs;
  }, [metrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={28} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!metrics) return null;

  const cards = [
    {
      label: 'Suscripciones activas',
      value: metrics.activeSubs,
      helper: 'Líneas cobrando normalmente',
      icon: Activity,
      tone: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Trialing',
      value: metrics.trialingSubs,
      helper: 'Líneas en periodo de prueba',
      icon: BellRing,
      tone: 'bg-amber-100 text-amber-600',
    },
    {
      label: 'SMS 24h',
      value: metrics.sms24h,
      helper: 'Tráfico reciente recibido',
      icon: MessageSquareText,
      tone: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Tickets abiertos',
      value: metrics.openTickets,
      helper: 'Soporte pendiente por responder',
      icon: Headset,
      tone: 'bg-violet-100 text-violet-700',
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Pulso Operativo</h2>
          <p className="text-sm text-slate-500 mt-1">Estado vivo de tráfico, soporte y salud comercial.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide">
          <ShieldAlert size={14} />
          {metrics.pendingReactivation} pendientes reactivación
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, helper, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon size={18} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">{label}</span>
            </div>
            <div className="mt-4 text-3xl font-black tracking-tight text-slate-900">{value}</div>
            <p className="mt-1 text-xs text-slate-500">{helper}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Distribución de líneas activas</h3>
              <p className="text-xs text-slate-500">Planes operativos visibles para clientes</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{totalLive} líneas</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Starter', value: metrics.starterLines, tone: 'bg-slate-500' },
              { label: 'Pro', value: metrics.proLines, tone: 'bg-blue-700' },
              { label: 'Power', value: metrics.powerLines, tone: 'bg-emerald-500' },
            ].map((item) => {
              const width = totalLive > 0 ? Math.max(8, (item.value / totalLive) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                    <span className="font-semibold">{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900">Alertas rápidas</h3>
            <Link
              to="/admin/support"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wide hover:bg-slate-800 transition-colors"
            >
              <Headset size={14} />
              Chat en vivo
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Notificaciones 24h</p>
                <p className="text-xs text-slate-500">Volumen enviado por automatizaciones</p>
              </div>
              <span className="text-lg font-black text-slate-900">{metrics.notifications24h}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Pendientes reactivación</p>
                <p className="text-xs text-slate-500">Líneas fuera del inventario del cliente</p>
              </div>
              <span className={`text-lg font-black ${metrics.pendingReactivation > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {metrics.pendingReactivation}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Backlog soporte</p>
                <p className="text-xs text-slate-500">Tickets abiertos por revisar</p>
              </div>
              <span className={`text-lg font-black ${metrics.openTickets > 0 ? 'text-violet-700' : 'text-slate-900'}`}>
                {metrics.openTickets}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminOpsPulse;
