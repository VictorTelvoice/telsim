import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationsContext';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Loader2, Crown, Sparkles, Star } from 'lucide-react';

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

  const data = location.state || {
      phoneNumber: numParam,
      planName: planParam,
      userId: 'pending'
  };

  const { phoneNumber, planName } = data;

  // Configuración Visual Condicional por Plan
  const planConfig = useMemo(() => {
    const name = (planName || 'Starter').toUpperCase();
    
    if (name.includes('POWER')) {
      return {
        title: 'NIVEL POWER ACTIVADO',
        subtitle: 'Bienvenido al máximo nivel de seguridad empresarial, escalabilidad y soporte prioritario 24/7.',
        accentColor: 'text-[#B49248]',
        glowColor: 'bg-[#B49248]/20',
        borderColor: 'border-[#B49248]/30',
        badgeBg: 'bg-[#B49248]/10',
        badgeText: 'text-[#B49248]',
        buttonClass: 'bg-gradient-to-r from-[#B49248] via-[#D4AF37] to-[#8C6B1C] shadow-[#B49248]/20',
        icon: <Crown className="size-14 text-[#B49248]" />,
        miniIcon: <Sparkles className="size-3 text-[#B49248]" />
      };
    }
    
    if (name.includes('PRO')) {
      return {
        title: 'POTENCIA PRO ACTIVADA',
        subtitle: 'Tu infraestructura ahora cuenta con automatización total, acceso a API y Webhooks.',
        accentColor: 'text-[#0047FF]',
        glowColor: 'bg-[#0047FF]/20',
        borderColor: 'border-[#0047FF]/30',
        badgeBg: 'bg-[#0047FF]/10',
        badgeText: 'text-[#0047FF]',
        buttonClass: 'bg-[#0047FF] shadow-[#0047FF]/20',
        icon: <Zap className="size-14 text-[#0047FF]" />,
        miniIcon: <Zap className="size-3 text-[#0047FF]" />
      };
    }

    // Default: STARTER
    return {
      title: 'PLAN BÁSICO ACTIVO',
      subtitle: 'Tu puerto físico ha sido configurado con éxito para recibir verificaciones en tiempo real.',
      accentColor: 'text-emerald-500',
      glowColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/20',
      badgeBg: 'bg-emerald-500/10',
      badgeText: 'text-emerald-600',
      buttonClass: 'bg-primary shadow-blue-500/20',
      icon: <CheckCircle2 className="size-14 text-emerald-500" />,
      miniIcon: <ShieldCheck className="size-3 text-emerald-500" />
    };
  }, [planName]);

  useEffect(() => {
    if (!sessionId && !location.state) return;
    
    const executePostPaymentLogic = async () => {
      if (hasExecutedRef.current) return;
      hasExecutedRef.current = true;

      try {
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
  }, [sessionId, location.state, planName, phoneNumber, addNotification]);

  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
      return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    return num.startsWith('+') ? num : `+${num}`;
  };

  if (!sessionId && !location.state) {
    return <Navigate to="/dashboard/numbers" replace />;
  }

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
      {/* Fondo dinámico basado en plan */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${planConfig.glowColor.replace('bg-', 'from-')} via-transparent to-transparent pointer-events-none opacity-40`}></div>

      <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-1000 ease-out ${showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
        
        <div className="mb-10">
          <div className="relative mb-8 flex justify-center">
             <div className={`absolute inset-0 ${planConfig.glowColor} blur-3xl rounded-full scale-125 animate-pulse`}></div>
            <div className={`size-28 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 ${planConfig.borderColor} shadow-2xl flex items-center justify-center relative z-10 transition-colors duration-500`}>
              {planConfig.icon}
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase mb-3 px-4 leading-tight">
            {planConfig.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-[30ch] mx-auto">
            {planConfig.subtitle}
          </p>
        </div>

        <div className={`w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] border-2 ${planConfig.borderColor} px-8 py-10 flex flex-col items-center shadow-card mb-12 relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className={`inline-flex items-center gap-2 px-3 py-1 ${planConfig.badgeBg} rounded-full mb-6 border ${planConfig.borderColor}`}>
             {planConfig.miniIcon}
             <span className={`text-[8px] font-black uppercase tracking-widest ${planConfig.badgeText}`}>Configuración Actualizada</span>
          </div>

          <div className="text-[26px] font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums mb-8">
              {formatPhoneNumber(phoneNumber)}
          </div>
          
          <div className="flex items-center gap-2">
             <div className={`size-1.5 rounded-full ${planConfig.accentColor.replace('text-', 'bg-')} animate-pulse`}></div>
             <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
               {planName} Active • v6.0
             </span>
          </div>
        </div>

        <button 
          onClick={() => navigate('/dashboard/numbers')}
          className={`group w-full h-16 ${planConfig.buttonClass} text-white font-black rounded-2xl shadow-lg flex items-center justify-between px-2 transition-all active:scale-[0.98]`}
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