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

  // Estados iniciales basados en parámetros de URL
  const [assignedNumber, setAssignedNumber] = useState<string | null>(searchParams.get('assignedNumber'));
  const [planName] = useState(searchParams.get('planName') || 'Pro');
  const [status, setStatus] = useState<'syncing' | 'success' | 'error'>(assignedNumber ? 'success' : 'syncing');
  const [showContent, setShowContent] = useState(false);

  // PROTOCOLO DE RESCATE: Un solo intento de búsqueda directa en base de datos
  const performRescueLookup = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('phone_number')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.phone_number) {
        setAssignedNumber(data.phone_number);
        setStatus('success');
      } else {
        setStatus('error'); // Si tras el intento único no hay nada, reportamos error de puerto
      }
    } catch (err) {
      console.error("Fallo en rescate de puerto:", err);
      setStatus('error');
    }
  }, [user]);

  useEffect(() => {
    // Si entramos sin número, activamos el intento único de rescate
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

  const handleCopy = () => {
    if (!assignedNumber) return;
    navigator.clipboard.writeText(formatPhoneNumber(assignedNumber));
    
    // Feedback visual rápido
    const toast = document.createElement('div');
    toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest z-50 shadow-2xl animate-in fade-in slide-in-from-bottom-2";
    toast.innerText = "Número Copiado";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const countryCode = (assignedNumber?.includes('56')) ? 'cl' : 'ar';

  // ESTADO: Sincronizando con el nodo físico... (Intento de rescate en curso)
  if (status === 'syncing') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 text-center font-display">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative size-24 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center">
            <RefreshCw className="size-10 text-primary animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
          Sincronizando con el nodo físico...
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Recuperando identificador de puerto seguro
        </p>
      </div>
    );
  }

  // ESTADO: Fallo de Puerto (Tras intento único fallido)
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 text-center font-display">
        <div className="size-20 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-[1.8rem] flex items-center justify-center mb-8 border border-rose-100 dark:border-rose-900/30 shadow-xl">
          <AlertTriangle className="size-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">Fallo de Puerto</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[30ch] mb-10 leading-relaxed">
          No pudimos localizar un puerto activo en tu cuenta. Por favor, verifica tu panel en unos instantes.
        </p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full max-w-xs h-16 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
        >
          Ir al Panel de Control
        </button>
      </div>
    );
  }

  // ESTADO: ÉXITO (Muestra el número activado)
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 size-64 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 size-64 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="mb-12">
          <div className="relative mb-6 flex justify-center">
            <div className="absolute size-28 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative size-24 rounded-[2.2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center transform transition-transform hover:scale-105 active:rotate-2">
              <CheckCircle2 className="size-12 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-3">¡Puerto Activo!</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px] leading-relaxed max-w-[28ch] mx-auto">
            Sincronización exitosa. Tu línea física ya está conectada al nodo de red TELSIM.
          </p>
        </div>

        {/* Tarjeta de Número */}
        <div className="w-full bg-white dark:bg-surface-dark rounded-[2.5rem] border-2 border-primary/10 p-10 flex flex-col items-center shadow-card mb-10 relative overflow-hidden group">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
          
          <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.4em] mb-5 relative z-10">Identificador de Línea</span>
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="size-10 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
              <img 
                src={`https://flagcdn.com/w80/${countryCode}.png`}
                alt="Country"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-[28px] font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums leading-none">
              {formatPhoneNumber(assignedNumber!)}
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">Canal Seguro</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest leading-none">
              Plan {planName}
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="w-full space-y-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98]"
          >
            <div className="size-12"></div>
            <span className="text-[14px] uppercase tracking-widest">Entrar al Panel</span>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md transition-colors group-hover:bg-white/30">
              <ArrowRight className="size-6" />
            </div>
          </button>
          
          <button 
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 w-full py-4 text-slate-400 hover:text-primary transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Copiar número</span>
          </button>
        </div>

        <div className="mt-12 flex items-center gap-2 opacity-30">
          <ShieldCheck className="size-4" />
          <span className="text-[8px] font-black uppercase tracking-[0.4em]">TELSIM CORE SECURITY v7.0</span>
        </div>
      </div>
    </div>
  );
};

export default Success;