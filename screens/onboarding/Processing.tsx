
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, AlertCircle, Cpu, Globe, RefreshCw, CheckCircle2 } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [error, setError] = useState<string | null>(null);
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  
  const pollingCount = useRef(0);
  const maxPolling = 45; // ~110 segundos
  const pollIntervalRef = useRef<any>(null);

  const sessionId = searchParams.get('session_id');
  const planName = searchParams.get('plan') || 'Pro';

  const statusMessages = [
    "Recibiendo confirmación de Stripe...",
    "Sincronizando con Webhook TELSIM...",
    "Provisionando puerto físico...",
    "Validando ID de red local...",
    "Finalizando enlace seguro..."
  ];

  if (!user || !sessionId) return <Navigate to="/dashboard" replace />;

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const checkSubscription = async () => {
    pollingCount.current += 1;
    
    // Verificamos si la suscripción ya fue insertada por el webhook
    const { data, error: fetchError } = await supabase
      .from('subscriptions')
      .select('phone_number, status')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (data?.phone_number && data?.status === 'active') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      navigate(`/onboarding/success?session_id=${sessionId}&planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(data.phone_number)}`, { replace: true });
      return true;
    }

    if (pollingCount.current >= maxPolling) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setError("TIMEOUT");
    }
    return false;
  };

  useEffect(() => {
    pollIntervalRef.current = setInterval(checkSubscription, 2500);
    checkSubscription(); // Llamada inmediata
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [sessionId]);

  const handleManualVerify = async () => {
    setIsVerifyingManual(true);
    try {
      // Intento de forzar verificación vía API Node/Edge si existe el endpoint
      const response = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await response.json();

      if (data.status === 'completed') {
        navigate(`/onboarding/success?session_id=${sessionId}&planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(data.phoneNumber)}`, { replace: true });
      } else {
        // Fallback: Si no hay endpoint, simplemente intentamos una consulta extra a la DB
        const { data: retryData } = await supabase.from('subscriptions').select('phone_number').eq('stripe_session_id', sessionId).maybeSingle();
        if (retryData?.phone_number) {
            navigate(`/onboarding/success?session_id=${sessionId}&planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(retryData.phone_number)}`, { replace: true });
        } else {
            alert("Aún estamos esperando la confirmación física. Por favor espera 10 segundos más.");
        }
      }
    } catch (err) {
      setError("RETRY_DB");
    } finally {
      setIsVerifyingManual(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 overflow-hidden text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="flex flex-col items-center gap-12 w-full max-w-sm relative z-10">
        {error === "TIMEOUT" ? (
          <div className="w-full flex flex-col items-center space-y-8 animate-in zoom-in duration-300">
            <div className="size-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center border border-amber-500/20 shadow-lg">
               <AlertCircle className="size-10 text-amber-500" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Enlace Retrasado</h3>
                <p className="text-xs font-medium text-slate-500 max-w-[30ch] mx-auto leading-relaxed">Tu pago fue recibido, pero la infraestructura física está tardando más de lo habitual en responder.</p>
            </div>

            <div className="w-full space-y-3">
                <button 
                    onClick={handleManualVerify}
                    disabled={isVerifyingManual}
                    className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-primary text-primary font-black rounded-2xl flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    {isVerifyingManual ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Sincronizar Manualmente
                </button>
                <button onClick={() => navigate('/dashboard')} className="w-full h-12 text-slate-400 font-black uppercase text-[10px] tracking-widest">Ir al Dashboard</button>
            </div>
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
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight animate-pulse">Provisionando Puerto</h1>
              <div key={statusIndex} className="animate-in slide-in-from-bottom-2 duration-500 flex flex-col items-center justify-center gap-3">
                   <div className="flex items-center gap-2">
                       <Loader2 className="size-3 text-primary animate-spin" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                         {statusMessages[statusIndex]}
                       </span>
                   </div>
                   <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">
                       Haciendo handshake con Nodo CL...
                   </span>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="absolute bottom-12 flex items-center gap-4 opacity-20">
        <Cpu className="size-4" />
        <span className="text-[8px] font-black uppercase tracking-[0.5em]">TELSIM CLOUD v4.1</span>
      </div>
    </div>
  );
};

export default Processing;