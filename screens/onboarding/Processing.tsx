import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, RefreshCw, Cpu } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const hasExecuted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const planData = location.state;
  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    const execute = async () => {
      if (hasExecuted.current) return;
      hasExecuted.current = true;

      const planName = String(planData?.planName || 'Pro');

      try {
        const rpcArgs = {
          p_plan_name: planName,
          p_amount: Number(planData?.price || 39.90),
          p_monthly_limit: Number(planData?.monthlyLimit || 400)
        };

        // LLAMADA AL RPC
        const { data, error: rpcError } = await supabase.rpc('purchase_subscription', rpcArgs);

        let finalNumber = data?.phone_number || data?.phoneNumber;

        // MANEJO DE DUPLICADO (RESCATE INMEDIATO)
        if (rpcError && rpcError.code === '23505') {
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('phone_number')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          finalNumber = existing?.phone_number;
        } else if (rpcError) {
          throw rpcError;
        }

        // REDIRECCIÓN A ÉXITO
        const numberParam = finalNumber ? `&assignedNumber=${encodeURIComponent(finalNumber)}` : '';
        navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}${numberParam}`, { replace: true });

      } catch (err: any) {
        console.error("Processing error:", err);
        setError("Error en la sincronización.");
      }
    };

    execute();
  }, [user, navigate, planData]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8">
      <div className="w-full max-w-xs text-center flex flex-col items-center">
        {!error ? (
          <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-150"></div>
              <div className="size-20 rounded-[1.8rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
                <Loader2 className="size-10 text-primary animate-spin" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-400 italic">Procesando tu suscripción...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6">Error de Nodo</h2>
            <button 
              onClick={() => window.location.reload()}
              className="w-full h-14 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
            >
              <RefreshCw className="size-4" />
              Reintentar
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-12 opacity-30 flex items-center gap-2">
        <Cpu className="size-3 text-slate-400" />
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">TELSIM PURE-SYNC v1.2</p>
      </div>
    </div>
  );
};

export default Processing;