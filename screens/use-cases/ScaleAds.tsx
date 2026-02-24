
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Megaphone, ArrowLeft, ShieldCheck, TrendingUp, Layers, Rocket, ArrowRight, Target } from 'lucide-react';

const ScaleAds: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const steps = [
    {
      icon: <Layers className="size-6" />,
      title: t('ads.step1_title'),
      desc: t('ads.step1_desc')
    },
    {
      icon: <ShieldCheck className="size-6" />,
      title: t('ads.step2_title'),
      desc: t('ads.step2_desc')
    },
    {
      icon: <Rocket className="size-6" />,
      title: t('ads.step3_title'),
      desc: t('ads.step3_desc')
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-44">
      {/* Header Estilo Growth/Marketing */}
      <div className="relative h-72 overflow-hidden bg-[#0F0A1E]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 via-purple-900/60 to-transparent z-10"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-purple-600 rounded-full blur-[100px]"></div>
        </div>
        
        <header className="relative z-20 flex items-center justify-between px-6 py-5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 transition-colors hover:bg-white/20">
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em]">{t('ads.protocol')}</span>
          <div className="w-9"></div>
        </header>

        <div className="relative z-20 px-8 pt-6 flex flex-col items-center text-center">
          <div className="size-20 bg-indigo-600 rounded-3xl border border-white/20 flex items-center justify-center text-white mb-6 shadow-[0_20px_40px_rgba(79,70,229,0.3)] transform -rotate-3">
            <Megaphone className="size-10" />
          </div>
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
            {t('ads.title').split(' ').slice(0, -1).join(' ')} <span className="text-indigo-400">{t('ads.title').split(' ').slice(-1)}</span>
          </h1>
          <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mt-2">{t('ads.precision_marketing')}</p>
        </div>
      </div>

      <main className="px-6 -mt-8 relative z-30 space-y-8">
        {/* Metric Card */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 shadow-soft border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
            <TrendingUp className="text-indigo-600 size-5 shrink-0" />
            <p className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">
              {t('ads.trust_score')}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center text-center">
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">100%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('ads.isolation')}</span>
             </div>
             <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center text-center">
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Zero</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('ads.shadowbans')}</span>
             </div>
          </div>
          
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed text-center px-4">
            {t('ads.resilient_infra')}
          </p>
        </div>

        {/* The Steps */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('ads.account_strategy')}</h3>
          {steps.map((step, idx) => (
            <div key={idx} className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft flex items-start gap-5 group transition-all hover:border-indigo-500/30">
              <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/30 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                {step.icon}
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white mb-1">{step.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating CTA - Ajustado para estar sobre el menú inferior */}
      <div className="fixed bottom-[84px] left-0 w-full p-6 z-40">
        <button 
          onClick={() => navigate('/onboarding/region')}
          className="group w-full max-w-md mx-auto h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(29,78,216,0.3)] flex items-center justify-between px-2 transition-all active:scale-[0.98]"
        >
          <div className="w-12"></div>
          <span className="text-[15px] uppercase tracking-widest">{t('ads.deploy_infra')}</span>
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-colors">
            <ArrowRight className="size-6" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default ScaleAds;
