
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
  ShieldCheck
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
  const realtimeChannelRef = useRef<any>(null);

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
    if (Date.now() - startTime.current > 60000) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setError("TIMEOUT");
      return;
    }

    if (!sessionId) return;

    try {
      // REGLA DE PRECISIÓN: Consultar estrictamente por el stripe_session_id de esta compra
      // Esto evita mostrar números de suscripciones anteriores del mismo usuario.
      const { data } = await supabase
        .from('subscriptions')
        .select('status, phone_number')
        .eq('stripe_session_id', sessionId)
        .eq('status', 'active')
        .not('phone_number', 'is', null)
        .maybeSingle();

      if (data && data.phone_number) {
        setActivatedNumber(data.phone_number);
        setIsSuccess(true);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    } catch (err) {
      console.debug("Polling sync error", err);
    }
  };

  useEffect(() => {
    if (!user || !sessionId) return;

    // Escucha en tiempo real para cambios específicos en esta sesión de pago
    const channel = supabase
      .channel(`provisioning_${sessionId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subscriptions',
        filter: `stripe_session_id=eq.${sessionId}` // Filtro estricto por ID de sesión
      }, (payload) => {
        const item = payload.new as any;
        if (item && item.status === 'active' && item.phone_number) {
          setActivatedNumber(item.phone_number);
          setIsSuccess(true);
        }
      })
      .subscribe();

    realtimeChannelRef.current = channel;
    pollIntervalRef.current = setInterval(checkStatus, 2500);
    checkStatus();

    const msgInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current);
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
               <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
               <CheckCircle2 className="size-12 text-emerald-500 relative z-20" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">¡Activación Exitosa!</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tu infraestructura de red local está On-Air.</p>
          </div>

          <div className="w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] p-10 border-2 border-emerald-500/10 shadow-card flex flex-col items-center gap-6 relative overflow-hidden group">
             <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
             
             <div className="flex flex-col items-center gap-1.5 relative z-10">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/10 mb-2">
                    <Zap className="size-3 text-emerald-500" />
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Subscriber Identity Module</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Tu nueva línea:</p>
                <h2 className="text-3xl font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums animate-reveal-number">
                    {formatPhoneNumber(activatedNumber)}
                </h2>
             </div>

             <div className="flex items-center gap-4 pt-4 border-t border-slate-50 dark:border-slate-800 w-full justify-center relative z-10">
                <div className="flex items-center gap-1.5">
                   <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Red 4G LTE</span>
                </div>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Plan {planName}</span>
             </div>
          </div>

          <button 
            onClick={() => navigate(`/dashboard?new_line=${encodeURIComponent(activatedNumber)}`)}
            className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98] animate-in slide-in-from-bottom-4 duration-1000 delay-500"
          >
            <div className="size-12"></div>
            <span className="text-[14px] uppercase tracking-widest">Ir al Dashboard</span>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <ArrowRight className="size-6" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (error === "TIMEOUT") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 text-center">
        <div className="size-20 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center border border-amber-500/20 mb-8">
           <AlertCircle className="size-10 text-amber-500" />
        </div>
        <div className="space-y-4 mb-10">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Enlace Retrasado</h3>
            <p className="text-sm font-medium text-slate-500 max-w-[30ch] mx-auto leading-relaxed italic">Tu pago fue exitoso, pero el nodo físico está tardando en reportar el número asignado. Tu línea aparecerá en el panel en unos segundos.</p>
        </div>
        <button 
            onClick={() => navigate('/dashboard')}
            className="w-full max-w-sm h-16 bg-primary text-white font-black rounded-2xl shadow-button flex items-center justify-center gap-3 uppercase text-[12px] tracking-widest"
        >
            Ir al Dashboard
            <ArrowRight className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 overflow-hidden text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="flex flex-col items-center gap-12 w-full max-w-sm relative z-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-[2.5rem] border-2 border-primary/20 animate-ping opacity-20"></div>
          <div className="relative size-32 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
            <Smartphone className="size-14 text-primary/20" />
            <div className="absolute inset-0 z-20 overflow-hidden rounded-[2.5rem] pointer-events-none">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(29,78,216,0.8)] animate-scanner absolute top-0"></div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 size-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center animate-float-slow">
             <Globe className="size-5 text-primary" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight animate-pulse">Sincronizando Nodo</h1>
          <div key={statusIndex} className="animate-in slide-in-from-bottom-2 duration-500 flex flex-col items-center justify-center gap-3">
               <div className="flex items-center gap-2">
                   <Loader2 className="size-3 text-primary animate-spin" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                     {statusMessages[statusIndex]}
                   </span>
               </div>
               <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">
                   Handshake en tiempo real activo...
               </span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-12 flex items-center gap-4 opacity-20">
        <Cpu className="size-4" />
        <span className="text-[8px] font-black uppercase tracking-[0.5em]">TELSIM CORE RT-v5.0</span>
      </div>
    </div>
  );
};

export default Processing;
