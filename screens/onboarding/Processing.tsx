import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  
  // LOCK PARA EVITAR DOBLE PROCESAMIENTO
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const processActivation = async () => {
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      // Tiempo mínimo de animación para feedback visual (UX)
      const animationPromise = new Promise(resolve => setTimeout(resolve, 3800));
      
      try {
        // PARÁMETROS DE NEGOCIO ACTUALIZADOS
        const planName = location.state?.planName || 'Starter';
        // Forzamos 19.9 si es Starter, de lo contrario usamos el precio del estado
        const planPrice = planName === 'Starter' ? 19.9 : (location.state?.price || 19.9);
        const monthlyLimit = location.state?.monthlyLimit || 150;
        
        const realUserId = user?.id;
        if (!realUserId) {
            navigate('/login');
            return;
        }

        setCurrentStep('Sincronizando con el nodo físico...');

        // 1. LLAMADA AL RPC RESILIENTE
        // Este RPC ahora devuelve { success: true, phoneNumber: '...', portId: '...' }
        const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', {
            p_plan_name: planName,
            p_amount: Number(planPrice), // Enviamos 19.9 exacto
            p_monthly_limit: Number(monthlyLimit)
        });

        // Manejo de errores de red o base de datos
        if (rpcError) {
          console.error("Error crítico en RPC:", rpcError);
          throw rpcError;
        }

        // 2. EXTRACCIÓN ESTRICTA DE LA RESPUESTA
        const finalNumber = rpcResult?.phoneNumber || rpcResult?.phone_number;
        const assignedPortId = rpcResult?.portId || rpcResult?.port_id;

        // VALIDACIÓN: Si no hay número, no podemos proceder al éxito
        if (!finalNumber || finalNumber === '') {
          throw new Error("El nodo no asignó una numeración válida.");
        }

        setCurrentStep('Línea asignada: ' + finalNumber);

        // 3. LOGÍSTICA EXTERNA (Webhook)
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
          console.debug("Error menor en webhook de logística");
        }

        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        
        // Notificación persistente
        addNotification({
          title: 'SIM Activada',
          message: `Tu número ${finalNumber} está listo.`,
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

        // 4. TRANSICIÓN SEGURA
        // Esperamos a que la animación termine para no romper la fluidez
        await animationPromise;
        
        navigate('/onboarding/success', { 
          state: { 
            assignedNumber: finalNumber, 
            planName: planName 
          },
          replace: true 
        });

      } catch (error: any) {
        console.error("Fallo en la activación:", error);
        setCurrentStep('Error de aprovisionamiento...');
        await animationPromise;
        
        // Redirigimos a éxito con flag de error para que la pantalla sepa qué mostrar
        // EVITAMOS mostrar números con ceros.
        navigate('/onboarding/success', { 
          state: { 
            assignedNumber: null, 
            error: true 
          } 
        });
      }
    };

    processActivation();
  }, [navigate, user, addNotification, location.state]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light dark:bg-background-dark font-display transition-colors duration-700">
      {/* Elementos decorativos de carga */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="material-symbols-outlined text-[320px] text-primary/5 dark:text-primary/10 rotate-12 animate-pulse" style={{animationDuration: '3s'}}>
            sim_card
        </span>
        <div className="absolute w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs mx-auto px-6">
        <div className="relative flex items-center justify-center mb-12">
          {/* Spinner perimetral */}
          <div className="absolute w-36 h-36 rounded-full border-2 border-primary/20 animate-ping opacity-50"></div>
          <div className="size-28 rounded-full border-[4px] border-slate-200 dark:border-slate-800"></div>
          <div className="absolute size-28 rounded-full border-[4px] border-primary border-t-transparent animate-spin" style={{animationDuration: '0.8s'}}></div>
          
          <div className="absolute flex items-center justify-center bg-white dark:bg-background-dark size-16 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 transform rotate-12">
             <Loader2 className="text-primary size-9 animate-spin" />
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
            <h2 className="text-2xl font-black tracking-tight text-[#111318] dark:text-white uppercase">
                Aprovisionando
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
          <div className="flex items-center justify-center gap-2 mb-2 opacity-40">
            <span className="material-symbols-outlined text-sm">lock</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Secure Handshake Protocol</span>
          </div>
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] max-w-[200px] mx-auto leading-relaxed">
              Infraestructura Física <br/>TELSIM v4.5 Active Node
          </p>
      </div>
    </div>
  );
};

export default Processing;