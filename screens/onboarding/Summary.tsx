import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

import { STRIPE_PRICES } from '../../constants/stripePrices';

// ─── Plan pricing catalogue (single source of truth across onboarding) ────────
const PLAN_CATALOGUE: Record<string, { monthly: number; annual: number; limit: number; monthlyId: string; annualId: string }> = {
  Starter: { monthly: 19.90, annual: 199, limit: 150, monthlyId: STRIPE_PRICES.STARTER.MONTHLY, annualId: STRIPE_PRICES.STARTER.ANNUAL },
  Pro: { monthly: 39.90, annual: 399, limit: 400, monthlyId: STRIPE_PRICES.PRO.MONTHLY, annualId: STRIPE_PRICES.PRO.ANNUAL },
  Power: { monthly: 99.00, annual: 990, limit: 1400, monthlyId: STRIPE_PRICES.POWER.MONTHLY, annualId: STRIPE_PRICES.POWER.ANNUAL },
};

// ─── Check icon ───────────────────────────────────────────────────────────────
const Check = () => (
  <span className="material-symbols-outlined text-emerald-500 flex-shrink-0" style={{ fontSize: '16px' }}>check_circle</span>
);

const Summary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);
  const [desktop, setDesktop] = useState(isDesktop());

  useEffect(() => {
    const handler = () => setDesktop(isDesktop());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void supabase
      .from('users')
      .update({ onboarding_step: ONBOARDING_STEPS.SUMMARY })
      .eq('id', user.id);
  }, [user?.id]);

  const planData = useMemo(() => {
    // Priority 1: navigation state (from RegionSelect.handleContinue)
    if (location.state?.planName) return location.state;

    // Priority 2: reconstruct from localStorage so back-navigation still works
    const savedId = localStorage.getItem('selected_plan');
    const savedAnnual = localStorage.getItem('selected_plan_annual') === 'true';
    const savedPrice = parseFloat(localStorage.getItem('selected_plan_price') || '0') || 0;
    const savedPriceId = localStorage.getItem('selected_plan_price_id') || '';

    const nameMap: Record<string, string> = { starter: 'Starter', pro: 'Pro', power: 'Power' };
    const pName = savedId ? nameMap[savedId] : null;
    if (pName && PLAN_CATALOGUE[pName]) {
      const cfg = PLAN_CATALOGUE[pName];
      return {
        planName: pName,
        isAnnual: savedAnnual,
        price: savedPrice || (savedAnnual ? cfg.annual : cfg.monthly),
        monthlyLimit: cfg.limit,
        stripePriceId: savedPriceId || (savedAnnual ? cfg.annualId : cfg.monthlyId),
      };
    }
    return {};
  }, [location.state]);

  const planName = planData.planName || 'Pro';
  const isAnnual = planData.isAnnual || false;
  const stripePriceId = planData.stripePriceId || PLAN_CATALOGUE[planName]?.monthlyId || '';

  const planCfg = useMemo(() => PLAN_CATALOGUE[planName] || PLAN_CATALOGUE.Pro, [planName]);

  const planDetails = useMemo(() => {
    const featuresMap: Record<string, string[]> = {
      Starter: [t('sniper.feature_real_sim'), t('sniper.feature_real_time'), t('sniper.feature_ticket_support')],
      Pro: [t('sniper.feature_api_webhooks'), t('sniper.feature_automated'), t('sniper.feature_chat_support')],
      Power: [t('sniper.feature_enterprise_security'), t('sniper.feature_scalability'), t('sniper.feature_priority_support')],
    };
    return {
      price: isAnnual ? planCfg.annual : planCfg.monthly,
      limit: planCfg.limit,
      features: featuresMap[planName] || featuresMap.Pro,
    };
  }, [planName, isAnnual, planCfg, t]);

  const billingDate = useMemo(() => {
    const date = new Date();
    if (isAnnual) {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [isAnnual]);

  const handleNext = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    // ⚠️  Do NOT clear localStorage here — if user returns from Stripe (browser back)
    //     the state needs to survive. Cleanup happens in Processing.tsx on success.
    navigate('/onboarding/payment', {
      state: {
        planName,
        price: planDetails.price,
        monthlyLimit: planDetails.limit,
        stripePriceId,
        isAnnual,
        // Propagamos la región seleccionada para que la reserva de slot sea consistente.
        region: (planData as any).region,
      }
    });
  };

  // ─── Shared: Plan Card content ────────────────────────────────────────────
  const PlanCard = () => (
    <div className="rounded-3xl bg-white dark:bg-[#1A2230] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Region header */}
      <div className="flex items-center gap-4 p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="w-12 h-12 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-2xl shadow-sm">
          🇨🇱
        </div>
        <div>
          <p className="text-slate-900 dark:text-white text-[15px] font-bold uppercase tracking-tight">{t('onboarding.chile_line')}</p>
          <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-0.5">{t('onboarding.real_infra')}</p>
        </div>
      </div>

      {/* Plan details */}
      <div className="p-6 space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1 block">{t('onboarding.selected_plan')}</span>
            <span className="text-slate-900 dark:text-white font-black text-2xl uppercase tracking-tight">{planName}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold text-slate-500">{t('onboarding.monthly_credits', { limit: planDetails.limit })}</span>
              {isAnnual && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50 px-2 py-0.5 rounded-full">
                  Anual • Ahorras 17%
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-900 dark:text-white font-black text-2xl">${planDetails.price.toFixed(2)}</span>
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">
              {isAnnual ? '/año' : t('onboarding.per_month')}
            </span>
            {isAnnual && (
              <span className="text-[9px] font-medium text-slate-400 block">
                (~${(planDetails.price / 12).toFixed(2)}/mes)
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {planDetails.features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
              <Check />{f}
            </div>
          ))}
        </div>

        {/* Guarantee box */}
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-4">
          <div className="flex items-start gap-3 mb-3">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" style={{ fontSize: '20px' }}>verified_user</span>
            <div>
              <p className="text-emerald-800 dark:text-emerald-300 text-sm font-black uppercase tracking-tight">{t('onboarding.free_trial_title')}</p>
              <p className="text-emerald-700 dark:text-emerald-400/80 text-[11px] font-medium leading-relaxed mt-1">{t('onboarding.free_trial_desc')}</p>
            </div>
          </div>
          <div className="pt-3 border-t border-emerald-500/10 flex justify-between items-center">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('onboarding.first_billing')}</span>
            <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">{billingDate}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Shared: Totals ───────────────────────────────────────────────────────
  const Totals = () => (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center text-slate-400 text-[11px] font-black uppercase tracking-widest">
        <span>{t('onboarding.subtotal')} {isAnnual ? '(Anual)' : '(Mensual)'}</span>
        <span>${planDetails.price.toFixed(2)}</span>
      </div>
      <div className="my-1 h-px w-full bg-slate-200 dark:bg-slate-800" />
      <div className="flex justify-between items-center">
        <span className="text-slate-900 dark:text-white text-lg font-black uppercase">{t('onboarding.total_today')}</span>
        <span className="text-slate-900 dark:text-white text-3xl font-black">${planDetails.price.toFixed(2)}</span>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // ──────────────────────────────────────────────────────────────────────────
  if (desktop) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] dark:bg-background-dark font-display flex flex-col">
        {/* Top nav */}
        <header className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between">
          <TelsimBrandLogo compact iconClassName="h-10 w-10 rounded-xl" textClassName="text-[1.65rem]" />
          <div className="flex items-center gap-2 text-[12px] font-bold text-slate-400 dark:text-slate-500">
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            Plan seleccionado
            <span className="mx-1 text-slate-200">·</span>
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            Región elegida
            <span className="mx-1 text-slate-200">·</span>
            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-[10px] font-black">3</span>
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Resumen</span>
          </div>
          <button
            onClick={() => !isNavigating && navigate(-1)}
            className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors text-[12px] font-semibold"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
        </header>

        {/* Body: centered 2-col */}
        <div className="flex-1 flex items-start justify-center px-8 py-12">
          <div className="w-full max-w-3xl">
            <div className="mb-8">
              <h1 className="text-[30px] font-black text-slate-900 dark:text-white tracking-tight">{t('onboarding.review_subscription')}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-[14px] mt-1.5">{t('onboarding.confirm_details')}</p>
            </div>

            <div className="grid grid-cols-5 gap-6">
              {/* Plan card */}
              <div className="col-span-3">
                <PlanCard />
              </div>

              {/* Right: totals + CTA */}
              <div className="col-span-2 flex flex-col gap-5">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                  <h3 className="text-[13px] font-black uppercase tracking-wider text-slate-400 mb-5">Resumen de cobro</h3>
                  <Totals />
                </div>

                <button
                  onClick={handleNext}
                  disabled={isNavigating}
                  className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-black text-[15px] h-14 rounded-2xl flex items-center justify-between px-5 disabled:opacity-70"
                >
                  <span />
                  <span>{t('onboarding.start_free_trial')}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>

                <div className="flex flex-col gap-2 px-2">
                  {[
                    { icon: '🔒', text: 'Pago seguro con SSL 256-bit' },
                    { icon: '↩️', text: 'Cancela cuando quieras' },
                    { icon: '🛡️', text: 'Garantía de satisfacción sujeta a revisión' },
                  ].map(item => (
                      <div key={item.text} className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      <span>{item.icon}</span><span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT (original)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
      <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center bg-background-light/90 dark:bg-background-dark/90 px-4 py-3 backdrop-blur-sm">
          <div onClick={() => !isNavigating && navigate(-1)} className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer ${isNavigating ? 'opacity-30' : ''}`}>
            <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{ fontSize: '24px' }}>arrow_back</span>
          </div>
          <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10">{t('onboarding.summary_title')}</h2>
        </div>

        <div className="flex flex-col gap-2 px-6 pt-2 pb-4">
          <div className="flex justify-between items-center">
            <p className="text-primary dark:text-blue-400 text-sm font-bold">{t('onboarding.step_of', { current: 3, total: 3 })}</p>
            <p className="text-gray-400 text-xs font-medium">{t('onboarding.finish')}</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#dbdfe6] dark:bg-gray-700 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="flex-1 flex flex-col px-6 pb-44 overflow-y-auto no-scrollbar">
          <div className="pb-6 pt-2">
            <h1 className="text-[#111318] dark:text-white tracking-tight text-[28px] font-extrabold leading-tight text-left mb-2">{t('onboarding.review_subscription')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">{t('onboarding.confirm_details')}</p>
          </div>
          <div className="mb-6"><PlanCard /></div>
          <div className="flex flex-col gap-3 mb-6 px-2"><Totals /></div>
        </div>

        <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-6 pb-10">
          <button onClick={handleNext} disabled={isNavigating}
            className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl flex items-center justify-between px-2 disabled:opacity-70">
            <div className="w-12" />
            <span className="text-[17px] tracking-wide uppercase">{t('onboarding.start_free_trial')}</span>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <span className="material-symbols-outlined text-white">arrow_forward</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Summary;
