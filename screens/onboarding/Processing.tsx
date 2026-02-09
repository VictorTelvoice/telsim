import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, Cpu, RefreshCw } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const hasExecuted = useRef(false);
  const [currentStep, setCurrentStep] = useState('Procesando tu suscripción...');

  const planData = location.state;
  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    const startProvisioning = async () => {
      if (hasExecuted.current) return;
      hasExecuted.current = true;

      const planName = String(planData?.planName || 'Pro');

      try {
        const rpcArgs = {
          p_plan_name: planName,
          p_amount: Number(planData?.price || 39.90),
          p_monthly_limit: Number(planData?.monthlyLimit || 400)
        };

        // 1. LLAMADA AL RPC (EJECUCIÓN ÚNICA)
        const { data, error: rpcError } = await supabase.rpc('purchase_subscription', rpcArgs);

        let finalNumber = data?.phone_number || data?.phoneNumber;

        // 2. LÓGICA DE RESCATE (Error 23505 o phoneNumber nulo)
        if ((rpcError && rpcError.code === '23505') || (!finalNumber && !rpcError)) {
          setCurrentStep('Recuperando puerto activo...');
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('phone_number')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          finalNumber = sub?.phone_number;
        }

        // 3. NAVEGACIÓN GARANTIZADA
        const numberParam = finalNumber ? `&assignedNumber=${encodeURIComponent(finalNumber)}` : '';
        navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}${numberParam}`, { replace: true });

      } catch (err) {
        console.error("Critical Processing Error:", err);
        // En lugar de mostrar error, enviamos al dashboard para no bloquear
        navigate('/dashboard', { replace: true });
      }
    };

    startProvisioning();
  }, [user, navigate, planData]);

  const handleForceSync = () => {
    // Forzar recarga limpiando caché del navegador
    (window as any).location.reload(true);
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8">
      <div className="w-full max-w-xs text-center flex flex-col items-center">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-150"></div>
          <div className="size-24 rounded-[2rem] bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        </div>

        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Activando Puerto</h2>
        <p className="text-sm font-bold text-slate-400 italic mb-10">{currentStep}</p>
        
        <button 
          onClick={handleForceSync}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
        >
          <RefreshCw className="size-3" />
          Forzar Sincronización
        </button>
      </div>

      <div className="absolute bottom-12 opacity-30 flex items-center gap-2">
        <Cpu className="size-3 text-slate-400" />
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">TELSIM PURE-SYNC v2.0</p>
      </div>
    </div>
  );
};

export default Processing;