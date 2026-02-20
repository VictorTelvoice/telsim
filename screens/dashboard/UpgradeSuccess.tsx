import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationsContext';
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Loader2, 
  Crown, 
  Sparkles, 
  Calendar,
  Layers,
  Cpu,
  Bot,
  Shield
} from 'lucide-react';

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

  // Cálculo de fecha de renovación (30 días desde hoy)
  const renewalDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  }, []);

  // Configuración Visual y de Datos por Plan
  const planConfig = useMemo(() => {
    const name = (planName || 'Starter').toUpperCase();
    
    if (name.includes('POWER')) {
      return {
        title: 'MEJORA LISTA',
        description: 'Has desbloqueado la infraestructura de máxima escala para empresas y trading de alta frecuencia.',
        accentColor: 'text-[#D4AF37]',
        glowColor: 'from-[#D4AF37]/20',
        borderColor: 'border-[#D4AF37]/30',
        badgeBg: 'bg-[#D4AF37]',
        badgeText: 'text-white',
        buttonClass: 'bg-gradient-to-r from-[#B49248] via-[#D4AF37] to-[#8C6B1C] shadow-[#D4AF37]/20',
        icon: (
          <div className="relative flex items-center justify-center">
            <div className="absolute size-24 rounded-full border-4 border-[#D4AF37] animate-pulse shadow-[0_0_20px_rgba(212,175,55,0.4)]"></div>
            <CheckCircle2 className="size-14 text-[#D4AF37]" />
          </div>
        ),
        miniIcon: <Shield className="size-3 text-white" />,
        capacity: '1,400 SMS / mes',
        highlight: 'CONTRATO VERIFICADO',
        isPower: true,
        summary: [
          { label: 'Plan', value: 'POWER (Suscripción Activa)' },
          { label: 'Capacidad', value: '1,400 Créditos SMS mensuales' },
          { label: 'Seguridad', value: 'Control Empresarial y Escalabilidad activados' },
          { label: 'Soporte', value: 'Prioritario 24/7 desbloqueado' }
        ]
      };
    }
    
    if (name.includes('PRO')) {
      return {
        title: 'POTENCIA PRO ACTIVA',
        description: 'Tu puerto ahora es compatible con automatización total vía API y Webhooks en tiempo real.',
        accentColor: 'text-primary',
        glowColor: 'from-primary/20',
        borderColor: 'border-primary/30',
        badgeBg: 'bg-primary/10',
        badgeText: 'text-primary',
        buttonClass: 'bg-primary shadow-blue-500/20',
        icon: <Zap className="size-14 text-primary" />,
        miniIcon: <Bot className="size-3 text-primary" />,
        capacity: '400 SMS / mes',
        highlight: 'Acceso a API & Webhooks'
      };
    }

    // Default: STARTER
    return {
      title: 'PLAN BÁSICO VINCULADO',
      description: 'Tu número SIM real ha sido configurado para recibir verificaciones SMS de forma segura.',
      accentColor: 'text-emerald-500',
      glowColor: 'from-emerald-500/20',
      borderColor: 'border-emerald-500/20',
      badgeBg: 'bg-emerald-500/10',
      badgeText: 'text-emerald-600',
      buttonClass: 'bg-emerald-600 shadow-emerald-500/20',
      icon: <CheckCircle2 className="size-14 text-emerald-500" />,
      miniIcon: <ShieldCheck className="size-3 text-emerald-500" />,
      capacity: '150 SMS / mes',
      highlight: 'Número SIM Real (+56)'
    };
  }, [planName]);

  useEffect(() => {
    if (!sessionId && !location.state) return;
    
    const executePostPaymentLogic = async () => {
      if (hasExecutedRef.current) return;
      hasExecutedRef.current = true;

      try {
        await addNotification({
          title: 'Mejora de Plan Exitosa',
          message: `El Ledger ha confirmado tu upgrade. Tu línea ${phoneNumber} ya opera bajo el nivel ${planName}.`,
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
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 gap-6 font-display">
          <Loader2 className="size-12 text-primary animate-spin" />
          <div className="text-center">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] mb-1">Reconfigurando Nodo</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando con el Ledger...</p>
          </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      {/* Fondo dinámico basado en plan */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${planConfig.glowColor} via-transparent to-transparent pointer-events-none opacity-40`}></div>

      <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-1000 ease-out ${showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
        
        <div className="mb-8">
          <div className="relative mb-8 flex justify-center">
             <div className={`absolute inset-0 ${planConfig.badgeBg} blur-3xl rounded-full scale-150 animate-pulse`}></div>
            <div className={`size-28 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 ${planConfig.borderColor} shadow-2xl flex items-center justify-center relative z-10 transition-colors duration-500`}>
              {planConfig.icon}
            </div>
          </div>
          <h1 className={`text-3xl font-black tracking-tighter uppercase mb-3 px-4 leading-tight ${planConfig.accentColor}`}>
            Mejora Lista
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-[32ch] mx-auto italic">
            "{planConfig.description}"
          </p>
        </div>

        <div className={`w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] border-2 ${planConfig.borderColor} px-6 py-10 flex flex-col items-center shadow-card mb-10 relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className={`inline-flex items-center gap-2 px-3 py-1 ${planConfig.badgeBg} rounded-full mb-6 border ${planConfig.borderColor}`}>
             {planConfig.miniIcon}
             <span className={`text-[8px] font-black uppercase tracking-widest ${planConfig.badgeText}`}>{planConfig.highlight}</span>
          </div>

          <div className="flex flex-col items-center gap-1 mb-10">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Número de SIM:</p>
             <div className="text-[28px] font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums">
                {formatPhoneNumber(phoneNumber)}
             </div>
          </div>
          
          <div className="w-full grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-8">
             <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                   <Layers className="size-3" /> Nueva Capacidad
                </div>
                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{planConfig.capacity}</p>
             </div>
             <div className="flex flex-col items-end gap-1 text-right">
                <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                   <Calendar className="size-3" /> Próxima Renovación
                </div>
                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{renewalDate}</p>
             </div>
          </div>

          {/* Resumen elegante para Plan POWER */}
          {planConfig.isPower && planConfig.summary && (
            <div className="w-full mt-8 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
              {planConfig.summary.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[9px]">
                  <span className="font-black text-slate-400 uppercase tracking-widest">{item.label}:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right ml-4">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full space-y-4">
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

          {planConfig.isPower && (
            <button 
              onClick={() => navigate('/dashboard/numbers', { state: { openAutomation: true, phoneNumber } })}
              className="w-full h-14 border-2 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-2xl flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-[0.98]"
            >
              <Bot className="size-4" />
              Configura tu Bot
            </button>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 flex items-center gap-3 opacity-20 pointer-events-none">
        <Cpu className="size-4" />
        <span className="text-[8px] font-black uppercase tracking-[0.5em]">SYNC OK - CORE v6.0</span>
      </div>
    </div>
  );
};

export default UpgradeSuccess;