import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  Activity, 
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  DollarSign,
  FileText,
  Clock,
  MoreVertical,
  History
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Subscription {
  id: string;
  plan_name: string;
  phone_number: string;
  amount: number;
  status: 'active' | 'canceled' | 'past_due' | 'expired';
  next_billing_date: string;
  currency: string;
}

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBillingData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, plan_name, phone_number, amount, status, next_billing_date, currency')
        .eq('user_id', user.id);

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err: any) {
      console.error("Error fetching billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  // LÓGICA DE CÁLCULO (STRICT)
  const activeServices = subscriptions.filter(s => s.status === 'active');
  const previousServices = subscriptions.filter(s => s.status !== 'active');
  
  const totalMonthlySpend = activeServices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const activeCount = activeServices.length;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatDate = (dateStr: string | null, isActive: boolean) => {
    if (!isActive || !dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6">
        <RefreshCw className="size-8 text-primary animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sincronizando Ledger...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display pb-32">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em]">Facturación y Planes</h1>
        <button onClick={fetchBillingData} className="p-2 -mr-2 text-slate-300 hover:text-primary transition-colors">
          <RefreshCw className="size-4" />
        </button>
      </header>

      <main className="px-5 py-8 max-w-lg mx-auto space-y-10">
        
        {/* TARJETA PRINCIPAL (HERO) */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-20 translate-x-20 blur-3xl"></div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-light uppercase tracking-[0.3em] text-white/70">Gasto Mensual Activo</span>
              <div className="size-8 bg-white/10 rounded-full flex items-center justify-center">
                 <TrendingUp className="size-4 text-white/80" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-5xl font-light tracking-tight">
                {formatCurrency(totalMonthlySpend)}
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/60 uppercase tracking-widest">
                <Activity className="size-3" />
                {activeCount} Servicios Activos
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-white/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Secure Stripe Gateway</span>
              </div>
              <ChevronRight className="size-5 text-white/20" />
            </div>
          </div>
        </div>

        {/* SECCIÓN A: SERVICIOS ACTIVOS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tus Servicios</h3>
            {activeCount > 0 && (
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">Al día</span>
            )}
          </div>

          {activeServices.length === 0 ? (
            <div className="bg-white dark:bg-surface-dark p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs font-bold text-slate-400 italic">No tienes servicios activos actualmente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeServices.map((sub) => (
                <div key={sub.id} className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary">
                      <CreditCard className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{sub.plan_name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 uppercase tracking-widest">Activo</span>
                      </div>
                      <p className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tighter leading-none mb-1">
                        {sub.phone_number || 'Puerto en Rack'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prox: {formatDate(sub.next_billing_date, true)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(sub.amount)}
                    </span>
                    <button className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors">
                      <MoreVertical className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECCIÓN B: HISTORIAL (CANCELADOS) */}
        {previousServices.length > 0 && (
          <section className="space-y-4 pt-4">
            <div className="flex items-center gap-2 px-2">
              <History className="size-3 text-slate-400" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Historial de Servicios Anteriores</h3>
            </div>

            <div className="bg-white/50 dark:bg-surface-dark/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 overflow-hidden">
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {previousServices.map((sub) => (
                  <div key={sub.id} className="px-6 py-5 flex items-center justify-between opacity-60 grayscale-[0.3]">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase truncate max-w-[120px]">{sub.plan_name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[7px] font-black bg-slate-100 text-slate-400 dark:bg-slate-800 uppercase tracking-widest">Cancelado</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 font-mono tracking-tighter">
                          {sub.phone_number || 'Puerto Liberado'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-slate-400 tabular-nums line-through">{formatCurrency(sub.amount)}</p>
                       <p className="text-[9px] font-black text-slate-300 uppercase mt-0.5">—</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* POLÍTICA DE SEGURIDAD */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6 flex items-start gap-4">
           <div className="size-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
             <DollarSign className="size-5" />
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em]">Suscripciones Seguras</p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                Cualquier cambio en tus servicios activos se verá reflejado en el próximo ciclo de facturación. No almacenamos datos sensibles de pago.
              </p>
           </div>
        </div>

        <div className="text-center py-6 opacity-20">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">Telsim Fiscal Engine v2.6</p>
        </div>
      </main>
    </div>
  );
};

export default Billing;