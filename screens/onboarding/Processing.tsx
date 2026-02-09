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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const planName = String(planData?.planName || 'Pro');
    const price = Number(planData?.price || 39.90);
    const limit = Number(planData?.monthlyLimit || 400);

    try {
      setError(null);

      // 1. LLAMADA AL RPC (Creación de nueva suscripción)
      const { data: rpcData, error: rpcError } = await supabase.rpc('purchase_subscription', {
        p_plan_name: planName,
        p_amount: price,
        p_monthly_limit: limit
      });

      let finalNumber = rpcData?.phone_number || rpcData?.phoneNumber;

      // 2. ÉXITO DIRECTO
      if (!rpcError && finalNumber) {
        navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(finalNumber)}`, { replace: true });
        return;
      }

      // 3. LÓGICA DE RESCATE: Busca la suscripción más reciente (la que se acaba de crear)
      // Especialmente útil si el RPC falló en el retorno pero no en la inserción.
      const { data: rescueData } = await supabase
        .from('subscriptions')
        .select('phone_number')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rescueData?.phone_number) {
        navigate(`/onboarding/success?planName=${encodeURIComponent(planName)}&assignedNumber=${encodeURIComponent(rescueData.phone_number)}`, { replace: true });
      } else {
        throw rpcError || new Error("No se pudo asignar un nuevo número.");
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Provisioning Error:", err);
      setError("La red está saturada. Por favor, reintenta el enlace.");
      
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
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display p-8">
      <div className="flex flex-col items-center gap-10 w-full max-w-xs animate-in fade-in duration-700">
        {!error ? (
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse scale-150"></div>
              <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
                <Loader2 className="size-12 text-primary animate-spin" />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic">
                Enlazando nuevo puerto...
              </p>
              <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                INFRAESTRUCTURA FÍSICA CL
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center text-center space-y-8 animate-in zoom-in-95">
            <div className="size-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center border border-rose-500/20 shadow-lg">
               <AlertCircle className="size-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Fallo de Sincronía</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed px-4">
                No pudimos asignar el número en este intento. Tus créditos no han sido descontados.
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
                   <span>{retryCooldown > 0 ? `Reintentar en ${retryCooldown}s` : 'Intentar de Nuevo'}</span>
                </div>
                <ArrowRight className="size-5 opacity-50" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Processing;