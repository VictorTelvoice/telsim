import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Users, Smartphone, TrendingUp, Loader2 } from 'lucide-react';

type CEOMetrics = {
  mrr: number;
  totalUsers: number;
  activeUsers: number;
  conversionPct: number;
  slotsInUse: number;
  totalSlots: number;
  occupancyPct: number;
  sales24h: number;
};

/**
 * KPIs de CEO: MRR, Usuarios totales vs activos (conversión), SIMs en uso, Ventas 24h.
 */
const AdminCEOMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<CEOMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [subsRes, usersRes, slotsRes] = await Promise.all([
      supabase.from('subscriptions').select('user_id, amount, plan_name, subscription_status, status, created_at'),
      supabase.from('users').select('id'),
      supabase.from('slots').select('slot_id, status, assigned_to'),
    ]);

    const subs = (subsRes.data || []) as { user_id: string; amount: number | null; subscription_status?: string; status?: string; created_at: string }[];
    const users = (usersRes.data || []) as { id: string }[];
    const slots = (slotsRes.data || []) as { slot_id: string; status: string; assigned_to: string | null }[];

    const statusOf = (s: { subscription_status?: string; status?: string }) => (s.subscription_status ?? s.status ?? '').toLowerCase();
    const activeSubs = subs.filter((s) => statusOf(s) === 'active' || statusOf(s) === 'trialing');
    const mrr = subs.filter((s) => statusOf(s) === 'active').reduce((sum, s) => sum + (s.amount != null ? Number(s.amount) : 0), 0);
    const activeUserIds = new Set(activeSubs.map((s) => s.user_id));
    const totalUsers = users.length;
    const activeUsers = activeUserIds.size;
    const conversionPct = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

    const totalSlots = slots.length;
    const slotsInUse = slots.filter((s) => s.status === 'ocupado' || s.assigned_to != null).length;
    const occupancyPct = totalSlots > 0 ? Math.round((slotsInUse / totalSlots) * 100) : 0;

    const sales24h = subs
      .filter((s) => s.created_at >= last24h)
      .reduce((sum, s) => sum + (s.amount != null ? Number(s.amount) : 0), 0);

    setMetrics({
      mrr,
      totalUsers,
      activeUsers,
      conversionPct,
      slotsInUse,
      totalSlots,
      occupancyPct,
      sales24h,
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMetrics().finally(() => setLoading(false));
  }, [fetchMetrics]);

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
      label: 'MRR',
      sublabel: 'Ingresos Mensuales Recurrentes (subscription_status = active)',
      value: `$${metrics.mrr.toFixed(2)}`,
      icon: DollarSign,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Usuarios',
      sublabel: `Totales vs Activos · ${metrics.conversionPct}% conversión`,
      value: `${metrics.activeUsers} / ${metrics.totalUsers}`,
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'SIMs en Uso',
      sublabel: 'Ocupación de slots (assigned_to)',
      value: `${metrics.slotsInUse} / ${metrics.totalSlots}`,
      subvalue: `(${metrics.occupancyPct}%)`,
      icon: Smartphone,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Ventas 24h',
      sublabel: 'Últimas 24 horas',
      value: `$${metrics.sales24h.toFixed(2)}`,
      icon: TrendingUp,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, sublabel, value, subvalue, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}>
                <Icon size={22} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-slate-900 mt-3 tracking-tight">
              {value}
              {subvalue != null && <span className="text-lg font-semibold text-slate-500 ml-1">{subvalue}</span>}
            </p>
            <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AdminCEOMetrics;
