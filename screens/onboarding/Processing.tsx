import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { Loader2, AlertCircle, Cpu, ShieldCheck, Globe } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const hasExecuted = useRef(false);

  const statusMessages = [
    "Conectando puerto GSM...",
    "Validando Infraestructura Física...",
    "Sincronizando Puerto en Red 4G...",
    "Generando Identificador Único...",
    "Finalizando Enlace Seguro..."
  ];

  const planData = location.state;
  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const startProvisioning = async () => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const planName = String(planData?.planName || 'Pro');
    const price = Number(planData?.price || 39.90);
    const limit = Number(planData?.monthlyLimit || 400);

    try {
      setError(null);

      // Llamada al RPC purchase_subscription
      const { data, error: rpcError } = await supabase.rpc('purchase_subscription', {
        p_plan_name: planName,
        p_amount: price,
        p_monthly_limit: limit
      });

      if (!rpcError && data?.success) {
        const finalNumber = data.phoneNumber || data.phone_number;
        
        await addNotification({
          title: 'Puerto Activado',
          message: `Tu nueva línea ${finalNumber} ha sido sincronizada con éxito.`,
          type: 'activation',
          details: {
            number: finalNumber,
            plan: planName,
            activationDate: new Date().toLocaleDateString('es-ES'),
            nextBilling: 'En 7 días',
            price: price.toFixed(2)
          }
        });

        // Delay artificial pequeño para que la animación se aprecie
        setTimeout(() => {
          navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
        }, 1500);
        return;
      }

      if (rpcError?.code === '23505' || (!data?.success)) {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('phone_number')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.phone_number) {
          navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(existing.phone_number)}`, { replace: true });
          return;
        }
      }

      throw rpcError || new Error("Fallo en la sincronización.");

    } catch (err: any) {
      console.error("Critical Provisioning Error:", err);
      setError("FALLBACK_REDIRECT");
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 5000);
    }
  };

  useEffect(() => {
    startProvisioning();
  }, [user]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 transition-colors duration-500 overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="flex flex-col items-center gap-12 w-full max-w-sm relative z-10">
        
        {!error ? (
          <>
            {/* Advanced Scanning Animation */}
            <div className="relative">
              {/* Outer Rings */}
              <div className="absolute inset-0 rounded-[2.5rem] border-2 border-primary/20 animate-ping opacity-20"></div>
              <div className="absolute -inset-4 rounded-[3rem] border border-primary/10 animate-pulse"></div>
              
              {/* Main SIM Card Visual */}
              <div className="relative size-32 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
                {/* Hardware Icon */}
                <span className="material-symbols-rounded text-[64px] text-primary/20">sim_card</span>
                
                {/* Scanner Laser Line */}
                <div className="absolute inset-0 z-20 overflow-hidden rounded-[2.5rem] pointer-events-none">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(29,78,216,0.8)] animate-scanner absolute top-0"></div>
                </div>

                {/* Animated Tech Dots */}
                <div className="absolute top-4 right-4 flex gap-1">
                   <div className="size-1 rounded-full bg-emerald-500 animate-pulse"></div>
                   <div className="size-1 rounded-full bg-primary animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>

              {/* Orbital Icons */}
              <div className="absolute -top-4 -right-4 size-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center animate-float-slow">
                 <Globe className="size-5 text-primary" />
              </div>
              <div className="absolute -bottom-2 -left-6 size-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center animate-float-medium">
                 <ShieldCheck className="size-5 text-emerald-500" />
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight animate-pulse">
                  ASIGNANDO TARJETA SIM
                </h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  Puede tardar algunos segundos.
                </p>
              </div>

              {/* Status Ticker */}
              <div className="h-10 flex flex-col items-center justify-center overflow-hidden">
                <div 
                  key={statusIndex}
                  className="animate-in slide-in-from-bottom-2 duration-500 flex items-center gap-2"
                >
                   <Loader2 className="size-3 text-slate-400 animate-spin" />
                   <span className="text-xs font-bold text-slate-400 dark:text-slate-500 italic uppercase tracking-widest">
                     {statusMessages[statusIndex]}
                   </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Error State */
          <div className="w-full flex flex-col items-center text-center space-y-8 animate-in zoom-in-95">
            <div className="size-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center border border-rose-500/20 shadow-lg">
               <AlertCircle className="size-10 text-rose-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Enlace Retrasado</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed px-4">
                Redirigiendo al panel de control para verificar tu estado...
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-20">
        <div className="flex items-center gap-4">
           <Cpu className="size-4" />
           <div className="h-px w-12 bg-slate-400"></div>
           <span className="text-[8px] font-black uppercase tracking-[0.5em]">Telsim Infra v10.5</span>
        </div>
      </div>
    </div>
  );
};

export default Processing;