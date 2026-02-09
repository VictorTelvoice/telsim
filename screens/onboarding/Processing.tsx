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
    const processSubscription = async () => {
      // Regla de Ejecución Única: Previene dobles disparos
      if (hasExecuted.current) return;
      hasExecuted.current = true;

      const planName = String(planData?.planName || 'Pro');

      try {
        const rpcArgs = {
          p_plan_name: planName,
          p_amount: Number(planData?.price || 39.90),
          p_monthly_limit: Number(planData?.monthlyLimit || 400)
        };

        // 1. LLAMADA AL RPC (Sin .headers() ni polling)
        const { data, error: rpcError } = await supabase.rpc('purchase_subscription', rpcArgs);

        let finalNumber = data?.phone_number || data?.phoneNumber;

        // 2. GESTIÓN DE 'YA EXISTE' (Rescate 23505)
        if (rpcError && rpcError.code === '23505') {
          // Si ya existe, simplemente lo buscamos en la tabla de suscripciones
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('phone_number')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          finalNumber = existingSub?.phone_number;
        }

        // 3. ÉXITO FORZADO O SALIDA AL DASHBOARD
        if (finalNumber) {
          navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
        } else {
          // Si no hay número tras el rescate, evitamos el error y vamos al panel
          navigate('/dashboard', { replace: true });
        }

      } catch (err) {
        console.error("Critical Processing Logic Failure:", err);
        navigate('/dashboard', { replace: true });
      }
    };

    processSubscription();
  }, [user, navigate, planData]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/15 rounded-full blur-2xl animate-pulse scale-150"></div>
          <div className="size-20 bg-white dark:bg-slate-900 rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        </div>
        <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic">
          Configurando tu nueva línea...
        </p>
      </div>
      
      <div className="absolute bottom-12 opacity-10">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">TELSIM PURE-SYNC v7.0</p>
      </div>
    </div>
  );
};

export default Processing;