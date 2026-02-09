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
    const startProvisioning = async () => {
      // Regla de Ejecución Única: Evita dobles disparos por StrictMode o re-renders
      if (hasExecuted.current) return;
      hasExecuted.current = true;

      const planName = String(planData?.planName || 'Pro');

      try {
        const rpcArgs = {
          p_plan_name: planName,
          p_amount: Number(planData?.price || 39.90),
          p_monthly_limit: Number(planData?.monthlyLimit || 400)
        };

        // 1. LLAMADA AL RPC (Sin .headers() para evitar errores de sintaxis)
        const { data, error: rpcError } = await supabase.rpc('purchase_subscription', rpcArgs);

        let finalNumber = data?.phone_number || data?.phoneNumber;

        // 2. EL RESCATE FINAL (Si el RPC falla o no devuelve el número)
        // Buscamos si la base de datos ya creó la suscripción (especialmente útil para error 23505)
        if (rpcError || !finalNumber) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('phone_number')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          finalNumber = existingSub?.phone_number;
        }

        // 3. NAVEGACIÓN FORZADA (Éxito o Dashboard)
        if (finalNumber) {
          navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
        } else {
          // Si falló el aprovisionamiento y el rescate, redirigimos al dashboard para no bloquear al usuario
          navigate('/dashboard', { replace: true });
        }

      } catch (err) {
        console.error("Critical Provisioning Error:", err);
        // Silenciamos el error técnico y redirigimos al dashboard como fallback
        navigate('/dashboard', { replace: true });
      }
    };

    startProvisioning();
  }, [user, navigate, planData]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8">
      <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
        <div className="relative">
          {/* Brillo ambiental elegante */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse scale-150"></div>
          
          <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
            <Loader2 className="size-12 text-primary animate-spin" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic">
            Configurando tu nueva línea...
          </p>
          {/* Indicador de carga sutil */}
          <div className="flex justify-center gap-1">
             <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
             <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
             <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
      
      {/* Footer de versión minimalista */}
      <div className="absolute bottom-12 opacity-20">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">TELSIM PURE-SYNC v4.1</p>
      </div>
    </div>
  );
};

export default Processing;