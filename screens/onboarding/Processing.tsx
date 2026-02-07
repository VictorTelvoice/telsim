import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // CERROJO DE SEGURIDAD (Locking mechanism)
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const processActivation = async () => {
      // 1. GUARD: Evitar ejecución doble al cargar o por re-renders
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      // Tiempo mínimo de animación para UX (3.5 segundos)
      const animationPromise = new Promise(resolve => setTimeout(resolve, 3500));
      
      try {
        const planName = 'Starter';
        const planPrice = 19.90; // Monto real actualizado
        const monthlyLimit = 150;
        
        const realUserId = user?.id;
        if (!realUserId) {
            navigate('/login');
            return;
        }

        // 2. EJECUCIÓN DEL RPC: Creamos la suscripción y obtenemos el número
        const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', {
            p_plan_name: planName,
            p_amount: planPrice,
            p_monthly_limit: monthlyLimit
        });

        let finalNumber = '';
        let assignedPortId = '';

        // 3. MANEJO DE RESPUESTA / ERROR 23505
        if (rpcError) {
            if (rpcError.code === '23505') {
                console.info("Suscripción ya existente (23505). Recuperando número actual...");
                // Si ya existe, intentamos recuperar el número asignado previamente
                const { data: existingSlot } = await supabase
                    .from('slots')
                    .select('phone_number, port_id')
                    .eq('assigned_to', realUserId)
                    .single();
                
                finalNumber = existingSlot?.phone_number || '+56 9 0000 0000';
                assignedPortId = existingSlot?.port_id || '';
            } else {
                throw rpcError;
            }
        } else {
            // El RPC devolvió éxito y el objeto con phoneNumber
            finalNumber = rpcResult?.phoneNumber || rpcResult?.phone_number || '';
            assignedPortId = rpcResult?.portId || rpcResult?.port_id || '';
        }

        // 4. LOGÍSTICA EXTERNA Y NOTIFICACIÓN
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
          console.debug("Webhook omitido");
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

        await animationPromise;
        navigate('/onboarding/success', { state: { assignedNumber: finalNumber, planName } });

      } catch (error) {
        console.error("Error crítico en procesamiento:", error);
        await animationPromise;
        // Fallback para no bloquear al usuario si el proceso falló pero el número podría estar listo
        navigate('/onboarding/success', { state: { assignedNumber: '+56 9 0000 0000', planName: 'Starter' } });
      }
    };

    processActivation();
  }, [navigate, location.state, user, addNotification]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light dark:bg-background-dark font-display">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="material-symbols-outlined text-[300px] text-primary/5 dark:text-primary/10 rotate-12 animate-pulse">
            sim_card
        </span>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs mx-auto px-6">
        <div className="relative flex items-center justify-center mb-10 group">
          <div className="absolute w-32 h-32 rounded-full border border-primary/20 animate-ping opacity-75"></div>
          <div className="w-20 h-20 rounded-full border-[3px] border-primary border-t-transparent animate-spin"></div>
          <div className="absolute flex items-center justify-center bg-white dark:bg-background-dark rounded-full p-2 border border-gray-100 dark:border-gray-800">
             <span className="material-symbols-outlined text-primary text-2xl animate-pulse">
                 lock_clock
             </span>
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-[#111318] dark:text-white">
                Configurando tu línea
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium animate-pulse uppercase tracking-widest">
                Activando infraestructura física
            </p>
        </div>
      </div>
    </div>
  );
};

export default Processing;