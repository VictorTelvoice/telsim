'use client';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { updateOnboardingStep } from '@/actions/onboardingActions';
import { ONBOARDING_STEPS } from '@/lib/onboardingSteps';
import { 
  Cpu, 
  AlertCircle, 
  Smartphone,
  TrendingUp
} from 'lucide-react';

const Processing: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const user = session?.user;
  
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  
  const startTime = useRef(Date.now());
  const pollIntervalRef = useRef<any>(null);
  const msgIntervalRef = useRef<any>(null);

  const sessionId = searchParams.get('session_id');
  const isUpgrade = searchParams.get('isUpgrade') === 'true';

  useEffect(() => {
    if (user?.id) {
       updateOnboardingStep(ONBOARDING_STEPS.PROCESSING);
    }
  }, [user?.id]);

  const statusMessages = useMemo(() => isUpgrade ? [
    "Validando tu nuevo plan...",
    "Actualizando créditos SMS...",
    "Sincronizando infraestructura...",
    "Aplicando mejoras de red...",
    "Finalizando actualización..."
  ] : [
    "Verificando tu pago...",
    "Asignando tu línea SIM...",
    "Configuraciones de red...",
    "Activando servicios OTP...",
    "Sincronizando tu cuenta..."
  ], [isUpgrade]);

  const checkStatus = async () => {
    if (Date.now() - startTime.current > 120000) { // 2 minutes timeout
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setError("TIMEOUT");
      return;
    }

    try {
      const response = await fetch(`/api/checkout?action=verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      const data = await response.json();

      if (data.status === 'completed') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        
        // Clean up legacy localStorage
        if (typeof window !== 'undefined') {
          ['selected_plan', 'selected_plan_price', 'selected_plan_annual', 'selected_plan_price_id'].forEach(k => localStorage.removeItem(k));
        }

        if (isUpgrade) {
          router.replace(`/dashboard/upgrade-success?num=${encodeURIComponent(data.phoneNumber)}`);
        } else {
          router.replace(`/onboarding/activation-success?session_id=${encodeURIComponent(sessionId || '')}`);
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(checkStatus, 3000);
    pollIntervalRef.current = interval;
    
    msgIntervalRef.current = setInterval(() => { 
      setStatusIndex((prev) => (prev + 1) % statusMessages.length); 
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
    };
  }, [sessionId, statusMessages]);

  if (!sessionId) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark p-8 text-center animate-in fade-in">
        <AlertCircle className="size-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-bold dark:text-white mb-2">Sesión no encontrada</h3>
        <button onClick={() => router.push('/dashboard')} className="text-primary font-bold">Volver al panel</button>
      </div>
    );
  }

  if (error === "TIMEOUT") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark p-8 text-center animate-in fade-in">
        <AlertCircle className="size-16 text-amber-500 mb-6" />
        <h3 className="text-2xl font-bold dark:text-white mb-4">Activación demorada</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
          Tu pago fue recibido, pero la activación está tardando más de lo habitual. Se completará automáticamente en unos minutos.
        </p>
        <button 
          onClick={() => router.push('/app/dashboard')}
          className="bg-primary text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs"
        >
          Ir al Panel
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark p-8 text-center overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="flex flex-col items-center gap-12 w-full max-w-sm relative z-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-[2.5rem] border-2 border-primary/20 animate-ping opacity-20"></div>
          <div className="relative size-32 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center">
            {isUpgrade ? <TrendingUp className="size-14 text-primary" /> : <Smartphone className="size-14 text-primary" />}
            <div className="absolute inset-0 z-20 overflow-hidden rounded-[2.5rem] pointer-events-none">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(29,78,216,0.8)] animate-scanner absolute top-0"></div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight animate-pulse">
            {isUpgrade ? 'Actualizando' : 'Activando'} tu SIM
          </h1>
          <div className="h-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic transition-all duration-500">
              {statusMessages[statusIndex]}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 flex items-center gap-4 opacity-20">
        <Cpu className="size-4" />
        <span className="text-[8px] font-black uppercase tracking-[0.5em]">TELSIM CORE RT-v2.0</span>
      </div>
    </div>
  );
};

export default Processing;
