import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, AlertCircle, Cpu, Globe } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const pollingCount = useRef(0);
  const maxPolling = 15; // 30 segundos total

  const sessionId = searchParams.get('session_id');
  const planName = searchParams.get('plan') || 'Pro';

  const statusMessages = [
    "Recibiendo confirmación de Stripe...",
    "Sincronizando con Webhook TELSIM...",
    "Validando montos en el Ledger...",
    "Provisionando puerto GSM físico...",
    "Finalizando enlace seguro..."
  ];

  if (!user || !sessionId) return <Navigate to="/dashboard" replace />;

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Lógica de Polling: Esperamos a que el Webhook cree el registro con el monto correcto
  useEffect(() => {
    let pollInterval: any;

    const checkSubscription = async () => {
      pollingCount.current += 1;
      
      console.log(`[POLLING] Intento ${pollingCount.current} de verificar suscripción para sesión: ${sessionId}`);

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('phone_number, amount')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (data && data.phone_number) {
        console.log('[POLLING SUCCESS] Suscripción detectada en DB:', data);
        clearInterval(pollInterval);
        
        // Pequeño delay para UX
        setTimeout(() => {
          navigate(`/onboarding/success?session_id=${sessionId}&planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(data.phone_number)}`, { replace: true });
        }, 1500);
      }

      if (pollingCount.current >= maxPolling) {
        console.error('[POLLING TIMEOUT] El Webhook no respondió a tiempo.');
        clearInterval(pollInterval);
        setError("TIMEOUT");
      }
    };

    pollInterval = setInterval(checkSubscription, 2500);
    checkSubscription(); // Primer chequeo inmediato

    return () => clearInterval(pollInterval);
  }, [sessionId]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 overflow-hidden text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="flex flex-col items-center gap-12 w-full max-w-sm relative z-10">
        {error === "TIMEOUT" ? (
          <div className="w-full flex flex-col items-center space-y-8 animate-in zoom-in duration-300">
            <div className="size-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center border border-amber-500/20">
               <AlertCircle className="size-10 text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sincronización Lenta</h3>
            <p className="text-xs font-medium text-slate-500 max-w-[25ch]">Tu pago fue procesado, pero la red está tardando en responder. Verifica tu panel en unos minutos.</p>
            <button onClick={() => navigate('/dashboard')} className="px-8 h-12 bg-primary text-white font-black rounded-xl uppercase text-[10px] tracking-widest">Ir al Dashboard</button>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="absolute inset-0 rounded-[2.5rem] border-2 border-primary/20 animate-ping opacity-20"></div>
              <div className="relative size-32 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
                <span className="material-symbols-rounded text-[64px] text-primary/20">sim_card</span>
                <div className="absolute inset-0 z-20 overflow-hidden rounded-[2.5rem] pointer-events-none">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(29,78,216,0.8)] animate-scanner absolute top-0"></div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 size-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center animate-float-slow">
                 <Globe className="size-5 text-primary" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight animate-pulse">
                Provisionando
              </h1>
              <div key={statusIndex} className="animate-in slide-in-from-bottom-2 duration-500 flex items-center justify-center gap-2">
                   <Loader2 className="size-3 text-slate-400 animate-spin" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                     {statusMessages[statusIndex]}
                   </span>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="absolute bottom-12 flex items-center gap-4 opacity-20">
        <Cpu className="size-4" />
        <span className="text-[8px] font-black uppercase tracking-[0.5em]">TELSIM CORE NODE v3.4</span>
      </div>
    </div>
  );
};

export default Processing;