import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  Activity, 
  ShoppingBag, 
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  DollarSign,
  AlertCircle
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
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('id, plan_name, phone_number, amount, status, next_billing_date, currency')
        .eq('user_id', user.id)
        .order('next_billing_date', { ascending: true });

      if (fetchError) throw fetchError;
      setSubscriptions(data || []);
    } catch (err: any) {
      console.error("Error fetching billing data:", err);
      setError("No se pudieron sincronizar los datos de facturación.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  // Lógica de Negocio
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const totalMonthlySpend = activeSubs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const activeLinesCount = activeSubs.length;
  
  // Encontrar la fecha de vencimiento más próxima entre las activas
  const nextPaymentDate = activeSubs.length > 0 
    ? activeSubs[0].next_billing_date 
    : null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (val: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      active: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      canceled: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
      past_due: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      expired: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
    };
    const config = configs[status as keyof typeof configs] || configs.expired;
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${config}`}>
        {status === 'active' ? 'Activo' : status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="size-10 text-primary animate-spin mb-4" />
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Sincronizando Ledger...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-32">
      <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Facturación Mensual</h1>
        <button onClick={fetchBillingData} className="p-2 -mr-2 text-slate-400 hover:text-primary transition-colors">
          <RefreshCw className="size-4" />
        </button>
      </header>

      <main className="px-5 py-8 max-w-lg mx-auto space-y-10">
        
        {/* PANEL SUPERIOR: RESUMEN */}
        <div className="space-y-4">
          <div className="bg-primary p-7 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Gasto Mensual Total</span>
                <TrendingUp className="size-5 opacity-60" />
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tight mb-1">
                  {formatCurrency(totalMonthlySpend)}
                </h2>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Calculado sobre {activeLinesCount} planes activos</p>
              </div>
              <div className="flex gap-2">
                 <div className="bg-white/20 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                    <ShieldCheck className="size-3" />
                    <span className="text-[9px] font-black uppercase">SSL Protegido</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-surface-dark p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3">
              <div className="size-10 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex items-center justify-center text-emerald-600">
                <Activity className="size-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Líneas Activas</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{activeLinesCount} Servicios</p>
              </div>
            </div>

            <div className="bg-white dark:bg-surface-dark p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3">
              <div className="size-10 bg-blue-50 dark:bg-blue-950/20 rounded-2xl flex items-center justify-center text-primary">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vencimiento</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatDate(nextPaymentDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE DETALLE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Historial de Suscripciones</h3>
          </div>

          {subscriptions.length === 0 ? (
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-12 border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
              <div className="size-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <ShoppingBag className="size-10" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-2">No tienes planes activos</h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Suscríbete a tu primera línea para gestionar tu facturación aquí.</p>
              <button 
                onClick={() => navigate('/onboarding/region')}
                className="bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-button uppercase text-[10px] tracking-widest active:scale-95 transition-all"
              >
                Activar SIM
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan / Número</th>
                      <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                      <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ciclo</th>
                      <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                      <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Próxima Factura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-5">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">{sub.plan_name}</span>
                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">
                                {sub.phone_number || '---'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-5">
                          {getStatusBadge(sub.status)}
                        </td>
                        <td className="px-5 py-5">
                          <span className="text-[10px] font-black uppercase text-slate-500">Mensual</span>
                        </td>
                        <td className="px-5 py-5">
                          <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                            {formatCurrency(sub.amount, sub.currency)}
                          </span>
                        </td>
                        <td className="px-5 py-5 text-right">
                          <span className="text-[11px] font-black text-slate-900 dark:text-white tabular-nums">
                            {formatDate(sub.next_billing_date)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* PIE DE PÁGINA FINANCIERO */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 flex items-start gap-4">
           <DollarSign className="size-5 text-emerald-500 shrink-0 mt-0.5" />
           <div className="space-y-1">
              <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Suscripción Protegida</p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                Tus pagos recurrentes están gestionados de forma segura. Puedes dar de baja cualquier servicio individual desde el menú 'Mis Números'.
              </p>
           </div>
        </div>
      </main>

      <div className="text-center py-10 opacity-20">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">Telsim Billing Engine v2.5</p>
      </div>
    </div>
  );
};

export default Billing;