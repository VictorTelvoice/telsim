import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, AlertCircle, RefreshCw, Cpu } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [currentStep, setCurrentStep] = useState('Verificando puerto...');
  const [errorState, setErrorState] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // BLOQUEO ATÓMICO: Impide ejecuciones duplicadas en la infraestructura física
  const isSubmitting = useRef(false);

  const planData = location.state;

  // Validación de integridad de datos de entrada
  if (!planData || !planData.planName || !planData.price) {
    return <Navigate to="/onboarding/plan" replace />;
  }

  useEffect(() => {
    const startProvisioning = async () => {
      // Protección contra múltiples señales de activación
      if (isSubmitting.current) return;
      isSubmitting.current = true;

      // Animación de barra de progreso técnica
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 400);

      try {
        const { planName, price, monthlyLimit } = planData;
        const userId = user?.id;

        if (!userId) throw new Error("Sesión expirada. Por favor, re-autentícate.");

        setCurrentStep('Sincronizando con el nodo físico...');

        // LLAMADA RPC ESTRICTA (Sin plan_type, solo plan_name)
        const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', {
          p_plan_name: planName || 'Standard',
          p_amount: Number(price),
          p_monthly_limit: Number(monthlyLimit)
        });

        if (rpcError) {
          isSubmitting.current = false; // Liberar bloqueo para permitir reintento tras error
          throw rpcError;
        }

        const finalNumber = rpcResult?.phone_number || rpcResult?.phoneNumber;

        setProgress(100);
        setCurrentStep('Puerto activado correctamente');

        // Registro en el ledger de notificaciones
        addNotification({
          title: 'SIM Activada',
          message: `Puerto ${finalNumber || 'NUEVO'} sincronizado bajo el plan ${planName}.`,
          type: 'activation',
          details: {
            number: finalNumber || 'Sincronizando...',
            plan: planName,
            activationDate: new Date().toLocaleDateString(),
            nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            price: `$${Number(price).toFixed(2)}`
          }
        });

        // Delay para confirmación visual
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Redirección con parámetros limpios
        const numberParam = finalNumber ? `&assignedNumber=${encodeURIComponent(finalNumber)}` : '';
        navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}${numberParam}`, { 
          replace: true 
        });

      } catch (err: any) {
        console.error("Fallo crítico de red:", err);
        setErrorState(err.message || "Error de conexión con el nodo de red.");
        isSubmitting.current = false;
      } finally {
        clearInterval(progressInterval);
      }
    };

    startProvisioning();
  }, [user, navigate, planData, addNotification]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light dark:bg-background-dark font-display">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs text-center px-6">
        {errorState ? (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="size-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-6 border border-rose-500/20 shadow-xl">
              <AlertCircle className="size-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2 tracking-tight">Fallo de Puerto</h2>
            <p className="text-[11px] font-bold text-slate-500 mb-8 leading-relaxed px-4">{errorState}</p>
            <button 
              onClick={() => navigate('/onboarding/plan')}
              className="w-full h-14 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              Reintentar en Marketplace
            </button>
          </div>
        ) : (
          <>
            <div className="relative flex items-center justify-center mb-12">
              <div className="absolute size-32 rounded-full border-2 border-primary/20 animate-ping opacity-30"></div>
              <div className="size-24 rounded-[2.2rem] border-[4px] border-slate-100 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shadow-2xl">
                <Cpu className="size-10 text-primary animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -right-2 size-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                <ShieldCheck className="size-5" />
              </div>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-4">Aprovisionando</h2>
            
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-6 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out shadow-lg"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="px-6 py-2 bg-primary/5 dark:bg-primary/10 rounded-full border border-primary/10">
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                {currentStep}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-12 w-full text-center opacity-30">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">
          TELSIM CORE INFRASTRUCTURE v7.2
        </p>
      </div>
    </div>
  );
};

export default Processing;