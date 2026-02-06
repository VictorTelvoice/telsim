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
  
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const processPayment = async () => {
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      const animationPromise = new Promise(resolve => setTimeout(resolve, 3500));
      
      try {
        const planName = location.state?.planName || 'Pro';
        const planPrice = location.state?.price || 39.90;
        const monthlyLimit = location.state?.monthlyLimit || 400;
        const realUserId = user?.id || 'simulated-user-id';

        let finalNumber = '';
        let assignedPortId = '';

        // Buscamos el PRIMER slot libre siguiendo el orden de inventario (port_id ASC)
        const { data: freeSlots, error: fetchError } = await supabase
          .from('slots')
          .select('port_id, phone_number')
          .eq('status', 'libre')
          .order('port_id', { ascending: true }) 
          .limit(1);

        if (fetchError) throw fetchError;

        if (freeSlots && freeSlots.length > 0) {
            const chosenSlot = freeSlots[0];
            assignedPortId = chosenSlot.port_id;
            finalNumber = chosenSlot.phone_number;

            // Transacción: Asignar al usuario con estado 'ocupado'
            const { error: updateError } = await supabase
              .from('slots')
              .update({ 
                assigned_to: realUserId, 
                status: 'ocupado', 
                plan_type: planName,
                created_at: new Date().toISOString()
              })
              .eq('port_id', assignedPortId);

            if (updateError) throw updateError;
            
            // Crear registro de suscripción
            await supabase.from('subscriptions').insert([{
                user_id: realUserId,
                plan_name: planName, // Actualizado de plan_type a plan_name para coincidir con la tabla
                amount: planPrice,
                status: 'active',
                port_id: assignedPortId,
                started_at: new Date().toISOString()
            }]);

        } else {
            // Fallback de seguridad si no hay stock físico
            console.warn("No hay slots físicos disponibles en el inventario.");
            finalNumber = '+56 9 0000 0000'; 
        }

        // Enviar Webhook de notificación externa
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
          console.debug("Error silenciado en webhook:", webhookErr);
        }

        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        
        // CORRECCIÓN: El precio se genera dinámicamente desde el estado de navegación
        const planPriceStr = `$${Number(planPrice).toFixed(2)} USD`;

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
            price: planPriceStr
          }
        });

        await animationPromise;
        navigate('/onboarding/success', { state: { assignedNumber: finalNumber, planName } });

      } catch (error) {
        console.error("Critical error in provisioning flow:", error);
        await animationPromise;
        navigate('/onboarding/success', { state: { assignedNumber: '+56 9 0000 0000', planName: location.state?.planName } });
      }
    };

    processPayment();
  }, [navigate, location.state, user, addNotification]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-light dark:bg-background-dark font-display">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="material-symbols-outlined text-[300px] text-primary/5 dark:text-primary/10 rotate-12 transform translate-y-10 translate-x-4 animate-pulse" style={{animationDuration: '4s'}}>
            sim_card
        </span>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs mx-auto px-6">
        <div className="relative flex items-center justify-center mb-10 group">
          <div className="absolute w-32 h-32 rounded-full border border-primary/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75"></div>
          <div className="absolute w-32 h-32 rounded-full bg-primary/5 animate-pulse"></div>
          
          <div className="w-20 h-20 rounded-full border-[3px] border-gray-200 dark:border-gray-800"></div>
          <div className="absolute w-20 h-20 rounded-full border-[3px] border-primary border-t-transparent animate-spin"></div>
          
          <div className="absolute flex items-center justify-center bg-white dark:bg-background-dark rounded-full p-2 shadow-sm border border-gray-100 dark:border-gray-800">
             <span className="material-symbols-outlined text-primary text-2xl animate-[pulse_2s_ease-in-out_infinite]">
                 lock_clock
             </span>
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-[#111318] dark:text-white">
                Activando tu Tarjeta SIM
            </h2>
            <div className="h-6 overflow-hidden">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium animate-pulse uppercase tracking-widest">
                    Provisionando puerto físico secuencial
                </p>
            </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 w-full px-6">
        <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mb-2"></div>
            <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <p className="text-xs font-medium leading-normal text-center">
                    Tu conexión es segura y privada. <br/>TELSIM protege tus datos.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Processing;