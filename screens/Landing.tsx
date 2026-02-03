
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ShieldCheck, ArrowRight, Check, Lock, Cpu } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 antialiased min-h-screen flex flex-col pb-12 relative">
      {/* Navbar con Logo Corregido */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
                <Cpu className="text-white size-5" />
              </div>
              <div className="flex flex-col">
                <img 
                  src="/logo.png" 
                  alt="TELSIM" 
                  className="h-6 w-auto object-contain block dark:hidden" 
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white uppercase">Telsim</span>
              </div>
            </div>
          </div>
          <button className="text-primary dark:text-blue-400 font-bold text-sm hover:opacity-80 transition-opacity" onClick={() => navigate('/login')}>
            Login
          </button>
        </div>
      </nav>

      <main className="px-5 py-8 flex flex-col gap-10 flex-1">
        {/* Hero Section */}
        <div className="text-center flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[11px] font-black uppercase tracking-widest shadow-sm">
            <ShieldCheck className="size-4" />
            <span>{t('landing.privacy')}</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white leading-[1.15] tracking-tight">
            {t('landing.hero')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed max-w-[32ch] font-medium">
            {t('landing.sub')}
          </p>
        </div>

        {/* Pricing/Trial Highlight Card */}
        <div className="relative bg-white dark:bg-surface-dark rounded-[2.5rem] shadow-soft p-8 border border-slate-100 dark:border-slate-700/50 overflow-hidden transform transition hover:scale-[1.01]">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-5 py-2.5 rounded-bl-[2rem] shadow-md uppercase tracking-widest">
            {t('landing.offer')}
          </div>
          
          <div className="mb-8 pt-2">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">PRUEBA TELSIM</p>
            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
              <h2 className="text-4xl font-black text-emerald-500 tracking-tighter">{t('landing.free_trial')}</h2>
            </div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 italic">{t('landing.then')}</p>
          </div>

          <div className="space-y-5">
            {[
              t('landing.feature1'),
              t('landing.feature2'),
              t('landing.feature3')
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center mt-0.5 shadow-sm">
                  <Check className="text-white size-4 stroke-[3px]" />
                </div>
                <span className="text-[15px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => navigate('/onboarding/region')}
            className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-black h-16 rounded-2xl shadow-button flex items-center justify-center gap-3 text-[17px] uppercase tracking-widest"
          >
            {t('landing.cta')}
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <Lock className="size-3 opacity-80" />
            <span>{t('landing.lock')}</span>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex justify-center gap-8 opacity-40 grayscale mt-4">
           <img src="https://flagcdn.com/w40/cl.png" alt="Chile" className="h-4 object-contain" />
           <img src="https://flagcdn.com/w40/ar.png" alt="Argentina" className="h-4 object-contain" />
           <img src="https://flagcdn.com/w40/pe.png" alt="Peru" className="h-4 object-contain" />
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-slate-400 dark:text-slate-600 space-y-4">
        <p className="text-[9px] font-black uppercase tracking-[0.4em]">Telsim Secure Virtual SIM v1.5</p>
        <div className="flex items-center justify-center gap-6 text-[11px] font-black uppercase tracking-widest">
          <span className="cursor-pointer hover:text-primary transition-colors">Términos</span>
          <span className="cursor-pointer hover:text-primary transition-colors">Privacidad</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
