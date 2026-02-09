import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const hasExecuted = useRef(false);

  const planData = location.state;

  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    const startTunnelLogic = async () => {
      // 1. REGRESIÓN DE SEGURIDAD (Ejecución Única)
      if (hasExecuted.current) return;
      hasExecuted.current = true;

      const planName = String(planData?.planName || 'Pro');
      const price = Number(planData?.price || 39.90);
      const limit = Number(planData?.monthlyLimit || 400);

      try {
        const rpcArgs = {
          p_plan_name: planName,
          p_amount: price,
          p_monthly_limit: limit
        };

        // 2. DISPARO DEL RPC (Sin .headers())
        const { data: rpcData, error: rpcError } = await supabase.rpc('purchase_subscription', rpcArgs);

        let finalNumber = rpcData?.phone_number || rpcData?.phoneNumber;

        // 3. ÉXITO INMEDIATO
        if (!rpcError && finalNumber) {
          navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
          return;
        }

        // 4. LÓGICA DE RESCATE (RESCATE SILENCIOSO)
        // Definimos la función de rescate para reutilizarla
        const performRescueLookup = async () => {
          const { data } = await supabase
            .from('subscriptions')
            .select('phone_number')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return data?.phone_number;
        };

        // Intento de rescate 1: Inmediato (Útil para errores 23505)
        finalNumber = await performRescueLookup();
        if (finalNumber) {
          navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
          return;
        }

        // Intento de rescate 2: Espera de 2 segundos (Para dar tiempo a la propagación de datos)
        await new Promise(resolve => setTimeout(resolve, 2000));
        finalNumber = await performRescueLookup();

        if (finalNumber) {
          navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
        } else {
          // SALIDA DE EMERGENCIA FINAL
          navigate('/dashboard', { replace: true });
        }

      } catch (err) {
        console.error("Tunnel Logic Critical Failure:", err);
        navigate('/dashboard', { replace: true });
      }
    };

    startTunnelLogic();
  }, [user, navigate, planData]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8">
      <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
        <div className="relative">
          {/* Aura de carga elegante */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse scale-150"></div>
          
          <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
            <Loader2 className="size-12 text-primary animate-spin" />
          </div>
        </div>
        
        <div className="text-center space-y-3">
          <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic animate-pulse">
            Configurando tu nueva línea...
          </p>
          <div className="flex justify-center gap-1.5">
             <div className="size-1 bg-primary/30 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
             <div className="size-1 bg-primary/30 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
             <div className="size-1 bg-primary/30 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
      
      {/* Indicador de versión técnica sutil */}
      <div className="absolute bottom-12 opacity-10">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">TELSIM TUNNEL-SYNC v6.2</p>
      </div>
    </div>
  );
};

export default Processing;