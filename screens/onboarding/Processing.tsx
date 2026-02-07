import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [currentStep, setCurrentStep] = useState('Iniciando activación...');
  
  // LOCK PARA EVITAR DOBLE PROCESAMIENTO (REQUISITO CRÍTICO)
  const hasProcessedRef = useRef(false);

  // Validar estado inicial para evitar suscripciones accidentales por defecto
  const planData = location.state;
  if (!planData || !planData.planName) {
    return <Navigate to="/onboarding/plan" replace />;
  }

  useEffect(() => {
    const processActivation = async () => {
      // 1. GUARD: Evitar ejecución doble
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      // Tiempo mínimo de animación para feedback visual de UX
      const animationPromise = new Promise(resolve => setTimeout(resolve, 3800));
      
      try {
        // RECUPERACIÓN EXACTA DE DATOS (Sin fallbacks genéricos)
        const planName = planData.planName;
        const planPrice = Number(planData.price);
        const monthlyLimit = Number(planData.monthlyLimit);
        
        const realUserId = user?.id;
        if (!realUserId) {
            navigate('/login');
            return;
        }

        setCurrentStep('Conectando con el Nodo TELSIM...');

        // 2. EJECUCIÓN DEL RPC (Monto y Plan reales)
        const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', {
            p_plan_name: planName,
            p_amount: planPrice,
            p_monthly_limit: monthlyLimit
        });

        if (rpcError) {
          console.error("Fallo de comunicación en el Nodo:", rpcError);
          throw rpcError;
        }

        // 3. CAPTURA DE DATOS RETORNADOS POR EL BACKEND
        const finalNumber = rpcResult?.phoneNumber || rpcResult?.phone_number;
        const assignedPortId = rpcResult?.portId || rpcResult?.port_id;

        if (!finalNumber) {
          throw new Error("El sistema no asignó una numeración válida.");
        }

        setCurrentStep('Línea activada: ' + finalNumber);

        // 4. LOGÍSTICA (Webhook Externo)
        try {
          await fetch('https://hook.us2.make.com/xd3rqv1okcxw8mpn5v2rdp6uu545l7m5', {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: realUserId, 
              port_id: assignedPortId,
              phone_number: finalNumber,
              plan_type: planName, 
              amount: planPrice,
              monthly_limit: monthlyLimit,
              timestamp: new Date().toISOString()
            }),
          });
        } catch (webhookErr) {
          console.debug("Omitiendo notificación de logística");
        }

        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        
        addNotification({
          title: 'Línea Lista',
          message: `Número ${finalNumber} activado correctamente.`,
          icon: 'sim_card',
          type: 'activation',
          details: {
            number: finalNumber,
            plan: planName,
            activationDate: now.toLocaleDateString(),
            nextBilling: nextMonth.toLocaleDateString(),
            price: `$${planPrice.toFixed(2)}`
          }
        });

        // Esperar a que la animación termine para una transición fluida
        await animationPromise;
        
        navigate('/onboarding/success', { 
          state: { 
            assignedNumber: finalNumber, 
            planName: planName 
          },
          replace: true 
        });

      } catch (error: any) {
        console.error("Error en flujo de activación:", error);
        setCurrentStep('Error de configuración...');
        await animationPromise;
        
        // Redirigir a éxito con error explícito (No mostrar ceros)
        navigate('/onboarding/success', { 
          state: { 
            assignedNumber: null, 
            error: true,
            errorMsg: error.message || "Error de red"
          } 
        });
      }
    };

    processActivation();
  }, [navigate, user, addNotification, planData]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light dark:bg-background-dark font-display">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="material-symbols-outlined text-[320px] text-primary/5 dark:text-primary/10 rotate-12 animate-pulse">
            sim_card
        </span>
        <div className="absolute w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs mx-auto px-6">
        <div className="relative flex items-center justify-center mb-12">
          <div className="absolute w-36 h-36 rounded-full border-2 border-primary/20 animate-ping opacity-50"></div>
          <div className="size-28 rounded-full border-[4px] border-slate-200 dark:border-slate-800"></div>
          <div className="absolute size-28 rounded-full border-[4px] border-primary border-t-transparent animate-spin"></div>
          
          <div className="absolute flex items-center justify-center bg-white dark:bg-background-dark size-16 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 transform rotate-12">
             <Loader2 className="text-primary size-9 animate-spin" />
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
            <h2 className="text-2xl font-black tracking-tight text-[#111318] dark:text-white uppercase">
                Activando
            </h2>
            <div className="flex flex-col items-center gap-2">
                <p className="text-primary text-[10px] font-black uppercase tracking-[0.25em] h-5">
                    {currentStep}
                </p>
                <div className="flex gap-1.5 mt-1">
                  <div className="size-1.5 rounded-full bg-primary/40 animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
            </div>
        </div>
      </div>

      <div className="absolute bottom-16 w-full text-center px-10">
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] max-w-[200px] mx-auto leading-relaxed">
              Infraestructura Física <br/>TELSIM v4.5 Node
          </p>
      </div>
    </div>
  );
};

export default Processing;