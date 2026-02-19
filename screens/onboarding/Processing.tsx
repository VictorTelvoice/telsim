
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Loader2, 
  AlertCircle, 
  Cpu, 
  Globe, 
  CheckCircle2, 
  ArrowRight,
  Zap,
  Smartphone,
  ShieldCheck,
  Headphones,
  RefreshCw
} from 'lucide-react';

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

  const sessionId = searchParams.get('session_id');
  const planName = searchParams.get('plan') || 'Pro';

  const statusMessages = [
    "Recibiendo confirmación de Stripe...",
    "Validando puerto en el Ledger...",
    "Asignando infraestructura física...",
    "Triggering sim-card activation...",
    "Sincronizando número de red..."
  ];

  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
      return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    return num.startsWith('+') ? num : `+${num}`;
  };

  const checkStatus = async () => {
    if (Date.now() - startTime.current > 75000) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setError("TIMEOUT");
      return;
    }

    if (!sessionId) return;

    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('phone_number')
        .eq('stripe_session_id', sessionId)
        .eq('status', 'active')
        .not('phone_number', 'is', null)
        .maybeSingle();

      if (data?.phone_number) {
        setActivatedNumber(data.phone_number);
        setIsSuccess(true);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    } catch (err) {
      console.debug("Polling error", err);
    }
  };

  useEffect(() => {
    if (!user || !sessionId) return;

    // Polling agresivo inicial
    pollIntervalRef.current = setInterval(checkStatus, 1800);
    checkStatus();

    const msgInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      clearInterval(msgInterval);
    };
  }, [user, sessionId]);

  if (!user || !sessionId) return <Navigate to="/dashboard" replace />;

  if (isSuccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 animate-in fade-in duration-1000">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-10 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full scale-150 animate-pulse"></div>
            <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-emerald-500/20 shadow-2xl flex items-center justify-center relative z-10 overflow-hidden">
               <CheckCircle2 className="size-12 text-emerald-500 relative z-20" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Activación Lista</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tu nueva línea ha sido aprovisionada con éxito.</p>
          </div>

          <div className="w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] p-10 border-2 border-emerald-500/10 shadow-card flex flex-col items-center gap-2 relative overflow-hidden">
             <div className="flex flex-col items-center gap-1 relative z-10">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full mb-3">
                    <Zap className="size-3 text-emerald-500" />
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Identidad SIM Verificada</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Número asignado:</p>
                <h2 className="text-3xl font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums animate-reveal-number">
                    {formatPhoneNumber(activatedNumber)}
                </h2>
             </div>
          </div>

          <button 
            onClick={() => navigate(`/dashboard?new_line=${encodeURIComponent(activatedNumber)}`)}
            className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98]"
          >
            <div className="size-12"></div>
            <span className="text-[14px] uppercase tracking-widest">Entrar al Panel</span>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ArrowRight className="size-6" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (error === "TIMEOUT") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 text-center animate-in fade-in">
        <div className="size-20 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center border border-amber-500/20 mb-8">
           <AlertCircle className="size-10 text-amber-500" />
        </div>
        <div className="space-y-4 mb-10">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Enlace Retrasado</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[30ch] mx-auto leading-relaxed">Tu pago es válido, pero el hardware está tardando en responder. Tu línea aparecerá en el dashboard en unos instantes.</p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <button 
              onClick={() => { startTime.current = Date.now(); setError(null); checkStatus(); }}
              className="w-full h-14 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95"
          >
              <RefreshCw className="size-4" /> Reintentar Sincronización
          </button>
          <button 
              onClick={() => navigate('/dashboard')}
              className="w-full h-14 text-slate-400 font-bold uppercase text-[9px] tracking-widest"
          >
              Ir al Dashboard de todas formas
          </button>
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
            <Smartphone className="size-14 text-primary/20" />
            <div className="absolute inset-0 z-20 overflow-hidden rounded-[2.5rem] pointer-events-none">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(29,78,216,0.8)] animate-scanner absolute top-0"></div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight animate-pulse">Sincronizando Nodo</h1>
          <div className="animate-in slide-in-from-bottom-2 duration-500">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                 {statusMessages[statusIndex]}
               </span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-12 flex items-center gap-4 opacity-20">
        <Cpu className="size-4" />
        <span className="text-[8px] font-black uppercase tracking-[0.5em]">TELSIM CORE RT-v6.0</span>
      </div>
    </div>
  );
};

export default Processing;
