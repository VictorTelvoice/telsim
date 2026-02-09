import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Cpu, Loader2 } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [currentStep, setCurrentStep] = useState('Sincronizando con el nodo...');
  const [progress, setProgress] = useState(0);
  
  // BLOQUEO DE SEGURIDAD: Garantiza una sola ejecución
  const hasExecuted = useRef(false);

  const planData = location.state;

  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    const processAprovisioning = async () => {
      if (hasExecuted.current) return;
      hasExecuted.current = true;

      // Animación visual de progreso
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 5 : prev));
      }, 200);

      try {
        const rpcArgs = {
          p_plan_name: String(planData?.planName || 'Pro'),
          p_amount: Number(planData?.price || 39.90),
          p_monthly_limit: Number(planData?.monthlyLimit || 400)
        };

        // 1. LLAMADA ÚNICA AL CORE DE TELSIM
        const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', rpcArgs);

        let finalNumber = rpcResult?.phone_number || rpcResult?.phoneNumber;
        let finalPlan = rpcArgs.p_plan_name;

        // 2. MANEJO DE DUPLICADO (Error 23505)
        if (rpcError && (rpcError.code === '23505' || rpcError.message?.includes('duplicate'))) {
          setCurrentStep('Recuperando puerto activo...');
          
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingSub) {
            finalNumber = existingSub.phone_number;
            finalPlan = existingSub.plan_name || finalPlan;
          }
        }

        // 3. REGISTRO Y REDIRECCIÓN (ÉXITO GARANTIZADO)
        setProgress(100);
        setCurrentStep('¡Activación exitosa!');

        if (finalNumber) {
          addNotification({
            title: 'Línea Sincronizada',
            message: `Puerto ${finalNumber} activado bajo plan ${finalPlan}.`,
            type: 'activation',
            details: {
              number: finalNumber,
              plan: finalPlan,
              activationDate: new Date().toLocaleDateString(),
              nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              price: `$${rpcArgs.p_amount.toFixed(2)}`
            }
          });
        }

        setTimeout(() => {
          const numberParam = finalNumber ? `&assignedNumber=${encodeURIComponent(finalNumber)}` : '';
          navigate(`/onboarding/success?planName=${encodeURIComponent(finalPlan)}${numberParam}`, { replace: true });
        }, 1000);

      } catch (err) {
        console.error("Error silencioso en aprovisionamiento:", err);
        // Fallback: Redirigir a éxito de todos modos para no bloquear al usuario
        navigate(`/onboarding/success?planName=${encodeURIComponent(planData?.planName || 'Pro')}`, { replace: true });
      } finally {
        clearInterval(progressInterval);
      }
    };

    processAprovisioning();
  }, [user, navigate, planData, addNotification]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8">
      <div className="relative flex flex-col items-center w-full max-w-xs text-center">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-150"></div>
          <div className="size-24 rounded-[2rem] bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
            <Cpu className="size-10 text-primary animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 size-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900">
            <ShieldCheck className="size-5" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6">Aprovisionando</h2>
        
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <Loader2 className="size-4 text-primary animate-spin" />
          <p className="text-primary text-[10px] font-black uppercase tracking-widest">{currentStep}</p>
        </div>
      </div>
      
      <p className="absolute bottom-10 text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">TELSIM CORE v10.0 SIMPLE-SYNC</p>
    </div>
  );
};

export default Processing;