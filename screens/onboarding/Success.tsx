
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [showContent, setShowContent] = useState(false);
  
  const assignedNumber = location.state?.assignedNumber || '+56 9 1234 5678';
  const planName = location.state?.planName || 'Telsim Flex (Basic)';
  
  const isPower = planName.includes('Power') || planName.includes('Pro');

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const formatPhoneNumber = (num: string) => {
    if (!num) return '---';
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
    const formatted = formatPhoneNumber(assignedNumber);
    navigator.clipboard.writeText(formatted);
    showToast("Número Copiado");
  };

  const getCountryCode = (num: string) => {
    if (num.includes('56') || num.startsWith('+56')) return 'cl';
    if (num.includes('54') || num.startsWith('+54')) return 'ar';
    return 'cl';
  };

  const countryCode = getCountryCode(assignedNumber);

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111318] dark:text-white font-display antialiased flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden transition-colors duration-500">
        
        {/* Background Particles & Validation Spirits */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            
            {/* 1. Telegram Spirit (Left side as requested) */}
            <div className="absolute top-[15%] left-[12%] animate-float-slow transition-opacity duration-1000 delay-200" style={{ opacity: showContent ? 1 : 0 }}>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                    <span className="material-icons-round text-[#0088cc] text-2xl">send</span>
                </div>
            </div>
            
            {/* 2. WhatsApp Spirit (Right side as requested) */}
            <div className="absolute top-[18%] right-[14%] animate-float-medium transition-opacity duration-1000" style={{ opacity: showContent ? 1 : 0 }}>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                    <span className="material-icons-round text-[#25D366] text-2xl">chat</span>
                </div>
            </div>

            {/* 3. Discord / Social Spirit */}
            <div className="absolute top-[48%] right-[8%] animate-float-slow transition-opacity duration-1000 delay-700" style={{ opacity: showContent ? 1 : 0 }}>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                    <span className="material-icons-round text-[#5865F2] text-2xl">forum</span>
                </div>
            </div>

            {/* 4. SMS / Signal Spirit */}
            <div className="absolute bottom-[28%] left-[8%] animate-float-medium transition-opacity duration-1000 delay-500" style={{ opacity: showContent ? 1 : 0 }}>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                    <span className="material-icons-round text-[#3b82f6] text-2xl">textsms</span>
                </div>
            </div>

            {/* Subtle generic markers for atmosphere */}
            <div className="absolute bottom-[35%] right-[25%] w-2 h-2 bg-[#f87171] rounded-full opacity-30"></div>
            <div className="absolute top-[15%] left-[45%] w-2 h-2 bg-[#34d399] rounded-full opacity-30 animate-pulse"></div>
        </div>

        <div className={`relative z-10 w-full max-w-sm flex flex-col items-center text-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex flex-col items-center mb-10">
                <div className="relative mb-6">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-2xl ${isPower ? 'bg-blue-400/50' : 'bg-emerald-400/30'}`}></div>
                    <div className={`relative p-1 rounded-full shadow-sm transition-transform duration-500 ${showContent ? 'scale-100' : 'scale-0'}`}>
                        <div className={`p-2 rounded-full ${isPower ? 'bg-white/10 backdrop-blur-md' : 'bg-white dark:bg-surface-dark'}`}>
                            <span className={`material-symbols-outlined text-[72px] leading-none block ${isPower ? 'text-white' : 'text-emerald-500'}`}>
                                check_circle
                            </span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2 px-4">
                    <h1 className="text-3xl font-extrabold text-[#111318] dark:text-white tracking-tight">{t('onboarding.success_title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-[16px] leading-relaxed">
                        {isPower 
                            ? t('onboarding.success_sub_power') 
                            : t('onboarding.success_sub_flex')}
                    </p>
                </div>
            </div>

            {/* The Main Animated Card */}
            <div className={`w-full rounded-[2.5rem] border-2 p-6 flex flex-col items-center space-y-4 mb-8 relative overflow-hidden transition-all duration-700 ${
                isPower 
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 border-blue-400/50 shadow-[0_0_40px_rgba(59,130,246,0.6)]' 
                : 'bg-white dark:bg-surface-dark border-primary/20 shadow-card'
            }`}>
                
                {/* Scanner Light Beam Animation */}
                <div className={`absolute inset-0 w-[50%] h-[200%] -top-[50%] opacity-30 pointer-events-none animate-scanner ${isPower ? 'bg-gradient-to-r from-transparent via-cyan-300 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-400 to-transparent'}`}></div>
                
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-[4rem]"></div>
                
                <div className="flex flex-col items-center space-y-2 relative z-10 w-full">
                    <span className={`text-[11px] uppercase font-bold tracking-[0.2em] ${isPower ? 'text-white/70' : 'text-primary/70'}`}>
                        Puerto Privado Activado
                    </span>
                    
                    <div className="flex items-center gap-3 animate-reveal-number">
                        <div className={`size-8 rounded-full overflow-hidden border-2 shrink-0 ${isPower ? 'border-white/30' : 'border-slate-100 dark:border-slate-700'}`}>
                             <img 
                                src={`https://flagcdn.com/w80/${countryCode}.png`}
                                alt=""
                                className="w-full h-full object-cover"
                             />
                        </div>
                        <div className={`font-mono text-[26px] font-black tabular-nums tracking-tighter ${isPower ? 'text-white' : 'text-[#111318] dark:text-white'}`}>
                            {formatPhoneNumber(assignedNumber)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                        isPower 
                        ? 'bg-white/20 border-white/30 text-white shadow-inner' 
                        : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    }`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPower ? 'bg-white' : 'bg-emerald-500'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Canal Seguro</span>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                        isPower 
                        ? 'bg-cyan-400 border-cyan-300 text-blue-900 shadow-md' 
                        : 'bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                    }`}>
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                            {isPower ? 'POWER READY' : 'SIM ACTIVE'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-6">
                <button 
                    onClick={() => navigate('/dashboard')}
                    className={`group relative w-full h-[64px] transition-all duration-300 rounded-2xl flex items-center justify-between pl-5 pr-2 shadow-xl active:scale-[0.98] ${
                        isPower 
                        ? 'bg-white text-blue-600 hover:bg-slate-50 shadow-white/10' 
                        : 'bg-primary text-white hover:bg-blue-700 shadow-primary/20'
                    }`}
                >
                    <div className="w-11"></div>
                    <span className="font-black text-[17px] tracking-wide text-center flex-1 uppercase">{t('onboarding.enter_panel')}</span>
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                        isPower ? 'bg-blue-600/10' : 'bg-white/10 group-hover:bg-white/20'
                    }`}>
                        <span className={`material-icons-round text-[24px] ${isPower ? 'text-blue-600' : 'text-white'}`}>arrow_forward</span>
                    </div>
                </button>
                
                <div className="flex flex-col items-center gap-4">
                    <button 
                        onClick={handleCopy}
                        className={`group flex items-center justify-center gap-2 transition-colors w-full py-2 ${
                            isPower ? 'text-white/60 hover:text-white' : 'text-primary dark:text-blue-400 hover:text-blue-800'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        <span className="text-[14px] font-black uppercase tracking-widest">
                            Copiar número
                        </span>
                    </button>
                    
                    <div className="flex items-center gap-2 opacity-40">
                        <div className="h-px w-8 bg-slate-400"></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Infraestructura Verificada</span>
                        <div className="h-px w-8 bg-slate-400"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Success;
