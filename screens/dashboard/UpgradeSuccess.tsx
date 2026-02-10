import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../contexts/NotificationsContext';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Loader2 } from 'lucide-react';

const UpgradeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotifications();
  const [isSyncing, setIsSyncing] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const hasExecutedRef = useRef(false);

  const data = location.state;
  if (!data) return <Navigate to="/dashboard/numbers" replace />;

  const { phoneNumber, planName, price, limit, userId } = data;

  useEffect(() => {
    /**
     * TAREA 2: LÓGICA DE WEBHOOK (Simulada en cliente para funcionalidad total en sandbox)
     * Cuando el pago es exitoso:
     * 1. Busca suscripción vieja -> status: 'actualizado'
     * 2. Crea nueva fila -> status: 'active'
     * 3. Marca slot -> status: 'ocupado'
     * 4. Notificación -> ¡Plan Actualizado!
     */
    const executePostPaymentLogic = async () => {
      if (hasExecutedRef.current) return;
      hasExecutedRef.current = true;

      try {
        // Paso A: Marcar suscripción anterior
        await supabase
          .from('subscriptions')
          .update({ status: 'actualizado' })
          .eq('user_id', userId)
          .eq('phone_number', phoneNumber)
          .eq('status', 'active');

        // Paso B: Insertar nueva suscripción 'active'
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert([{
            user_id: userId,
            phone_number: phoneNumber,
            plan_name: planName,
            amount: price,
            monthly_limit: limit,
            status: 'active',
            currency: 'USD'
          }]);

        if (subError) throw subError;

        // Paso C: Actualizar Slot (Asegurar estado ocupado y plan_type)
        await supabase
          .from('slots')
          .update({ 
            status: 'ocupado',
            plan_type: planName
          })
          .eq('phone_number', phoneNumber);

        // Paso D: Crear Notificación oficial
        await addNotification({
          title: '¡Plan Actualizado!',
          message: `La red ha validado tu pago. Tu línea ${formatPhoneNumber(phoneNumber)} ahora opera bajo el Plan ${planName}.`,
          type: 'subscription'
        });

      } catch (err) {
        console.error("Error en sincronización post-pago:", err);
      } finally {
        setIsSyncing(false);
        setTimeout(() => setShowContent(true), 200);
      }
    };

    executePostPaymentLogic();
  }, []);

  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
      return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    return num.startsWith('+') ? num : `+${num}`;
  };

  if (isSyncing) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 gap-6">
          <Loader2 className="size-12 text-primary animate-spin" />
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Validando Transacción...</h2>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none"></div>

      <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-1000 ease-out ${showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
        
        <div className="mb-10">
          <div className="relative mb-8 flex justify-center">
             <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-125 animate-pulse"></div>
            <div className="size-28 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
              <CheckCircle2 className="size-14 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-3">¡Pago Exitoso!</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px] leading-relaxed max-w-[28ch] mx-auto">
            El Ledger de TELSIM ha confirmado la recepción del pago vía Stripe.
          </p>
        </div>

        {/* Success Card */}
        <div className="w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] border-2 border-emerald-500/20 px-8 py-10 flex flex-col items-center shadow-card mb-12 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full mb-6 border border-emerald-500/10">
             <Zap className="size-3 text-emerald-500" />
             <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Línea física potenciada</span>
          </div>

          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Puerto Sincronizado</span>
          <div className="text-[26px] font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums mb-8">
              {formatPhoneNumber(phoneNumber)}
          </div>
          
          <div className="flex items-center gap-2">
             <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
               Plan {planName} • On-Air
             </span>
          </div>
        </div>

        <button 
          onClick={() => navigate('/dashboard/numbers')}
          className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98]"
        >
          <div className="size-12"></div>
          <span className="text-[14px] uppercase tracking-widest">Volver al Panel</span>
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md transition-colors group-hover:bg-white/30">
            <ArrowRight className="size-6" />
          </div>
        </button>

        <div className="mt-12 flex flex-col items-center gap-3 opacity-30">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            <span className="text-[8px] font-black uppercase tracking-[0.4em]">TELSIM WEBHOOK LISTENER v1.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeSuccess;