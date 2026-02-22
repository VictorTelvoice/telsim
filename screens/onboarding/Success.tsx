
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, ArrowRight, RefreshCw, AlertTriangle, Zap } from 'lucide-react';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // VALIDACIÓN: Bloquear si no hay sesión de Stripe ni número ya pasado por Processing
  const sessionId = searchParams.get('session_id');
  const initialNumber = searchParams.get('assignedNumber');

  const [assignedNumber, setAssignedNumber] = useState<string | null>(initialNumber);
  const [planName, setPlanName] = useState<string>(searchParams.get('planName') || 'Standard');
  const [status, setStatus] = useState<'syncing' | 'success' | 'error'>(initialNumber ? 'success' : 'syncing');
  const [showContent, setShowContent] = useState(false);

  const performRescueLookup = useCallback(async () => {
    if (!user) return;

    try {
      // Buscamos la suscripción activa más reciente para el usuario
      const { data, error } = await supabase
        .from('subscriptions')
        .select('phone_number, plan_name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.phone_number) {
        setAssignedNumber(data.phone_number);
        if (data.plan_name) setPlanName(data.plan_name);
        setStatus('success');
      } else {
        // Segundo intento: Buscar directamente en la tabla de slots
        const { data: slotData } = await supabase
            .from('slots')
            .select('phone_number, plan_type')
            .eq('assigned_to', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (slotData) {
            setAssignedNumber(slotData.phone_number);
            setPlanName(slotData.plan_type || 'Starter');
            setStatus('success');
        } else {
            setStatus('error');
        }
      }
    } catch (err) {
      console.error("Rescue lookup failed:", err);
      setStatus('error');
    }
  }, [user]);

  useEffect(() => {
    if (!assignedNumber && status === 'syncing') {
      performRescueLookup();
    }
  }, [assignedNumber, status, performRescueLookup]);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
      return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    return num.startsWith('+') ? num : `+${num}`;
  };

  const handleGoToDashboard = () => {
    // Importante pasar el número a Dashboard para que lo seleccione automáticamente
    navigate(assignedNumber ? `/dashboard?new_line=${encodeURIComponent(assignedNumber)}` : '/dashboard');
  };

  if (!sessionId && !assignedNumber) {
    return <Navigate to="/dashboard" replace />;
  }

  if (status === 'syncing') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 text-center font-display">
        <RefreshCw className="size-10 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Vinculando puerto...</h2>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 text-center font-display">
        <AlertTriangle className="size-12 text-amber-500 mb-6" />
        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">Línea Vinculada</h1>
        <p className="text-sm font-medium text-slate-500 mb-8">Tu pago fue exitoso. Si no ves tu número de inmediato, aparecerá en el panel en unos segundos.</p>
        <button onClick={() => navigate('/dashboard')} className="px-8 h-14 bg-primary text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-xl active:scale-95">Ir al Dashboard</button>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent pointer-events-none"></div>

      <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-1000 ease-out ${showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
        
        <div className="mb-8">
          <div className="relative mb-6 flex justify-center">
             <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-125 animate-pulse"></div>
            <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
              <CheckCircle2 className="size-12 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-3">¡Activado!</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-[28ch] mx-auto">
            Pago confirmado por Stripe. Tu infraestructura de red local está operativa.
          </p>
        </div>

        <div className="w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] border-2 border-emerald-500/10 px-4 py-10 flex flex-col items-center shadow-card mb-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full mb-6 border border-emerald-500/10">
             <Zap className="size-3 text-emerald-500" />
             <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em]">Línea Física Verificada</span>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
              <img src="https://flagcdn.com/w80/cl.png" alt="Chile" className="w-full h-full object-cover" />
            </div>
            <div className="text-[26px] font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums">
              {formatPhoneNumber(assignedNumber!)}
            </div>
          </div>
          
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
               Infraestructura {planName} • On-Air
          </span>
        </div>

        <button 
          onClick={handleGoToDashboard}
          className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98]"
        >
          <div className="size-12"></div>
          <span className="text-[14px] uppercase tracking-widest">Empezar ahora</span>
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <ArrowRight className="size-6" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default Success;