import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [error, setError] = useState<string | null>(null);
  const hasExecuted = useRef(false);

  const planData = location.state;
  if (!user) return <Navigate to="/login" replace />;

  const startProvisioning = async () => {
    // 1. LLAMADA ÚNICA: Garantiza que el proceso se dispara una sola vez
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const planName = String(planData?.planName || 'Pro');
    const price = Number(planData?.price || 39.90);
    const limit = Number(planData?.monthlyLimit || 400);

    try {
      setError(null);

      // 2. DISPARO DEL RPC: purchase_subscription
      const { data, error: rpcError } = await supabase.rpc('purchase_subscription', {
        p_plan_name: planName,
        p_amount: price,
        p_monthly_limit: limit
      });

      // 3. MANEJO DE FLUJO DE ÉXITO
      if (!rpcError && data?.success) {
        const finalNumber = data.phoneNumber || data.phone_number;
        
        // Crear notificación de activación
        await addNotification({
          title: 'Puerto Activado',
          message: `Tu nueva línea ${finalNumber} ha sido sincronizada con éxito en el nodo central.`,
          type: 'activation',
          details: {
            number: finalNumber,
            plan: planName,
            activationDate: new Date().toLocaleDateString('es-ES'),
            nextBilling: 'En 30 días',
            price: price.toFixed(2)
          }
        });

        navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
        return;
      }

      // 4. GESTIÓN DE RESCATE SILENCIOSO (Error 23505 de duplicidad o éxito parcial)
      if (rpcError?.code === '23505' || (!data?.success)) {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('phone_number')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.phone_number) {
          navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(existing.phone_number)}`, { replace: true });
          return;
        }
      }

      // 5. FALLO NO CONTROLADO: Dispara el catch para la redirección de 5s
      throw rpcError || new Error("Fallo en la sincronización.");

    } catch (err: any) {
      console.error("Critical Provisioning Error:", err);
      // Activamos el estado de error visual para el feedback de redirección
      setError("FALLBACK_REDIRECT");
      
      // Limpieza técnica: Redirigimos al dashboard tras 5 segundos
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 5000);
    }
  };

  useEffect(() => {
    startProvisioning();
  }, [user]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 transition-colors duration-500">
      <div className="flex flex-col items-center gap-10 w-full max-w-xs animate-in fade-in duration-700">
        
        {!error ? (
          /* VISTA DE CARGA INTACTA */
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse scale-150"></div>
              <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
                <Loader2 className="size-12 text-primary animate-spin" />
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic animate-pulse">
                Verificando disponibilidad y asignando número...
              </p>
              <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                INFRAESTRUCTURA FÍSICA CL
              </p>
            </div>
          </div>
        ) : (
          /* VISTA DE FALLO TEMPORAL ANTES DE REDIRECCIÓN */
          <div className="w-full flex flex-col items-center text-center space-y-8 animate-in zoom-in-95">
            <div className="size-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center border border-rose-500/20 shadow-lg">
               <AlertCircle className="size-10 text-rose-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Enlace Retrasado</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed px-4">
                Redirigiendo al panel de control para verificar tu estado...
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-12 opacity-10 pointer-events-none">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">TELSIM SECURE-INIT v10.2</p>
      </div>
    </div>
  );
};

export default Processing;