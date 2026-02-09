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
  const timeoutRef = useRef<number | null>(null);

  const planData = location.state;

  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    const startProvisioning = async () => {
      // 1. REGRESIÓN DE SEGURIDAD (Ejecución Única)
      if (hasExecuted.current) return;
      hasExecuted.current = true;

      const planName = String(planData?.planName || 'Pro');

      // 2. SALIDA DE EMERGENCIA (5 Segundos)
      timeoutRef.current = window.setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 5000);

      try {
        const rpcArgs = {
          p_plan_name: planName,
          p_amount: Number(planData?.price || 39.90),
          p_monthly_limit: Number(planData?.monthlyLimit || 400)
        };

        // 3. LLAMADA RPC ÚNICA (Sin .headers())
        const { data, error: rpcError } = await supabase.rpc('purchase_subscription', rpcArgs);

        let finalNumber = data?.phone_number || data?.phoneNumber;

        // 4. RESCATE PARA ERROR 23505 (DUPLICADOS)
        if (rpcError && rpcError.code === '23505') {
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('phone_number')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          finalNumber = existing?.phone_number;
        } else if (rpcError) {
          throw rpcError;
        }

        // 5. NAVEGACIÓN DE ÉXITO
        if (finalNumber) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
        }

      } catch (err) {
        console.error("Provisioning failed, falling back to emergency exit:", err);
        // El timeout se encargará de llevar al usuario al dashboard si no hay éxito.
      }
    };

    startProvisioning();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, navigate, planData]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8">
      <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse scale-150"></div>
          <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
            <Loader2 className="size-12 text-primary animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic">
            Configurando tu nueva línea...
          </p>
        </div>
      </div>
      <div className="absolute bottom-12 opacity-10">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">TELSIM PURE-SYNC v5.0</p>
      </div>
    </div>
  );
};

export default Processing;