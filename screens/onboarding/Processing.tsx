import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { Loader2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * TELSIM INFRASTRUCTURE CORE v5.2
 * Este componente es el cerebro de la activación. Maneja bloqueos atómicos
 * y recuperación de datos en caso de colisiones de base de datos.
 */
const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [currentStep, setCurrentStep] = useState('Verificando parámetros...');
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isSelfHealing, setIsSelfHealing] = useState(false);
  
  // 1. SEMÁFORO ATÓMICO: Impide dobles peticiones incluso con clics rápidos o re-renders.
  const isSubmitting = useRef(false);

  const planData = location.state;

  // Validación de integridad de datos de entrada
  if (!planData || !planData.planName || !planData.price || planData.planName === 'started') {
    return <Navigate to="/onboarding/plan" replace />;
  }

  useEffect(() => {
    const startProvisioning = async () => {
      // 2. GUARDIA DE ENTRADA: Si ya hay un proceso, abortamos silenciosamente.
      if (isSubmitting.current) return;
      isSubmitting.current = true;

      const minAnimationTime = new Promise(resolve => setTimeout(resolve, 3200));

      try {
        const { planName, price, monthlyLimit } = planData;
        const userId = user?.id;

        if (!userId) throw new Error("Sesión de usuario expirada.");

        setCurrentStep('Conectando al puerto físico...');

        // 3. LLAMADA RPC (Purchase Subscription)
        const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', {
          p_plan_name: planName,
          p_amount: Number(price),
          p_monthly_limit: Number(monthlyLimit)
        });

        if (rpcError) {
          // Si hay error, liberamos el semáforo para permitir reintento manual
          isSubmitting.current = false;
          throw rpcError;
        }

        let finalNumber = rpcResult?.phoneNumber || rpcResult?.phone_number;

        // 4. PROTOCOLO DE AUTOCURACIÓN (Self-Healing)
        // Si el RPC fue exitoso (success: true) pero el número es null por latencia de réplica
        if (!finalNumber) {
          setIsSelfHealing(true);
          setCurrentStep('Recuperando numeración del nodo...');
          
          // Esperamos 1.2 segundos para que la DB se estabilice tras el commit
          await new Promise(resolve => setTimeout(resolve, 1200));

          // Consultamos directamente la tabla de suscripciones (ledger de verdad)
          const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('phone_number')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (subError) {
            isSubmitting.current = false;
            throw subError;
          }

          finalNumber = subData?.phone_number;

          if (!finalNumber) {
            isSubmitting.current = false;
            throw new Error("El sistema no pudo confirmar la línea. Por favor, contacta a soporte.");
          }
        }

        // 5. FINALIZACIÓN EXITOSA
        setCurrentStep('Sincronización completa: ' + finalNumber);
        
        // Registrar notificación en el ledger del usuario
        addNotification({
          title: 'SIM Activada',
          message: `Línea ${finalNumber} aprovisionada correctamente.`,
          type: 'activation',
          details: {
            number: finalNumber,
            plan: planName,
            activationDate: new Date().toLocaleDateString(),
            nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            price: `$${Number(price).toFixed(2)}`
          }
        });

        await minAnimationTime;
        
        // Navegación final: Mantenemos isSubmitting en true para evitar duplicados al desmontar
        navigate('/onboarding/success', { 
          state: { assignedNumber: finalNumber, planName },
          replace: true 
        });

      } catch (err: any) {
        console.error("Fallo crítico en infraestructura TELSIM:", err);
        setErrorState(err.message || "Error de conexión con el nodo físico.");
        setCurrentStep('Error de provisión');
        isSubmitting.current = false; // Solo aquí permitimos reintento manual
      }
    };

    startProvisioning();
  }, [user, navigate, planData, addNotification]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light dark:bg-background-dark font-display">
      {/* Background Decor */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 dark:opacity-40">
        <div className="w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs text-center px-6">
        {errorState ? (
          <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
            <div className="size-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20 shadow-xl shadow-rose-500/5">
              <AlertCircle className="size-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2 tracking-tight">Fallo de Puerto</h2>
            <p className="text-[11px] font-bold text-slate-500 mb-8 leading-relaxed px-4">{errorState}</p>
            <button 
              onClick={() => navigate('/onboarding/plan')}
              className="w-full h-14 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              Volver al Mercado
            </button>
          </div>
        ) : (
          <>
            <div className="relative flex items-center justify-center mb-12">
              <div className="absolute size-32 rounded-full border-2 border-primary/20 animate-ping opacity-30"></div>
              <div className="size-24 rounded-full border-[4px] border-slate-100 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shadow-2xl">
                {isSelfHealing ? (
                  <RefreshCw className="size-10 text-primary animate-spin" />
                ) : (
                  <Loader2 className="size-10 text-primary animate-spin" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 size-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                <ShieldCheck className="size-5" />
              </div>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-4">
              {isSelfHealing ? 'Verificando' : 'Sincronizando'}
            </h2>
            
            <div className="flex flex-col items-center gap-3">
              <div className="px-5 py-2 bg-primary/5 dark:bg-primary/10 rounded-full border border-primary/10">
                <p className="text-primary text-[9px] font-black uppercase tracking-[0.2em]">
                  {currentStep}
                </p>
              </div>
              <div className="flex gap-1.5 mt-2">
                <div className="size-1.5 rounded-full bg-primary/30 animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-12 w-full text-center opacity-30">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">
          TELSIM PHYSICAL INFRASTRUCTURE CORE v5.2
        </p>
      </div>
    </div>
  );
};

export default Processing;