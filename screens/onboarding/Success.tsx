import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [showContent, setShowContent] = useState(false);
  
  // Leemos desde Query Params (más robusto que state)
  const assignedNumber = searchParams.get('assignedNumber');
  const planName = searchParams.get('planName') || 'Pro';
  const isError = !assignedNumber;

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const formatPhoneNumber = (num: string) => {
    if (!num || isError) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    
    // Formato Chileno: +56 9 XXXX XXXX
    if (cleaned.startsWith('569') && cleaned.length === 11) {
        return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    // Formato Argentino: +54 ...
    if (cleaned.startsWith('54') && cleaned.length >= 10) {
        return `+54 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
    }
    
    return num.startsWith('+') ? num : `+${num}`;
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10";
    toast.innerHTML = `
        <div class="size-5 bg-emerald-500 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-[11px] font-black uppercase tracking-widest">${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  const handleCopy = () => {
    if (isError) return;
    const formatted = formatPhoneNumber(assignedNumber!);
    navigator.clipboard.writeText(formatted);
    showToast("Número Copiado");
  };

  const countryCode = (assignedNumber?.includes('56')) ? 'cl' : 'ar';

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111318] dark:text-white font-display antialiased flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
        
        {/* Decorative Ambience */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            <div className="absolute top-[15%] left-[12%] animate-float-slow transition-opacity duration-1000 delay-200" style={{ opacity: showContent ? 1 : 0 }}>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
                    <span className="material-icons-round text-[#0088cc] text-2xl">send</span>
                </div>
            </div>
            
            <div className="absolute top-[18%] right-[14%] animate-float-medium transition-opacity duration-1000" style={{ opacity: showContent ? 1 : 0 }}>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
                    <span className="material-icons-round text-[#25D366] text-2xl">chat</span>
                </div>
            </div>
        </div>

        <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex flex-col items-center mb-10">
                <div className="relative mb-6">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full blur-3xl ${isError ? 'bg-rose-500/20' : 'bg-emerald-400/30'}`}></div>
                    <div className={`relative p-1 rounded-full shadow-sm transition-transform duration-500 ${showContent ? 'scale-100' : 'scale-0'}`}>
                        <div className="p-3 rounded-full bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 shadow-xl">
                            <span className={`material-symbols-outlined text-[80px] leading-none block ${isError ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {isError ? 'warning' : 'check_circle'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="space-y-3 px-4">
                    <h1 className="text-3xl font-black text-[#111318] dark:text-white tracking-tight uppercase">
                        {isError ? 'Fallo de Activación' : '¡Línea Activa!'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px] leading-relaxed max-w-[30ch] mx-auto">
                        {isError 
                          ? 'Hubo un problema al provisionar tu puerto físico. Inténtalo de nuevo o contacta a soporte.' 
                          : 'Tu nuevo puerto físico ha sido sincronizado exitosamente con la red TELSIM.'}
                    </p>
                </div>
            </div>

            {!isError && assignedNumber && (
              <div className="w-full rounded-[2.5rem] border-2 p-7 flex flex-col items-center space-y-5 mb-10 relative overflow-hidden transition-all duration-700 bg-white dark:bg-surface-dark border-primary/20 shadow-card group">
                  <div className="absolute inset-0 w-[50%] h-[200%] -top-[50%] opacity-20 pointer-events-none animate-scanner bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
                  
                  <div className="flex flex-col items-center space-y-3 relative z-10 w-full">
                      <span className="text-[11px] uppercase font-black tracking-[0.25em] text-primary/70">PUERTO ASIGNADO</span>
                      <div className="flex items-center gap-4 animate-reveal-number">
                          <div className="size-10 rounded-full overflow-hidden border-2 shrink-0 border-slate-100 dark:border-slate-700 shadow-sm">
                               <img 
                                  src={`https://flagcdn.com/w80/${countryCode}.png`}
                                  alt=""
                                  className="w-full h-full object-cover"
                               />
                          </div>
                          <div className="font-mono text-[28px] font-black tabular-nums tracking-tighter text-[#111318] dark:text-white leading-none">
                              {formatPhoneNumber(assignedNumber)}
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-2 relative z-10">
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500"></div>
                          <span className="text-[10px] font-black uppercase tracking-widest leading-none">CANAL SEGURO</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                          <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                              {planName.toUpperCase()}
                          </span>
                      </div>
                  </div>
              </div>
            )}

            <div className="w-full space-y-6">
                <button 
                    onClick={() => navigate('/dashboard')}
                    className={`group relative w-full h-16 transition-all duration-300 rounded-2xl flex items-center justify-between pl-6 pr-2 shadow-2xl active:scale-[0.98] ${isError ? 'bg-slate-900' : 'bg-primary shadow-primary/30'} text-white uppercase`}
                >
                    <div className="w-10"></div>
                    <span className="font-black text-[15px] tracking-[0.1em] text-center flex-1">Ir al Panel</span>
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-colors bg-white/10 group-hover:bg-white/20">
                        <span className="material-icons-round text-[24px]">arrow_forward</span>
                    </div>
                </button>
                
                {!isError && (
                  <button 
                      onClick={handleCopy}
                      className="group flex items-center justify-center gap-3 transition-all w-full py-2 text-primary dark:text-blue-400 hover:text-blue-700 active:scale-95"
                  >
                      <span className="material-symbols-outlined text-[20px]">content_copy</span>
                      <span className="text-[13px] font-black uppercase tracking-widest">Copiar número</span>
                  </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default Success;