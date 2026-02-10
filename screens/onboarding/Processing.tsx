import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { Loader2, AlertCircle, Cpu, ShieldCheck, Globe } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const hasExecuted = useRef(false);

  const sessionId = searchParams.get('session_id');

  const statusMessages = [
    "Validando Sesión de Stripe...",
    "Conectando puerto GSM...",
    "Sincronizando Puerto en Red 4G...",
    "Generando Identificador Único...",
    "Finalizando Enlace Seguro..."
  ];

  if (!user) return <Navigate to="/login" replace />;
  
  // BLOQUEO: Si no hay session_id de Stripe, no se permite el acceso a esta pantalla de aprovisionamiento
  if (!sessionId) return <Navigate to="/dashboard" replace />;

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const startProvisioning = async () => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    // Extraer datos de la URL o estado
    const planName = searchParams.get('plan') || 'Pro';
    const limit = Number(searchParams.get('limit') || 400);

    try {
      setError(null);

      // Llamada al RPC purchase_subscription
      // Aquí el Backend (RPC) debería validar el session_id contra la API de Stripe internamente
      const { data, error: rpcError } = await supabase.rpc('purchase_subscription', {
        p_plan_name: planName,
        p_amount: 0, // El cobro ya se hizo en Stripe
        p_monthly_limit: limit
      });

      if (!rpcError && data?.success) {
        const finalNumber = data.phoneNumber || data.phone_number;
        
        await addNotification({
          title: 'Puerto GSM Sincronizado',
          message: `La infraestructura física para el número ${finalNumber} ha sido vinculada tras el pago exitoso.`,
          type: 'activation',
          details: {
            number: finalNumber,
            plan: planName,
            activationDate: new Date().toLocaleDateString('es-ES'),
            nextBilling: 'En 30 días',
            price: "Cobrado via Stripe"
          }
        });

        setTimeout(() => {
          navigate(`/onboarding/success?session_id=${sessionId}&planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
        }, 2000);
        return;
      }

      throw rpcError || new Error("Fallo en la validación de red.");

    } catch (err: any) {
      console.error("Provisioning Error:", err);
      setError("STALE_SESSION");
      setTimeout(() => navigate('/dashboard', { replace: true }), 4000);
    }
  };

  useEffect(() => {
    startProvisioning();
  }, [user]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 overflow-hidden text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="flex flex-col items-center gap-12 w-full max-w-sm relative z-10">
        {!error ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 rounded-[2.5rem] border-2 border-primary/20 animate-ping opacity-20"></div>
              <div className="relative size-32 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
                <span className="material-symbols-rounded text-[64px] text-primary/20">sim_card</span>
                <div className="absolute inset-0 z-20 overflow-hidden rounded-[2.5rem] pointer-events-none">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(29,78,216,0.8)] animate-scanner absolute top-0"></div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 size-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center animate-float-slow">
                 <Globe className="size-5 text-primary" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight animate-pulse">
                Sincronizando Pago
              </h1>
              <div key={statusIndex} className="animate-in slide-in-from-bottom-2 duration-500 flex items-center justify-center gap-2">
                   <Loader2 className="size-3 text-slate-400 animate-spin" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                     {statusMessages[statusIndex]}
                   </span>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center space-y-8">
            <div className="size-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center border border-rose-500/20">
               <AlertCircle className="size-10 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sesión Caducada</h3>
            <p className="text-xs font-medium text-slate-500">Volviendo al panel para verificar estado...</p>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-12 flex items-center gap-4 opacity-20">
        <Cpu className="size-4" />
        <span className="text-[8px] font-black uppercase tracking-[0.5em]">TELSIM CORE NODE v3.0</span>
      </div>
    </div>
  );
};

export default Processing;