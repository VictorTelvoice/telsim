
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Vault, ArrowLeft, ShieldCheck, Key, Fingerprint, Lock, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

const Vault2FA: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const steps = [
    {
      icon: <Key className="size-6" />,
      title: t('vault.step1_title'),
      desc: t('vault.step1_desc')
    },
    {
      icon: <ShieldCheck className="size-6" />,
      title: t('vault.step2_title'),
      desc: t('vault.step2_desc')
    },
    {
      icon: <Fingerprint className="size-6" />,
      title: t('vault.step3_title'),
      desc: t('vault.step3_desc')
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-32">
      {/* Header Estilo Bóveda */}
      <div className="relative h-72 overflow-hidden bg-[#0A0F1E]">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-transparent z-10"></div>
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-500 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute top-40 right-10 w-48 h-48 bg-blue-600 rounded-full blur-[80px]"></div>
        </div>
        
        <header className="relative z-20 flex items-center justify-between px-6 py-5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full bg-white/5 backdrop-blur-md text-white border border-white/10">
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">{t('vault.security_protocol')}</span>
          <div className="w-9"></div>
        </header>

        <div className="relative z-20 px-8 pt-6 flex flex-col items-center text-center">
          <div className="size-20 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-3xl border border-white/20 flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(34,211,238,0.3)] transform -rotate-3">
            <Vault className="size-10" />
          </div>
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
            {t('vault.title').split(' ')[0]} <span className="text-cyan-400">{t('vault.title').split(' ')[1]}</span> {t('vault.title').split(' ').slice(2).join(' ')}
          </h1>
        </div>
      </div>

      <main className="px-6 -mt-8 relative z-30 space-y-8">
        {/* Risk Warning Card */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
            <ShieldAlert className="text-rose-500 size-5 shrink-0" />
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tight">
              {t('vault.risk_warning')}
            </p>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed px-1">
            {t('vault.expert_recommendation')}
          </p>
        </div>

        {/* The Steps */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('vault.security_setup')}</h3>
          {steps.map((step, idx) => (
            <div key={idx} className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft flex items-start gap-5 group transition-all">
              <div className="size-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-100 dark:border-cyan-900/30">
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

        {/* Compatibility Chips */}
        <div className="bg-slate-900 dark:bg-blue-950/20 rounded-[2.5rem] p-8 border border-white/5">
          <div className="flex items-center gap-3 mb-6">
             <div className="size-2 bg-cyan-500 rounded-full animate-pulse"></div>
             <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('vault.protected_services')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(t('vault.services_list') as unknown as string[]).map((text, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                <CheckCircle2 className="size-3 text-cyan-500" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/90 dark:via-background-dark/90 to-transparent z-40">
        <button 
          onClick={() => navigate('/onboarding/region')}
          className="group w-full max-w-md mx-auto h-16 bg-slate-900 dark:bg-cyan-600 hover:bg-black dark:hover:bg-cyan-700 text-white font-black rounded-2xl shadow-2xl flex items-center justify-between px-2 transition-all active:scale-[0.98]"
        >
          <div className="w-12"></div>
          <span className="text-[15px] uppercase tracking-widest">{t('vault.shield_accounts')}</span>
          <div className="size-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:bg-white/20 transition-colors">
            <ArrowRight className="size-6" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default Vault2FA;
