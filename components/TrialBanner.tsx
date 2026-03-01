
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Crown, ArrowRight, Sparkles } from 'lucide-react';

const TrialBanner: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] rounded-3xl p-5 shadow-lg border border-white/10 group cursor-pointer active:scale-[0.98] transition-all"
         onClick={() => navigate('/dashboard/billing')}>
      {/* Decorative elements */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
      
      <div className="relative z-10 flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner shrink-0">
          <Crown className="size-6 text-white animate-pulse" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-400/20">
              {t('profile.trial') || 'ACTIVE TRIAL'}
            </span>
            <div className="flex items-center gap-1">
              <Sparkles className="size-3 text-amber-300" />
              <span className="text-[10px] font-bold text-amber-200 uppercase tracking-tight">7 {t('landing.hero.trial_sub') || 'days free'}</span>
            </div>
          </div>
          <h3 className="text-white font-black text-base leading-tight tracking-tight truncate">
            {t('onboarding.free_trial_title') || '7 Days Free Trial'}
          </h3>
          <p className="text-white/70 text-[11px] font-medium leading-tight mt-1 line-clamp-1">
            {t('onboarding.free_trial_desc') || 'Enjoy the full power of TELSIM with no initial charges.'}
          </p>
        </div>

        <div className="size-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors shrink-0">
          <ArrowRight className="size-4 text-white group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default TrialBanner;
