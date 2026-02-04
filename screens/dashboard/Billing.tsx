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
  AlertCircle,
  FileText,
  Clock
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
      // Obtenemos todos los estados para mostrar el historial completo
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('id, plan_name, phone_number, amount, status, next_billing_date, currency')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      // Ordenamos: Activos primero, luego por fecha descendente
      const sortedData = (data || []).sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return new Date(b.next_billing_date).getTime() - new Date(a.next_billing_date).getTime();
      });

      setSubscriptions(sortedData);
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

  // LÓGICA FINANCIERA: Solo sumar activos
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const totalMonthlySpend = activeSubs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const activeLinesCount = activeSubs.length;
  
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
    switch(status) {
      case 'active':
        return (
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
            Activo
          </span>
        );
      case 'canceled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
            Cancelado
          </span>
        );
      case 'past_due':
        return (
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20">
            Pendiente
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <RefreshCw className="size-12 text-primary animate-spin" />
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
        </div>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Auditing Financial Logs...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-32 transition-colors duration-300">
      <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Resumen Financiero</h1>
        <button onClick={fetchBillingData} className="p-2 -mr-2 text-slate-400 hover:text-primary transition-colors">
          <RefreshCw className="size-4" />
        </button>
      </header>

      <main className="px-5 py-8 max-w-lg mx-auto space-y-10">
        
        {/* PANEL DE CONTROL MRR */}
        <div className="space-y-4">
          <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-24 translate-x-24 blur-3xl group-hover:bg-primary/20 transition-all duration-1000"></div>
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                   <ShieldCheck className="size-3 text-primary" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Ledger Verificado</span>
                </div>
                <TrendingUp className="size-5 text-primary" />
              </div>
              
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Gasto Mensual Activo</p>
                <h2 className="text-5xl font-black tracking-tight flex items-baseline gap-1">
                  {formatCurrency(totalMonthlySpend)}
                  <span className="text-lg text-white/30 font-bold ml-1">USD</span>
                </h2>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Suscripciones</span>
                  <span className="text-sm font-black text-white">{activeLinesCount} Planes</span>
                </div>
                <div className="w-px h-8 bg-white/5"></div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Próximo Pago</span>
                  <span className="text-sm font-black text-white">{formatDate(nextPaymentDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HISTORIAL DE TRANSACCIONES */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Historial de Suscripciones</h3>
            </div>
            {subscriptions.length > 0 && (
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{subscriptions.length} registros</span>
            )}
          </div>

          {subscriptions.length === 0 ? (
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-12 border-2 border-dashed border-slate-100 dark:border-slate-800 text-center animate-in fade-in duration-700">
              <div className="size-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <FileText className="size-10" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-2">Sin actividad financiera</h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-[200px] mx-auto">No hay registros de facturación asociados a esta cuenta.</p>
              <button 
                onClick={() => navigate('/onboarding/region')}
                className="bg-primary text-white font-black px-10 py-4 rounded-2xl shadow-button hover:bg-primary-dark active:scale-95 transition-all text-[10px] tracking-widest uppercase"
              >
                Suscribirse ahora
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-soft transition-all">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/30">
                    <tr>
                      <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan / Línea</th>
                      <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                      <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {subscriptions.map((sub) => {
                      const isCanceled = sub.status === 'canceled' || sub.status === 'expired';
                      
                      return (
                        <tr 
                          key={sub.id} 
                          className={`group transition-all ${
                            isCanceled 
                            ? 'bg-slate-50/50 dark:bg-slate-900/20 opacity-60 grayscale-[0.5]' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="px-6 py-6">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-black truncate max-w-[140px] ${isCanceled ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                  {sub.plan_name}
                                </span>
                                {sub.status === 'active' && <div className="size-1.5 rounded-full bg-primary animate-pulse"></div>}
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono tracking-tighter">
                                {sub.phone_number || 'Puerto Reservado'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            {getStatusBadge(sub.status)}
                          </td>
                          <td className="px-6 py-6 text-right">
                            <div className="flex flex-col items-end">
                              <span className={`text-sm font-black tabular-nums ${isCanceled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                {formatCurrency(sub.amount, sub.currency)}
                              </span>
                              {!isCanceled && (
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                                  Próx: {formatDate(sub.next_billing_date)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* ACCIONES DEL FOOTER DE TABLA */}
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                 <p className="text-[9px] font-bold text-slate-400 text-center flex items-center gap-2 uppercase tracking-widest">
                    <Clock className="size-3" />
                    Los planes cancelados se mantienen por 30 días para tu registro contable
                 </p>
              </div>
            </div>
          )}
        </section>

        {/* POLÍTICA DE SEGURIDAD FINANCIERA */}
        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-3xl p-6 flex items-start gap-4">
           <div className="size-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0">
             <DollarSign className="size-5" />
           </div>
           <div className="space-y-1">
              <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Pago Protegido Stripe</p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                Cualquier cambio en tu suscripción se prorratea automáticamente. TELSIM no almacena datos de tu tarjeta directamente.
              </p>
           </div>
        </div>
      </main>

      <div className="text-center py-12 opacity-30">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">Telsim Financial Gateway v2.5.1</p>
      </div>
    </div>
  );
};

export default Billing;