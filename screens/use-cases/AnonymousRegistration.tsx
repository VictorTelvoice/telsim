
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { ShieldCheck, ArrowLeft, MessageSquare, Smartphone, Lock, CheckCircle, ArrowRight, Zap } from 'lucide-react';

const AnonymousRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const steps = [
    {
      icon: <Smartphone className="size-6" />,
      title: t('anonymous.step1_title'),
      desc: t('anonymous.step1_desc')
    },
    {
      icon: <MessageSquare className="size-6" />,
      title: t('anonymous.step2_title'),
      desc: t('anonymous.step2_desc')
    },
    {
      icon: <Lock className="size-6" />,
      title: t('anonymous.step3_title'),
      desc: t('anonymous.step3_desc')
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-32">
      {/* Header Premium */}
      <div className="relative h-64 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-indigo-900/60 z-10"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-blue-400 rounded-full blur-3xl"></div>
        </div>
        
        <header className="relative z-20 flex items-center justify-between px-6 py-5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10">
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">{t('anonymous.use_case')}</span>
          <div className="w-9"></div>
        </header>

        <div className="relative z-20 px-8 pt-4">
          <div className="size-14 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center text-white mb-4 shadow-2xl">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
            {t('anonymous.title').split(' ')[0]} {t('anonymous.title').split(' ')[1]} <br/>{t('anonymous.title').split(' ').slice(2).join(' ')}
          </h1>
        </div>
      </div>

      <main className="px-6 -mt-10 relative z-30 space-y-8">
        {/* Intro Card */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
            {t('anonymous.intro')}
          </p>
          
          <div className="mt-6 flex flex-wrap gap-2">
            {['WhatsApp', 'Telegram', 'Tinder', 'Uber', 'Binance'].map((app) => (
              <span key={app} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-400 border border-slate-100 dark:border-slate-700 uppercase tracking-widest">
                {app}
              </span>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('anonymous.verification_process')}</h3>
          {steps.map((step, idx) => (
            <div key={idx} className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft flex items-start gap-5 group transition-all hover:border-primary/30">
              <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-primary flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
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

        {/* Why TELSIM */}
        <div className="bg-primary/5 dark:bg-blue-950/20 rounded-[2.5rem] p-8 border border-primary/10">
          <div className="flex items-center gap-3 mb-4">
             <Zap className="text-primary size-5" />
             <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('anonymous.why_telsim')}</h3>
          </div>
          <ul className="space-y-3">
            {(t('anonymous.reasons_list') as unknown as string[]).map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                <CheckCircle className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Floating CTA */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/90 dark:via-background-dark/90 to-transparent z-40">
        <button 
          onClick={() => navigate('/onboarding/region')}
          className="group w-full max-w-md mx-auto h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl shadow-button flex items-center justify-between px-2 transition-all active:scale-[0.98]"
        >
          <div className="w-12"></div>
          <span className="text-[15px] uppercase tracking-widest">{t('anonymous.activate_now')}</span>
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-colors">
            <ArrowRight className="size-6" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default AnonymousRegistration;
