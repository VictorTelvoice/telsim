import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, RefreshCw, Cpu, AlertCircle } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Bloqueo para evitar doble ejecución en desarrollo/StrictMode
  const hasExecuted = useRef(false);

  const planData = location.state;

  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    const executePurchase = async () => {
      if (hasExecuted.current) return;
      hasExecuted.current = true;

      try {
        const rpcArgs = {
          p_plan_name: String(planData?.planName || 'Pro'),
          p_amount: Number(planData?.price || 39.90),
          p_monthly_limit: Number(planData?.monthlyLimit || 400)
        };

        const { data, error: rpcError } = await supabase.rpc('purchase_subscription', rpcArgs);

        if (rpcError) throw rpcError;

        const phoneNumber = data?.phone_number || data?.phoneNumber;
        
        // Éxito: Redirección inmediata
        const numberParam = phoneNumber ? `&assignedNumber=${encodeURIComponent(phoneNumber)}` : '';
        navigate(`/onboarding/success?planName=${encodeURIComponent(rpcArgs.p_plan_name)}${numberParam}`, { replace: true });

      } catch (err: any) {
        console.error("RPC Error:", err);
        setError(err.message || "Error al procesar la suscripción");
        setLoading(false);
      }
    };

    executePurchase();
  }, [user, navigate, planData]);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8">
      <div className="w-full max-w-xs text-center flex flex-col items-center">
        {loading ? (
          <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-150"></div>
              <div className="size-20 rounded-[1.8rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
                <Loader2 className="size-10 text-primary animate-spin" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Activando Puerto</h2>
            <p className="text-sm font-bold text-slate-400 italic">Procesando tu suscripción...</p>
            
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-10 overflow-hidden">
              <div className="h-full bg-primary animate-[scanner_2s_infinite]"></div>
            </div>
          </div>
        ) : error ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="size-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-6 border border-rose-500/20 shadow-xl">
              <AlertCircle className="size-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">Error de Nodo</h2>
            <p className="text-[11px] font-bold text-slate-500 mb-8 leading-relaxed px-4">{error}</p>
            
            <button 
              onClick={handleRetry}
              className="w-full h-14 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
            >
              <RefreshCw className="size-4" />
              Reintentar
            </button>
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-12 opacity-30 flex items-center gap-2">
        <Cpu className="size-3 text-slate-400" />
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">TELSIM PURE-SYNC v1.0</p>
      </div>
    </div>
  );
};

export default Processing;