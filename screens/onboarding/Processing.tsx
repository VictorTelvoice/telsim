import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { 
  Loader2, 
  AlertCircle, 
  Cpu, 
  CheckCircle2, 
  ArrowRight,
  Zap,
  Smartphone,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

// No usamos onAuthStateChange aquí: en iOS puede dejar de dispararse tras inactividad.
// Solo usamos useAuth().user; el refresco al volver del segundo plano se hace en AuthContext (visibilitychange).
const Processing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activatedNumber, setActivatedNumber] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);
  
  const startTime = useRef(Date.now());
  const pollIntervalRef = useRef<any>(null);
  const msgIntervalRef = useRef<any>(null);
  const abortControllerRef = useRef(new AbortController());

  const sessionId = searchParams.get('session_id');
  const subId = searchParams.get('id'); 
  const slotId = searchParams.get('slot_id');
  const isUpgrade = searchParams.get('isUpgrade') === 'true';

  useEffect(() => {
    if (!user?.id) return;
    const patch: Record<string, string> = { onboarding_step: ONBOARDING_STEPS.PROCESSING };
    if (sessionId) patch.onboarding_checkout_session_id = sessionId;
    void supabase.from('users').update(patch).eq('id', user.id);
  }, [user?.id, sessionId]);

  const statusMessages = isUpgrade ? [
    "Validando tu nuevo plan...",
    "Actualizando créditos SMS...",
    "Sincronizando infraestructura...",
    "Aplicando mejoras de red...",
    "Finalizando actualización..."
  ] : [
    "Verificando tu pago...",
    "Asignando tu línea SIM...",
    "Configurando tu número...",
    "Activando servicios OTP...",
    "Sincronizando tu cuenta..."
  ];

  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    return num.startsWith('+') ? num : `+${num}`;
  };

  const QUERY_TIMEOUT_MS = 5000;

  const checkStatus = async () => {
    if (Date.now() - startTime.current > 85000) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setError("TIMEOUT");
      return;
    }

    try {
      let query = supabase
        .from('subscriptions')
        .select('id, slot_id, phone_number, plan_name, amount, currency, monthly_limit, status, billing_type, activation_state, next_billing_date');

      // Orden: `stripe_session_id` antes que `slot_id` — el `session_id` de Stripe es la clave canónica
      // del retorno desde Checkout; priorizar `slot_id` rompía el match si hubiera divergencia.
      if (subId) {
        query = query.eq('id', subId);
      } else if (sessionId) {
        query = query.eq('stripe_session_id', sessionId);
      } else if (slotId) {
        query = query.eq('slot_id', slotId).eq('user_id', user.id);
      } else {
        return;
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('QUERY_TIMEOUT')), QUERY_TIMEOUT_MS)
      );
      const { data } = await Promise.race([
        query.abortSignal(abortControllerRef.current.signal).maybeSingle(),
        timeoutPromise
      ]) as { data: any };

      if (!data) return;

      const activationState = data.activation_state as string | null | undefined;

      if (activationState === 'failed') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setError('ACTIVATION_FAILED');
        return;
      }

      const statusLower = String(data.status ?? '').toLowerCase();
      const subscriptionLive = statusLower === 'active' || statusLower === 'trialing';
      const phoneOk = !!String(data.phone_number ?? '').trim();

      // Sin `slot_id` en la fila no podemos comprobar el slot; no bloquear el branch (antes `slotNotLibre` quedaba false).
      let slotNotLibre = false;
      if (data.slot_id) {
        const { data: slotRow } = await supabase
          .from('slots')
          .select('status, assigned_to')
          .eq('slot_id', data.slot_id)
          .abortSignal(abortControllerRef.current.signal)
          .maybeSingle();
        slotNotLibre =
          slotRow != null && String((slotRow as { status?: string | null }).status ?? '').toLowerCase() !== 'libre';
      } else {
        slotNotLibre = true;
      }

      /** Listo: webhook dejó `on_air` / `provisioned`, o fila viva + número + slot ocupado (no `libre`). */
      const activationReady =
        activationState === 'on_air' ||
        activationState === 'provisioned' ||
        (subscriptionLive && phoneOk && slotNotLibre);

      if (activationReady) {
        // ✅ Servicio operativo confirmado — safe to clean up onboarding localStorage
        const isAnnual = data.billing_type === 'annual';
        ['selected_plan', 'selected_plan_price', 'selected_plan_annual', 'selected_plan_price_id'].forEach(k => localStorage.removeItem(k));

        const phone = data.phone_number || '';
        if (isUpgrade) {
          const plan = searchParams.get('plan') || 'POWER';
          navigate(`/dashboard/upgrade-success?num=${encodeURIComponent(phone)}&plan=${plan}`, {
            replace: true,
            state: {
              phoneNumber: data.phone_number,
              planName: data.plan_name,
              amount: data.amount,
              currency: data.currency,
              monthlyLimit: data.monthly_limit,
              isAnnual,
              nextBillingDate: data.next_billing_date,
            }
          });
          return;
        }
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        navigate(`/onboarding/activation-success?session_id=${encodeURIComponent(sessionId || '')}`, {
          replace: true,
          state: {
            phoneNumber: data.phone_number,
            planName: data.plan_name,
            amount: data.amount,
            currency: data.currency,
            monthlyLimit: data.monthly_limit,
            isAnnual,
            nextBillingDate: data.next_billing_date,
          },
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (err?.message === 'QUERY_TIMEOUT') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setError('QUERY_TIMEOUT');
        return;
      }
      console.debug("Polling retry...", err);
    }
  };

  // AbortController + visibility: al ocultar la app (iOS) cancelamos peticiones de inmediato para no dejar zombies
  useEffect(() => {
    if (!user || (!sessionId && !subId && !slotId)) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const interval = setInterval(checkStatus, 1500);
    pollIntervalRef.current = interval;
    checkStatus();

    msgIntervalRef.current = setInterval(() => { setStatusIndex((prev) => (prev + 1) % statusMessages.length); }, 2200);

    const handleHide = () => {
      controller.abort();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleHide();
      else if (!pollIntervalRef.current) {
        abortControllerRef.current = new AbortController();
        pollIntervalRef.current = setInterval(checkStatus, 1500);
        checkStatus();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      controller.abort();
      clearInterval(interval);
      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, sessionId, subId, slotId]);

  if (!sessionId && !subId && !slotId) return <Navigate to="/dashboard" replace />;

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 text-center animate-in fade-in">
        <div className="size-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20 mb-8"><Cpu className="size-10 text-primary" /></div>
        <div className="space-y-4 mb-10">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Procesando tu pago</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[32ch] mx-auto leading-relaxed">
            Tu pago está siendo procesado. Puedes cerrar esta página; al iniciar sesión verás tu número activado.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full h-14 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95"
          >
            Ir a inicio de sesión
          </button>
          <button onClick={() => navigate('/')} className="w-full h-14 text-slate-400 font-bold uppercase text-[9px] tracking-widest">Ir al inicio</button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 animate-in fade-in duration-1000">
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-10">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full scale-150 animate-pulse"></div>
            <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-emerald-500/20 shadow-2xl flex items-center justify-center relative z-10"><CheckCircle2 className="size-12 text-emerald-500" /></div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{isUpgrade ? 'Mejora Lista' : 'Activación Lista'}</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{isUpgrade ? 'Tu infraestructura ha sido potenciada.' : 'Tu nueva línea ha sido aprovisionada con éxito.'}</p>
          </div>
          <div className="w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] p-10 border-2 border-emerald-500/10 shadow-card flex flex-col items-center gap-2 relative overflow-hidden">
             <div className="flex flex-col items-center gap-1 relative z-10">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full mb-3"><Zap className="size-3 text-emerald-500" /><span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Contrato Verificado</span></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Número de SIM:</p>
                <h2 className="text-3xl font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums">{activatedNumber === 'Sincronizando...' ? activatedNumber : formatPhoneNumber(activatedNumber)}</h2>
             </div>
          </div>
          <button onClick={() => navigate(`/dashboard/numbers`)} className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-between px-2 transition-all active:scale-[0.98]">
            <div className="size-12"></div><span className="text-[14px] uppercase tracking-widest">Entrar al Panel</span><div className="size-12 bg-white/20 rounded-xl flex items-center justify-center"><ArrowRight className="size-6" /></div>
          </button>
        </div>
      </div>
    );
  }

  if (error === 'ACTIVATION_FAILED') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 text-center animate-in fade-in">
        <div className="size-20 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center border border-amber-500/20 mb-8">
          <AlertCircle className="size-10 text-amber-500" />
        </div>
        <div className="space-y-4 mb-10">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Activación fallida</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[32ch] mx-auto leading-relaxed">
            Detectamos un problema al confirmar la activación del servicio. Vuelve a intentarlo desde tu panel o contacta soporte.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <button onClick={() => navigate('/dashboard/numbers')} className="w-full h-14 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95">
            Ir a mis números
          </button>
          <button onClick={() => navigate('/dashboard')} className="w-full h-14 text-slate-400 font-bold uppercase text-[9px] tracking-widest">Ir a inicio</button>
        </div>
      </div>
    );
  }

  if (error === "QUERY_TIMEOUT" || error === "TIMEOUT") {
    const isQueryTimeout = error === "QUERY_TIMEOUT";
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 text-center animate-in fade-in">
        <div className="size-20 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center border border-amber-500/20 mb-8"><AlertCircle className="size-10 text-amber-500" /></div>
        <div className="space-y-4 mb-10">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{isQueryTimeout ? 'Conexión lenta' : 'Activación Demorada'}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[30ch] mx-auto leading-relaxed">
            {isQueryTimeout ? 'La consulta no respondió a tiempo. En iOS puede ocurrir al volver del segundo plano. Reintenta o entra al panel.' : 'Tu pago fue recibido, pero la activación de tu SIM está tardando más de lo habitual. Se completará automáticamente.'}
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => {
              startTime.current = Date.now();
              setError(null);
              pollIntervalRef.current = setInterval(checkStatus, 1300);
              checkStatus();
            }}
            className="w-full h-14 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95"
          >
            <RefreshCw className="size-4" /> {isQueryTimeout ? 'Reintentar' : 'Verificar nuevamente'}
          </button>
          <button onClick={() => navigate('/dashboard/numbers')} className="w-full h-14 text-slate-400 font-bold uppercase text-[9px] tracking-widest">Ir a mis números de todas formas</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 overflow-hidden text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="flex flex-col items-center gap-12 w-full max-w-sm relative z-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-[2.5rem] border-2 border-primary/20 animate-ping opacity-20"></div>
          <div className="relative size-32 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center">
            {isUpgrade ? <TrendingUp className="size-14 text-primary/20" /> : <Smartphone className="size-14 text-primary/20" />}
            <div className="absolute inset-0 z-20 overflow-hidden rounded-[2.5rem] pointer-events-none"><div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(29,78,216,0.8)] animate-scanner absolute top-0"></div></div>
          </div>
        </div>
        <div className="space-y-4"><h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight animate-pulse">{isUpgrade ? 'Actualizando tu SIM' : 'Activando tu SIM'}</h1><div className="animate-in slide-in-from-bottom-2 duration-500 h-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{statusMessages[statusIndex]}</span></div></div>
      </div>
      <div className="absolute bottom-12 flex items-center gap-4 opacity-20"><Cpu className="size-4" /><span className="text-[8px] font-black uppercase tracking-[0.5em]">TELSIM CORE RT-v6.0</span></div>
    </div>
  );
};

export default Processing;
