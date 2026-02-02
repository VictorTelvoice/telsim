import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

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
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
              <span className="material-symbols-rounded text-white text-[20px]">sim_card</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-black dark:text-white">Telsim</span>
          </div>
          <button className="text-primary font-bold text-sm hover:opacity-80 transition-opacity" onClick={() => navigate('/login')}>
            Login
          </button>
        </div>
      </nav>

      <main className="px-5 py-8 flex flex-col gap-10 flex-1">
        {/* Hero Section */}
        <div className="text-center flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary border border-blue-100 dark:border-blue-800 text-xs font-bold shadow-sm">
            <span className="material-symbols-rounded text-[16px]">verified_user</span>
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
        <div className="relative bg-surface-light dark:bg-surface-dark rounded-3xl shadow-soft p-6 border border-slate-100 dark:border-slate-700/50 overflow-hidden transform transition hover:scale-[1.01]">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded-bl-2xl shadow-md">
            {t('landing.offer')}
          </div>
          <div className="mb-7 pt-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">PRUEBA TELSIM</p>
            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
              <h2 className="text-4xl font-extrabold text-emerald-500 tracking-tight">{t('landing.free_trial')}</h2>
            </div>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{t('landing.then')}</p>
          </div>
          <div className="space-y-4">
            {[
              t('landing.feature1'),
              t('landing.feature2'),
              t('landing.feature3')
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center mt-0.5 shadow-sm">
                  <span className="material-symbols-rounded text-white text-[14px]">check</span>
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => navigate('/onboarding/region')}
            className="w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold py-4 rounded-2xl shadow-button flex items-center justify-center gap-2 text-[17px]"
          >
            {t('landing.cta')}
            <span className="material-symbols-rounded">arrow_forward</span>
          </button>
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
            <span className="material-symbols-rounded text-[14px] opacity-80">lock</span>
            <span>{t('landing.lock')}</span>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex justify-center gap-6 opacity-30 grayscale mt-4">
           <img src="https://flagcdn.com/w40/cl.png" alt="Chile" className="h-4 object-contain" />
           <img src="https://flagcdn.com/w40/ar.png" alt="Argentina" className="h-4 object-contain" />
           <img src="https://flagcdn.com/w40/pe.png" alt="Peru" className="h-4 object-contain" />
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-slate-400 dark:text-slate-600 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Telsim Secure Virtual SIM v1.5</p>
        <div className="flex items-center justify-center gap-4 text-[11px] font-bold underline">
          <span>Términos</span>
          <span>Privacidad</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;