import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { Loader2, ShieldCheck, AlertCircle, RefreshCw, Cpu } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [currentStep, setCurrentStep] = useState('Verificando puerto...');
  const [isRecovering, setIsRecovering] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // 1. BLOQUEO ATÓMICO: Impide ejecuciones duplicadas a nivel de CPU
  const isSubmitting = useRef(false);

  const planData = location.state;

  // Validación de integridad de datos
  if (!planData || !planData.planName || !planData.price) {
    return <Navigate to="/onboarding/plan" replace />;
  }

  useEffect(() => {
    const startProvisioning = async () => {
      // Si ya hay un proceso en marcha, abortamos inmediatamente
      if (isSubmitting.current) return;
      isSubmitting.current = true;

      // Simulación de carga visual para el usuario
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 300);

      try {
        const { planName, price, monthlyLimit } = planData;
        const userId = user?.id;

        if (!userId) throw new Error("Sesión expirada. Inicia sesión nuevamente.");

        setCurrentStep('Sincronizando con el nodo físico...');

        // 2. LLAMADA RPC EXACTA
        const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', {
          p_plan_name: planName,
          p_amount: Number(price),
          p_monthly_limit: Number(monthlyLimit)
        });

        // Solo liberamos el bloqueo en errores de red/sistema para permitir reintento
        if (rpcError) {
          isSubmitting.current = false;
          throw rpcError;
        }

        let finalNumber = rpcResult?.phoneNumber || rpcResult?.phone_number;

        // 3. LÓGICA DE AUTOCURACIÓN (Self-healing)
        if (!finalNumber) {
          setIsRecovering(true);
          setCurrentStep('Recuperando asignación del ledger...');
          
          // Espera de 1.5 segundos para estabilidad de datos
          await new Promise(resolve => setTimeout(resolve, 1500));

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
            throw new Error("El sistema no pudo confirmar la asignación del número.");
          }
        }

        setProgress(100);
        setCurrentStep('Línea activada: ' + finalNumber);

        // Notificación de auditoría
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

        // Esperar un momento para que el usuario vea el 100%
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 4. REDIRECCIÓN VÍA QUERY PARAMS
        navigate(`/onboarding/success?assignedNumber=${encodeURIComponent(finalNumber)}&planName=${encodeURIComponent(planName)}`, { 
          replace: true 
        });

      } catch (err: any) {
        console.error("Fallo crítico en infraestructura:", err);
        setErrorState(err.message || "Error de conexión con el nodo físico.");
        setCurrentStep('Error de provisión');
        isSubmitting.current = false; // Liberamos solo en caso de error real
      } finally {
        clearInterval(progressInterval);
      }
    };

    startProvisioning();
  }, [user, navigate, planData, addNotification]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light dark:bg-background-dark font-display">
      {/* Background Ambience */}
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
            <p className="text-[11px] font-bold text-slate-500 mb-8 leading-relaxed">{errorState}</p>
            <button 
              onClick={() => navigate('/onboarding/plan')}
              className="w-full h-14 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              Volver al Marketplace
            </button>
          </div>
        ) : (
          <>
            <div className="relative flex items-center justify-center mb-12">
              <div className="absolute size-32 rounded-full border-2 border-primary/20 animate-ping opacity-30"></div>
              <div className="size-24 rounded-full border-[4px] border-slate-100 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shadow-2xl">
                {isRecovering ? (
                  <RefreshCw className="size-10 text-primary animate-spin" />
                ) : (
                  <Cpu className="size-10 text-primary animate-pulse" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 size-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                <ShieldCheck className="size-5" />
              </div>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-4">
              {isRecovering ? 'Confirmando' : 'Sincronizando'}
            </h2>
            
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="px-5 py-2 bg-primary/5 dark:bg-primary/10 rounded-full border border-primary/10">
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                {currentStep}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-12 w-full text-center opacity-30">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">
          TELSIM PHYSICAL INFRASTRUCTURE CORE v6.0
        </p>
      </div>
    </div>
  );
};

export default Processing;