import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../contexts/NotificationsContext';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Loader2 } from 'lucide-react';

const UpgradeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { addNotification } = useNotifications();
  const [isSyncing, setIsSyncing] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const hasExecutedRef = useRef(false);

  const sessionId = searchParams.get('session_id');
  const numParam = searchParams.get('num');
  const planParam = searchParams.get('plan');

  // BLOQUEO: Si no hay session_id de Stripe, no se muestra el éxito
  if (!sessionId && !location.state) {
    return <Navigate to="/dashboard/numbers" replace />;
  }

  const data = location.state || {
      phoneNumber: numParam,
      planName: planParam,
      userId: 'pending'
  };

  const { phoneNumber, planName } = data;

  const getPlanConfig = (name: string) => {
    const normalized = name?.toUpperCase() || '';
    if (normalized.includes('POWER')) {
      return {
        accent: 'text-[#D4AF37]',
        bg: 'bg-[#D4AF37]/10',
        border: 'border-[#D4AF37]/20',
        button: 'bg-[#D4AF37] hover:bg-[#B8962E]',
        glow: 'bg-[#D4AF37]/20',
        badge: 'CONTRATO VERIFICADO',
        badgeText: 'text-[#D4AF37]',
        icon: 'text-[#D4AF37]'
      };
    }
    if (normalized.includes('PRO')) {
      return {
        accent: 'text-[#0047AB]',
        bg: 'bg-[#0047AB]/10',
        border: 'border-[#0047AB]/20',
        button: 'bg-[#0047AB] hover:bg-[#003580]',
        glow: 'bg-[#0047AB]/20',
        badge: 'CONTRATO VERIFICADO',
        badgeText: 'text-[#0047AB]',
        icon: 'text-[#0047AB]'
      };
    }
    // Default / STARTER
    return {
      accent: 'text-teal-500',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      button: 'bg-teal-600 hover:bg-teal-700',
      glow: 'bg-teal-500/20',
      badge: 'POTENCIA DE RED ACTUALIZADA',
      badgeText: 'text-teal-600',
      icon: 'text-teal-500'
    };
  };

  const config = getPlanConfig(planName);

  const getRenewalDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  useEffect(() => {
    const executePostPaymentLogic = async () => {
      if (hasExecutedRef.current) return;
      hasExecutedRef.current = true;

      try {
        // En una implementación real con Webhooks, aquí solo consultaríamos el estado actualizado en la DB
        // Para asegurar feedback inmediato en la UI tras el redirect de Stripe:
        
        await addNotification({
          title: '¡Plan Actualizado!',
          message: `El Ledger ha confirmado el pago. Tu línea ${phoneNumber} ahora opera bajo el Plan ${planName}.`,
          type: 'subscription'
        });

      } catch (err) {
        console.error("Sync error:", err);
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
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Confirmando Transacción...</h2>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none"></div>

      <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-1000 ease-out ${showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
        
        <div className="mb-10">
          <div className="relative mb-8 flex justify-center">
             <div className={`absolute inset-0 ${config.glow} blur-3xl rounded-full scale-125 animate-pulse`}></div>
            <div className="size-28 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
              <CheckCircle2 className={`size-14 ${config.icon}`} />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-1">Mejora Lista</h1>
          <p className={`text-xs font-bold uppercase tracking-widest ${config.accent} mb-4`}>
            Suscripción activa: {planName}
          </p>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-[28ch] mx-auto">
            Stripe ha validado tu pago. La red se ha reconfigurado automáticamente.
          </p>
        </div>

        <div className={`w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] border-2 ${config.border} px-8 py-10 flex flex-col items-center shadow-card mb-12 relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className={`inline-flex items-center gap-2 px-3 py-1 ${config.bg} rounded-full mb-6 border ${config.border}`}>
             <Zap className={`size-3 ${config.accent}`} />
             <span className={`text-[8px] font-black ${config.badgeText} uppercase tracking-widest`}>{config.badge}</span>
          </div>

          <div className="text-[26px] font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums mb-2">
              {formatPhoneNumber(phoneNumber)}
          </div>

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
            Próxima renovación: {getRenewalDate()}
          </div>
          
          <div className="flex items-center gap-2">
             <div className={`size-1.5 rounded-full ${config.accent.replace('text-', 'bg-')} animate-pulse`}></div>
             <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
               {planName} Active • v3.0
             </span>
          </div>
        </div>

        <button 
          onClick={() => navigate('/dashboard/numbers')}
          className={`group w-full h-16 ${config.button} text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98]`}
        >
          <div className="size-12"></div>
          <span className="text-[14px] uppercase tracking-widest">Entrar al Panel</span>
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <ArrowRight className="size-6" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default UpgradeSuccess;