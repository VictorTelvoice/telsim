import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

const Processing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [error, setError] = useState<string | null>(null);
  const [retryCooldown, setRetryCooldown] = useState(0);
  const hasExecuted = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const planData = location.state;
  if (!user) return <Navigate to="/login" replace />;

  const startProvisioning = async () => {
    // 1. ABORT CONTROLLER: Cancelar peticiones previas si existen
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const planName = String(planData?.planName || 'Pro');
    const price = Number(planData?.price || 39.90);
    const limit = Number(planData?.monthlyLimit || 400);

    try {
      setError(null);

      // 2. DOBLE VERIFICACIÓN PREVIA: ¿Ya tiene una suscripción activa?
      const { data: existing, error: checkError } = await supabase
        .from('subscriptions')
        .select('phone_number')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!checkError && existing?.phone_number) {
        navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(existing.phone_number)}`, { replace: true });
        return;
      }

      // 3. LLAMADA AL RPC (Con abort signal simulado mediante lógica de try/catch si es necesario, 
      // aunque el SDK de Supabase no soporta abort signal nativo en .rpc() directamente, 
      // controlamos el flujo para ignorar resultados si se abortó)
      const { data: rpcData, error: rpcError } = await supabase.rpc('purchase_subscription', {
        p_plan_name: planName,
        p_amount: price,
        p_monthly_limit: limit
      });

      let finalNumber = rpcData?.phone_number || rpcData?.phoneNumber;

      // Gestión de Éxito o Rescate Inmediato
      if (!rpcError && finalNumber) {
        navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
        return;
      }

      // 4. RESCATE DE EMERGENCIA (Si el RPC falló pero la fila se creó)
      const { data: rescueData } = await supabase
        .from('subscriptions')
        .select('phone_number')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (rescueData?.phone_number) {
        navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(rescueData.phone_number)}`, { replace: true });
      } else {
        throw rpcError || new Error("No se pudo asignar un número.");
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Provisioning Error:", err);
      setError("Hubo un retraso en la red. Por favor, intenta de nuevo.");
      
      // 5. COOLDOWN DE 10 SEGUNDOS
      setRetryCooldown(10);
      const timer = setInterval(() => {
        setRetryCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    if (!hasExecuted.current) {
      hasExecuted.current = true;
      startProvisioning();
    }
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8 transition-colors duration-500">
      <div className="flex flex-col items-center gap-10 w-full max-w-xs animate-in fade-in duration-700">
        
        {!error ? (
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse scale-150"></div>
              <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
                <Loader2 className="size-12 text-primary animate-spin" />
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic animate-pulse">
                Sincronizando Nodo...
              </p>
              <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                Puerto: Chile +56
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center text-center space-y-8 animate-in zoom-in-95">
            <div className="size-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center border border-rose-500/20 shadow-lg">
               <AlertCircle className="size-10 text-rose-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Puerto Saturado</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed px-4">
                La red está experimentando alta demanda. No te preocupes, tu pago está seguro.
              </p>
            </div>

            <div className="w-full space-y-4">
              <button 
                onClick={startProvisioning}
                disabled={retryCooldown > 0}
                className={`group w-full h-16 rounded-2xl flex items-center justify-between px-6 transition-all font-black text-xs uppercase tracking-widest ${
                  retryCooldown > 0 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                  : 'bg-primary text-white shadow-button active:scale-95'
                }`}
              >
                <div className="flex items-center gap-3">
                   {retryCooldown > 0 ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                   <span>{retryCooldown > 0 ? `Esperar ${retryCooldown}s` : 'Reintentar Enlace'}</span>
                </div>
                <ArrowRight className="size-5 opacity-50" />
              </button>
              
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full h-12 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-primary transition-colors"
              >
                Volver al Panel
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-12 opacity-10 pointer-events-none">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">TELSIM ANTI-ZOMBIE v9.2</p>
      </div>
    </div>
  );
};

export default Processing;