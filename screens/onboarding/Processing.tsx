
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Loader2, 
  AlertCircle, 
  Cpu, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight,
  Zap,
  Smartphone
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
    "Handshake con Nodo TELSIM...",
    "Provisionando puerto físico...",
    "Sincronizando ID de red...",
    "Finalizando enlace seguro..."
  ];

  // Formateador de número premium
  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
      return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    return num.startsWith('+') ? num : `+${num}`;
  };

  const fetchAssignedNumber = async (slotId: string) => {
    try {
      const { data, error } = await supabase
        .from('slots')
        .select('phone_number')
        .eq('slot_id', slotId)
        .maybeSingle();
      
      if (data?.phone_number) {
        setActivatedNumber(data.phone_number);
        setIsSuccess(true);
      }
    } catch (err) {
      console.error("Error fetching number from slot:", err);
    }
  };

  const checkStatus = async () => {
    // Timeout de 60 segundos
    if (Date.now() - startTime.current > 60000) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setError("TIMEOUT");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, slot_id, phone_number')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        if (data.phone_number) {
          setActivatedNumber(data.phone_number);
          setIsSuccess(true);
        } else if (data.slot_id) {
          await fetchAssignedNumber(data.slot_id);
        }
      }
    } catch (err) {
      console.debug("Polling check error", err);
    }
  };

  useEffect(() => {
    if (!user || !sessionId) return;

    // 1. Configurar Realtime (Suscripción instantánea)
    const channel = supabase
      .channel('provisioning_check')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'subscriptions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const updatedSub = payload.new as any;
        if (updatedSub.status === 'active') {
          if (updatedSub.phone_number) {
            setActivatedNumber(updatedSub.phone_number);
            setIsSuccess(true);
          } else if (updatedSub.slot_id) {
            fetchAssignedNumber(updatedSub.slot_id);
          }
        }
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    // 2. Fallback de Polling (Cada 3 segundos)
    pollIntervalRef.current = setInterval(checkStatus, 3000);
    checkStatus(); // Primera ejecución inmediata

    // 3. Animación de mensajes
    const msgInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2800);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current);
      clearInterval(msgInterval);
    };
  }, [user, sessionId]);

  if (!user || !sessionId) return <Navigate to="/dashboard" replace />;

  // RENDER: PANTALLA DE ÉXITO
  if (isSuccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 animate-in fade-in duration-700">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-10 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full scale-150 animate-pulse"></div>
            <div className="size-28 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-emerald-500/20 shadow-2xl flex items-center justify-center relative z-10">
               <CheckCircle2 className="size-14 text-emerald-500" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">¡Línea Activada con éxito!</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tu infraestructura física está On-Air.</p>
          </div>

          <div className="w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] p-8 border-2 border-emerald-500/10 shadow-card flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                <Zap className="size-3 text-emerald-500" />
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Subscriber Number</span>
             </div>
             <h2 className="text-3xl font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums">
                {formatPhoneNumber(activatedNumber)}
             </h2>
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Plan {planName} Activado</span>
          </div>

          <button 
            onClick={() => navigate('/dashboard')}
            className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98]"
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

  // RENDER: PANTALLA DE ERROR / TIMEOUT
  if (error === "TIMEOUT") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 text-center">
        <div className="size-20 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center border border-amber-500/20 mb-8">
           <AlertCircle className="size-10 text-amber-500" />
        </div>
        <div className="space-y-4 mb-10">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Handshake Lento</h3>
            <p className="text-sm font-medium text-slate-500 max-w-[30ch] mx-auto leading-relaxed italic">Tu pago fue recibido, pero el nodo físico está tardando en responder. No te preocupes, tu línea aparecerá en el panel en breve.</p>
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

  // RENDER: PANTALLA DE PROCESAMIENTO
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
