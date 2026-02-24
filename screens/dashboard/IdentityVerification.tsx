import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ArrowLeft, 
  ShieldCheck, 
  BadgeCheck, 
  Camera, 
  FileText, 
  UserCheck, 
  ShieldAlert, 
  ChevronRight,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

const IdentityVerification: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [status, setStatus] = useState<'not_started' | 'pending' | 'verified'>('not_started');

  const steps = [
    {
      id: 'document',
      icon: <FileText className="size-5" />,
      title: t('kyc.step_id_title'),
      desc: t('kyc.step_id_desc'),
      status: 'pending' // pending, completed, locked
    },
    {
      id: 'biometric',
      icon: <Camera className="size-5" />,
      title: t('kyc.step_bio_title'),
      desc: t('kyc.step_bio_desc'),
      status: 'locked'
    },
    {
      id: 'address',
      icon: <BadgeCheck className="size-5" />,
      title: t('kyc.step_address_title'),
      desc: t('kyc.step_address_desc'),
      status: 'locked'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display pb-32">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em]">{t('kyc.title')}</h1>
        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="size-4 text-primary" />
        </div>
      </header>

      <main className="px-5 py-8 max-w-lg mx-auto space-y-8">
        
        {/* STATUS CARD */}
        <section className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft relative overflow-hidden">
           <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <UserCheck className="size-24 text-primary" />
           </div>
           
           <div className="relative z-10 flex flex-col items-center text-center">
              <div className={`size-16 rounded-2xl flex items-center justify-center mb-6 border ${status === 'verified' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-primary/5 border-primary/10 text-primary'}`}>
                 <ShieldCheck className="size-10" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('kyc.status_card_title')}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed max-w-[25ch] mx-auto">
                 {t('kyc.status_card_desc')}
              </p>
              
              <div className="mt-8 w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                 <div className="text-left">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{t('kyc.current_status')}</span>
                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('kyc.unverified')}</span>
                 </div>
                 <div className="flex items-center gap-1.5 bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full border border-amber-200 shadow-sm">
                    <Clock className="size-3" />
                    <span className="text-[9px] font-black uppercase">{t('kyc.pending')}</span>
                 </div>
              </div>
           </div>
        </section>

        {/* VERIFICATION STEPS */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('kyc.validation_steps')}</h3>
          
          <div className="space-y-3">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`bg-white dark:bg-surface-dark p-5 rounded-3xl border flex items-center justify-between shadow-sm transition-all ${step.status === 'locked' ? 'opacity-50 grayscale' : 'hover:border-primary/40'} border-slate-100 dark:border-slate-800`}
              >
                 <div className="flex items-center gap-4">
                    <div className={`size-11 rounded-2xl flex items-center justify-center border ${step.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-400'}`}>
                       {step.icon}
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{step.title}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{step.desc}</p>
                    </div>
                 </div>
                 {step.status === 'locked' ? (
                   <Lock className="size-4 text-slate-300" />
                 ) : step.status === 'completed' ? (
                   <CheckCircle2 className="size-5 text-emerald-500" />
                 ) : (
                   <button className="text-[10px] font-black text-primary uppercase tracking-widest px-4 py-2 bg-primary/5 rounded-xl">
                      {t('kyc.start')}
                   </button>
                 )}
              </div>
            ))}
          </div>
        </div>

        {/* BENEFITS BANNER */}
        <div className="bg-slate-900 dark:bg-blue-950/20 p-6 rounded-[2rem] border border-white/5 space-y-4">
           <div className="flex items-center gap-3">
              <BadgeCheck className="size-5 text-emerald-400" />
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{t('kyc.vip_benefits')}</h4>
           </div>
           <ul className="space-y-3">
              {[
                t('kyc.benefit1'),
                t('kyc.benefit2'),
                t('kyc.benefit3'),
                t('kyc.benefit4')
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-xs font-bold text-white/60">
                   <div className="size-1 bg-emerald-500 rounded-full"></div>
                   {benefit}
                </li>
              ))}
           </ul>
        </div>

        {/* SECURITY INFO */}
        <div className="flex flex-col items-center gap-6 pt-8">
           <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
              <ShieldAlert className="size-4 text-slate-400" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">{t('kyc.encrypted_data')}</span>
           </div>
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] text-center px-8">{t('kyc.compliance')}</p>
        </div>

      </main>
    </div>
  );
};

export default IdentityVerification;