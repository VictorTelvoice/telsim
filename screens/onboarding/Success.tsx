import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle2, 
  Smartphone, 
  Copy, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  RefreshCw,
  AlertTriangle,
  Cpu
} from 'lucide-react';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  // Estados de control iniciales
  const [assignedNumber, setAssignedNumber] = useState<string | null>(searchParams.get('assignedNumber'));
  const [planName] = useState(searchParams.get('planName') || 'Pro');
  const [status, setStatus] = useState<'syncing' | 'success' | 'error'>(assignedNumber ? 'success' : 'syncing');
  const [retryCount, setRetryCount] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // REGLA DE HIERRO: 10 intentos (uno cada 1.5 segundos)
  const maxRetries = 10;
  const pollingInterval = 1500;

  // Lógica de Rescate: Polling directo con Persistencia Extrema
  const pollForNumber = useCallback(async () => {
    if (!user) return;

    try {
      // BÚSQUEDA DIRECTA SEGÚN REQUERIMIENTO
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
      } else if (retryCount < maxRetries - 1) {
        // Programar siguiente reintento cada 1.5 segundos
        setTimeout(() => setRetryCount(prev => prev + 1), pollingInterval);
      } else {
        // Solo falla tras agotar los 10 intentos reales
        setStatus('error');
      }
    } catch (err) {
      console.error("Fallo en sincronización de nodo:", err);
      if (retryCount < maxRetries - 1) {
        setTimeout(() => setRetryCount(prev => prev + 1), pollingInterval);
      } else {
        setStatus('error');
      }
    }
  }, [user, retryCount]);

  useEffect(() => {
    // Solo inicia polling si no hay número en URL
    if (!assignedNumber && status === 'syncing') {
      pollForNumber();
    }
  }, [assignedNumber, status, pollForNumber]);

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
    const toast = document.createElement('div');
    toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest z-50 animate-in fade-in slide-in-from-bottom-2";
    toast.innerText = "Número Copiado";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const countryCode = (assignedNumber?.includes('56')) ? 'cl' : 'ar';

  // UI: MODO SINCRONIZACIÓN (Estableciendo conexión con el nodo físico...)
  if (status === 'syncing') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 text-center font-display">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative size-28 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center">
            <RefreshCw className="size-12 text-primary animate-spin" />
          </div>
          <div className="absolute -bottom-2 -right-2 size-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
            <Cpu className="size-5" />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
          Sincronizando con el nodo físico...
        </h2>
        
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700 mb-8">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
            Estableciendo conexión con el nodo físico... Intento {retryCount + 1} de {maxRetries}
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${((retryCount + 1) / maxRetries) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center px-1">
             <span className="text-[9px] font-black text-slate-400 uppercase">Sincronización</span>
             <span className="text-[9px] font-black text-primary uppercase">{Math.round(((retryCount + 1) / maxRetries) * 100)}%</span>
          </div>
        </div>
        
        <div className="mt-12 opacity-30 flex items-center gap-2">
           <ShieldCheck className="size-4" />
           <span className="text-[8px] font-black uppercase tracking-[0.5em]">TELSIM CORE INFRASTRUCTURE v6.8</span>
        </div>
      </div>
    );
  }

  // UI: ERROR FINAL (Fallo de Puerto)
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-8 text-center font-display">
        <div className="size-24 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-[2rem] flex items-center justify-center mb-8 border border-rose-100 dark:border-rose-900/20 shadow-xl">
          <AlertTriangle className="size-12" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">Fallo de Puerto</h1>
        <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 max-w-[32ch] mb-10 leading-relaxed">
          El nodo físico no pudo confirmar la activación del puerto tras 10 reintentos persistentes. La transacción se ha registrado, por favor verifica tu panel en unos minutos.
        </p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full max-w-xs h-16 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-xl hover:bg-black"
        >
          Regresar al Panel Principal
        </button>
      </div>
    );
  }

  // UI: ÉXITO (Muestra el número grande)
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 size-64 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 size-64 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="mb-12">
          <div className="relative mb-6 flex justify-center">
            <div className="absolute size-28 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative size-24 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center transition-transform hover:scale-110">
              <CheckCircle2 className="size-12 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-3">
            ¡Puerto Activo!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px] leading-relaxed max-w-[28ch] mx-auto">
            Sincronización exitosa. Tu línea física está lista para recibir transmisiones de red.
          </p>
        </div>

        {/* Number Display Card */}
        <div className="w-full bg-white dark:bg-surface-dark rounded-[2.5rem] border-2 border-primary/10 p-9 flex flex-col items-center shadow-card mb-10 relative overflow-hidden group">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
          <div className="absolute -right-4 -top-4 size-20 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
          
          <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.4em] mb-5 relative z-10">
            Identificador de Línea
          </span>
          
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
              <span className="text-[9px] font-black uppercase tracking-widest">Nodo Operativo</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">
              Plan {planName}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98]"
          >
            <div className="size-12"></div>
            <span className="text-[14px] uppercase tracking-widest">Ir al Panel de Control</span>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-colors">
              <ArrowRight className="size-6" />
            </div>
          </button>
          
          <button 
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 w-full py-4 text-slate-400 hover:text-primary transition-colors group"
          >
            <Copy className="size-4 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Copiar número</span>
          </button>
        </div>

        <div className="mt-12 flex items-center gap-2 opacity-30">
          <ShieldCheck className="size-4" />
          <span className="text-[8px] font-black uppercase tracking-[0.4em]">TELSIM INFRASTRUCTURE v6.8</span>
        </div>
      </div>
    </div>
  );
};

export default Success;