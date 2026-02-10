import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle2, 
  Copy, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const [assignedNumber, setAssignedNumber] = useState<string | null>(searchParams.get('assignedNumber'));
  const [planName, setPlanName] = useState<string>(searchParams.get('planName') || 'Standard');
  const [status, setStatus] = useState<'syncing' | 'success' | 'error'>(assignedNumber ? 'success' : 'syncing');
  const [showContent, setShowContent] = useState(false);

  const performRescueLookup = useCallback(async () => {
    if (!user) return;

    try {
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
        setStatus('error');
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
    if (assignedNumber) {
      navigate(`/dashboard?new_line=${encodeURIComponent(assignedNumber)}`);
    } else {
      navigate('/dashboard');
    }
  };

  if (status === 'syncing') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 text-center font-display">
        <RefreshCw className="size-10 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sincronizando puerto...</h2>
      </div>
    );
  }

  if (status === 'error') {
    setTimeout(() => navigate('/dashboard'), 2000);
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 text-center font-display">
        <AlertTriangle className="size-12 text-amber-500 mb-6" />
        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2 tracking-tight">Casi listo</h1>
        <p className="text-sm font-medium text-slate-500 max-w-[30ch]">Estamos terminando de configurar tu línea. Redirigiendo al panel...</p>
      </div>
    );
  }

  const countryCode = (assignedNumber?.includes('56')) ? 'cl' : 'ar';

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none"></div>

      <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-1000 ease-out ${showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
        
        <div className="mb-8">
          <div className="relative mb-6 flex justify-center">
             <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-125 animate-pulse"></div>
            <div className="size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10">
              <CheckCircle2 className="size-12 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-3">¡Línea Activa!</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px] leading-relaxed max-w-[28ch] mx-auto">
            Tu tarjeta SIM física ha sido asignada y conectada al nodo de red.
          </p>
        </div>

        {/* Card Contenedora del Número */}
        <div className="w-full bg-white dark:bg-[#1A2230] rounded-[2.5rem] border-2 border-primary/10 px-4 py-10 min-[380px]:px-8 flex flex-col items-center shadow-card mb-10 relative overflow-hidden group">
          {/* Subtle tech background inside card */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-6 opacity-60">Identificador TELSIM</span>
          
          <div className="flex items-center gap-3 min-[380px]:gap-4 mb-8">
            <div className="size-10 min-[380px]:size-11 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
              <img src={`https://flagcdn.com/w80/${countryCode}.png`} alt="Country" className="w-full h-full object-cover" />
            </div>
            {/* Ajuste responsivo de tipografía para el número */}
            <div className="text-[22px] min-[380px]:text-[26px] min-[420px]:text-[30px] font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
              {formatPhoneNumber(assignedNumber!)}
            </div>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
               Infraestructura {planName} • On-Air
            </span>
          </div>
        </div>

        <button 
          onClick={handleGoToDashboard}
          className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98]"
        >
          <div className="size-12"></div>
          <span className="text-[14px] uppercase tracking-widest">Empezar a Recibir SMS</span>
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md transition-colors group-hover:bg-white/30">
            <ArrowRight className="size-6" />
          </div>
        </button>

        <div className="mt-12 flex flex-col items-center gap-3 opacity-30">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            <span className="text-[8px] font-black uppercase tracking-[0.4em]">TELSIM CORE SECURITY v8.0</span>
          </div>
          <p className="text-[7px] font-bold uppercase tracking-widest">Encriptación AES-256 Activa</p>
        </div>
      </div>
    </div>
  );
};

export default Success;