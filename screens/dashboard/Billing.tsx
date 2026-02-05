import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  RefreshCw,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Settings2,
  History,
  ShieldCheck,
  Smartphone
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

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Fetch Subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

      // Fetch Payment Method
      const { data: pmData, error: pmError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (pmError && pmError.code !== 'PGRST116') throw pmError;
      setPaymentMethod(pmData);

    } catch (err: any) {
      console.error("Error fetching billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const activeServices = subscriptions.filter(s => s.status === 'active');
  const previousServices = subscriptions.filter(s => s.status !== 'active');
  const totalMonthlySpend = activeServices.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-6">
        <RefreshCw className="size-6 text-primary animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargando Facturación...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background-dark font-display pb-32">
      {/* NAVEGACIÓN SUPERIOR */}
      <header className="flex items-center justify-between px-6 py-8 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-6" />
        </button>
        <div className="text-right">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Mensual</p>
           <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatCurrency(totalMonthlySpend)}</p>
        </div>
      </header>

      <main className="px-6 space-y-12 max-w-lg mx-auto">
        
        {/* TÍTULO PRINCIPAL */}
        <div>
           <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Facturación</h1>
           <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gestiona tus métodos de pago y planes activos.</p>
        </div>

        {/* SECCIÓN A: MÉTODO DE PAGO */}
        <section className="space-y-4">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Método de Pago Predeterminado</h3>
          
          {paymentMethod ? (
            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                  <CreditCard className="size-6 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {paymentMethod.brand} •••• {paymentMethod.last4}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Expira: {paymentMethod.exp_month}/{paymentMethod.exp_year}</p>
                </div>
              </div>
              <button className="text-[11px] font-black text-primary uppercase tracking-widest px-4 py-2 hover:bg-primary/10 rounded-xl transition-all">
                Editar
              </button>
            </div>
          ) : (
            <button className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-primary/40 transition-all group">
               <div className="size-10 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                  <Plus className="size-5" />
               </div>
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 dark:group-hover:text-slate-300">Agregar tarjeta para pagos automáticos</span>
            </button>
          )}
        </section>

        {/* SECCIÓN B: SERVICIOS ACTIVOS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Tus Servicios Activos</h3>
            <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">{activeServices.length} Planes</span>
          </div>

          <div className="space-y-3">
            {activeServices.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 italic">No tienes servicios contratados.</p>
              </div>
            ) : (
              activeServices.map((sub) => (
                <div key={sub.id} className="bg-white dark:bg-surface-dark p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                      <div className="size-11 bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                         <Smartphone className="size-5" />
                      </div>
                      <div>
                         <h4 className="text-[13px] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{sub.plan_name}</h4>
                         <p className="text-[12px] font-bold text-slate-500 font-mono tracking-tighter">{sub.phone_number}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-black text-slate-900 dark:text-white mb-1">{formatCurrency(sub.amount)}</p>
                      <div className="flex items-center gap-1.5 justify-end">
                         <div className="size-1.5 rounded-full bg-emerald-500"></div>
                         <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Activo</span>
                      </div>
                   </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECCIÓN C: HISTORIAL (COLAPSABLE) */}
        {previousServices.length > 0 && (
          <details className="group border-t border-slate-100 dark:border-slate-800 pt-6">
            <summary className="list-none cursor-pointer flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-slate-400">
                <History className="size-4" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em]">Ver servicios cancelados</h3>
              </div>
              <ChevronRight className="size-4 text-slate-300 transition-transform group-open:rotate-90" />
            </summary>
            
            <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-2">
              {previousServices.map((sub) => (
                <div key={sub.id} className="px-6 py-5 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl flex items-center justify-between opacity-60">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase mb-0.5">{sub.plan_name}</span>
                      <span className="text-xs font-bold text-slate-500 font-mono tracking-tighter">{sub.phone_number}</span>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 line-through">{formatCurrency(sub.amount)}</p>
                      <span className="text-[8px] font-black text-slate-300 uppercase">Cancelado</span>
                   </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* BANNER DE SEGURIDAD */}
        <div className="flex flex-col items-center gap-6 pt-8">
           <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <ShieldCheck className="size-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pago Seguro via Stripe Gateway</span>
           </div>
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] text-center">Telsim Financial Infra v2.7</p>
        </div>

      </main>
    </div>
  );
};

export default Billing;