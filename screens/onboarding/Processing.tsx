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
  
  // CERROJO DE SEGURIDAD (Locking mechanism)
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const processActivation = async () => {
      // 1. GUARD: Evitar ejecución doble al cargar o por re-renders (React 18 StrictMode)
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      // Tiempo mínimo de animación para UX (3.5 segundos)
      const animationPromise = new Promise(resolve => setTimeout(resolve, 3500));
      
      try {
        const planName = 'Starter';
        const planPrice = 19.90; // Monto real solicitado
        const monthlyLimit = 150;
        
        const realUserId = user?.id;
        if (!realUserId) {
            navigate('/login');
            return;
        }

        setCurrentStep('Provisionando hardware físico...');

        // 2. EJECUCIÓN DEL RPC: La función ahora devuelve success y phoneNumber de forma segura
        const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', {
            p_plan_name: planName,
            p_amount: planPrice,
            p_monthly_limit: monthlyLimit
        });

        if (rpcError) {
          // El RPC ya no devuelve 23505 como error crítico, pero manejamos fallos de red
          console.error("Fallo de comunicación con el Nodo:", rpcError);
          throw rpcError;
        }

        // 3. CAPTURA DE RESULTADOS REALES
        // El RPC devuelve un objeto: { success: boolean, phoneNumber: string, portId: string }
        const finalNumber = rpcResult?.phoneNumber || rpcResult?.phone_number;
        const assignedPortId = rpcResult?.portId || rpcResult?.port_id;

        if (!finalNumber) {
          throw new Error("El sistema no devolvió una numeración válida.");
        }

        setCurrentStep('Número asignado: ' + finalNumber);

        // 4. LOGÍSTICA EXTERNA (Webhook Make.com)
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
          console.debug("Notificación logística omitida");
        }

        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        
        addNotification({
          title: 'Línea Activada con Éxito',
          message: `Tu nuevo número ${finalNumber} ya está listo para recibir mensajes.`,
          icon: 'sim_card',
          type: 'activation',
          details: {
            number: finalNumber,
            plan: planName,
            activationDate: now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
            nextBilling: nextMonth.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
            price: `$${planPrice.toFixed(2)} USD`
          }
        });

        // Asegurar que la animación termine antes de navegar para una UX fluida
        await animationPromise;
        
        // NAVEGACIÓN SÍNCRONA CON LOS DATOS REALES
        navigate('/onboarding/success', { 
          state: { 
            assignedNumber: finalNumber, 
            planName: planName 
          },
          replace: true // Reemplazamos la ruta para que no puedan volver atrás a re-activar
        });

      } catch (error: any) {
        console.error("Error crítico en procesamiento:", error);
        setCurrentStep('Error en la activación. Reintentando...');
        await animationPromise;
        // Solo en caso de fallo absoluto redirigimos con un error visible en lugar de ceros
        navigate('/onboarding/success', { 
          state: { 
            assignedNumber: 'ERROR_ACTIVACION', 
            planName: 'Starter' 
          } 
        });
      }
    };

    processActivation();
  }, [navigate, user, addNotification]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light dark:bg-background-dark font-display">
      {/* Background Ambience */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="material-symbols-outlined text-[300px] text-primary/5 dark:text-primary/10 rotate-12 animate-pulse">
            sim_card
        </span>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs mx-auto px-6">
        <div className="relative flex items-center justify-center mb-10">
          <div className="absolute w-32 h-32 rounded-full border border-primary/20 animate-ping opacity-75"></div>
          <div className="size-24 rounded-full border-[3px] border-primary border-t-transparent animate-spin"></div>
          <div className="absolute flex items-center justify-center bg-white dark:bg-background-dark size-16 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 transition-transform duration-500 scale-110">
             <Loader2 className="text-primary size-8 animate-spin" />
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
            <h2 className="text-2xl font-black tracking-tight text-[#111318] dark:text-white uppercase">
                Activando Línea
            </h2>
            <div className="flex flex-col items-center gap-2">
                <p className="text-primary text-xs font-black uppercase tracking-[0.2em] animate-pulse">
                    {currentStep}
                </p>
                <div className="flex gap-1">
                  <div className="size-1 rounded-full bg-primary animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="size-1 rounded-full bg-primary animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="size-1 rounded-full bg-primary animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
            </div>
        </div>
      </div>

      <div className="absolute bottom-12 w-full text-center px-8">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">
              Puerto Físico TELSIM v4.2 Secure Node
          </p>
      </div>
    </div>
  );
};

export default Processing;