import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [currentStep, setCurrentStep] = useState('Verificando pago...');
  const [errorState, setErrorState] = useState<string | null>(null);
  
  // 1. SEMÁFORO ATÓMICO: Bloqueo estricto contra ejecuciones duplicadas
  const isSubmitting = useRef(false);

  const planData = location.state;
  if (!planData || !planData.planName || !planData.price) {
    return <Navigate to="/onboarding/plan" replace />;
  }

  // Función de apoyo para recuperar el número si el RPC devuelve éxito pero número nulo (Colisión)
  const verifyAssignedNumber = async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('slots')
      .select('phone_number')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return data?.phone_number || null;
  };

  useEffect(() => {
    const startActivation = async () => {
      // 2. GUARDIA DE ENTRADA: Si ya hay un proceso, no hacer nada
      if (isSubmitting.current) return;
      isSubmitting.current = true;

      // Tiempo mínimo estético para sincronizar animaciones
      const minWait = new Promise(resolve => setTimeout(resolve, 3500));

      try {
        const { planName, price, monthlyLimit } = planData;
        const userId = user?.id;

        if (!userId) throw new Error("Sesión de usuario no válida.");

        setCurrentStep('Aprovisionando puerto físico...');

        // 3. LLAMADA RPC ROBUSTA
        const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', {
          p_plan_name: planName,
          p_amount: Number(price),
          p_monthly_limit: Number(monthlyLimit)
        });

        if (rpcError) throw rpcError;

        let finalNumber = rpcResult?.phoneNumber || rpcResult?.phone_number;
        
        // 4. LÓGICA DE RECUPERACIÓN (Colisión evitada)
        // Si el backend dice que fue exitoso pero no envió el número (por precaución de concurrencia)
        if (!finalNumber) {
          setCurrentStep('Verificando asignación...');
          finalNumber = await verifyAssignedNumber(userId);
          
          if (!finalNumber) {
            throw new Error("El sistema no pudo confirmar tu nueva línea. Contacta a soporte.");
          }
        }

        setCurrentStep('Línea lista: ' + finalNumber);

        // Notificación de sistema
        addNotification({
          title: 'Activación Exitosa',
          message: `Tu número ${finalNumber} ya está operando en la red TELSIM.`,
          type: 'activation',
          details: {
            number: finalNumber,
            plan: planName,
            activationDate: new Date().toLocaleDateString(),
            nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            price: `$${Number(price).toFixed(2)}`
          }
        });

        await minWait;
        
        navigate('/onboarding/success', { 
          state: { assignedNumber: finalNumber, planName },
          replace: true 
        });

      } catch (err: any) {
        console.error("Fallo en activación:", err);
        isSubmitting.current = false; // LIBERAMOS EL LOCK SOLO EN ERROR PARA PERMITIR REINTENTO
        setErrorState(err.message || "Error de red en el Nodo");
        setCurrentStep('Error de sincronización');
      }
    };

    startActivation();
  }, [user, navigate, planData, addNotification]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light dark:bg-background-dark font-display">
      {/* Fondo Ambientalc */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 dark:opacity-40">
        <div className="w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs text-center px-6">
        {errorState ? (
          <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
            <div className="size-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20">
              <AlertCircle className="size-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">Error de Puerto</h2>
            <p className="text-xs font-bold text-slate-500 mb-8 leading-relaxed">{errorState}</p>
            <button 
              onClick={() => navigate('/onboarding/plan')}
              className="w-full h-14 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all"
            >
              Volver a intentarlo
            </button>
          </div>
        ) : (
          <>
            <div className="relative flex items-center justify-center mb-12">
              <div className="absolute size-32 rounded-full border-2 border-primary/20 animate-ping opacity-30"></div>
              <div className="size-24 rounded-full border-[3px] border-slate-100 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shadow-xl">
                <Loader2 className="size-10 text-primary animate-spin" />
              </div>
              <div className="absolute -bottom-2 -right-2 size-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                <ShieldCheck className="size-5" />
              </div>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-4">
              Sincronizando
            </h2>
            
            <div className="flex flex-col items-center gap-3">
              <div className="px-4 py-1.5 bg-primary/5 dark:bg-primary/10 rounded-full border border-primary/10">
                <p className="text-primary text-[9px] font-black uppercase tracking-[0.2em]">
                  {currentStep}
                </p>
              </div>
              <div className="flex gap-1.5">
                <div className="size-1.5 rounded-full bg-primary/30 animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{animationDelay: '200ms'}}></div>
                <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{animationDelay: '400ms'}}></div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-12 w-full text-center opacity-40">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">
          TELSIM PHYSICAL NODE v4.8
        </p>
      </div>
    </div>
  );
};

export default Processing;