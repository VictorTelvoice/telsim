import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { STRIPE_PRICES } from '../../constants/stripePrices';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

const OFFICIAL_PLANS = {
  starter: {
    id: 'Starter',
    amount: 19.9,
    amountAnnual: 199,
    limit: 150,
    stripePriceId: STRIPE_PRICES.STARTER.MONTHLY,
    stripePriceIdAnnual: STRIPE_PRICES.STARTER.ANNUAL,
    creditsLabel: '150 Creditos SMS',
    featuresKey: 'landing.pricing.features.starter',
    descKey: 'landing.pricing.starter.desc',
  },
  pro: {
    id: 'Pro',
    amount: 39.9,
    amountAnnual: 399,
    limit: 400,
    stripePriceId: STRIPE_PRICES.PRO.MONTHLY,
    stripePriceIdAnnual: STRIPE_PRICES.PRO.ANNUAL,
    creditsLabel: '400 Creditos SMS',
    featuresKey: 'landing.pricing.features.pro',
    descKey: 'landing.pricing.pro.desc',
  },
  power: {
    id: 'Power',
    amount: 99,
    amountAnnual: 990,
    limit: 1400,
    stripePriceId: STRIPE_PRICES.POWER.MONTHLY,
    stripePriceIdAnnual: STRIPE_PRICES.POWER.ANNUAL,
    creditsLabel: '1,400 Creditos SMS',
    featuresKey: 'landing.pricing.features.power',
    descKey: 'landing.pricing.power.desc',
  },
} as const;

type PlanKey = keyof typeof OFFICIAL_PLANS;
type VisiblePlan = {
  key: PlanKey;
  id: string;
  creditsLabel: string;
  limit: number;
  amount: number;
  amountAnnual: number;
  stripePriceId: string;
  stripePriceIdAnnual: string;
  featuresKey: string;
  descKey: string;
  forceBilling?: 'monthly' | 'annual';
};

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-shrink-0">
    <circle cx="12" cy="12" r="12" fill="#10b981" opacity="0.15" />
    <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

const getPlanTheme = (key: PlanKey, isDark: boolean) => {
  if (key === 'pro') {
    return {
      borderClass: 'border-primary',
      cardClass: isDark
        ? 'bg-[linear-gradient(160deg,#071226_0%,#0b1730_52%,#08101f_100%)] shadow-[0_28px_70px_-28px_rgba(15,23,42,1)]'
        : 'bg-[linear-gradient(160deg,#eff6ff_0%,#ffffff_50%)]',
      badgeClass: isDark ? 'bg-primary/12 ring-1 ring-primary/25 text-blue-100' : 'bg-blue-100 text-primary',
      idealClass: isDark ? 'bg-slate-950/55 ring-1 ring-primary/20 text-blue-100' : 'bg-blue-50 text-primary',
      titleClass: 'text-primary',
      ctaClass: 'text-primary',
      ctaBg: 'bg-primary',
      dividerClass: isDark ? 'bg-gradient-to-r from-transparent via-primary/35 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-200 to-transparent',
      featureClass: isDark ? 'text-slate-200' : 'text-slate-700',
      priceClass: isDark ? 'text-white' : 'text-slate-900',
      overlayClass: isDark ? 'bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_28%)]' : '',
      idealLabelClass: isDark ? 'text-blue-200/55' : 'text-primary/50',
    };
  }
  if (key === 'power') {
    return {
      borderClass: 'border-amber-400',
      cardClass: isDark
        ? 'bg-[linear-gradient(180deg,#0b1018_0%,#0b1018_100%)] shadow-[0_24px_60px_-24px_rgba(245,166,35,0.25)]'
        : 'bg-white',
      badgeClass: isDark
        ? 'text-amber-300'
        : 'bg-[linear-gradient(135deg,#FEF3C7,#FDE68A)] text-amber-600',
      idealClass: isDark
        ? 'text-amber-50'
        : 'bg-[linear-gradient(135deg,#FFFBEB,#FEF3C7)] text-amber-700',
      titleClass: 'bg-[linear-gradient(90deg,#F5A623,#D4A017)] bg-clip-text text-transparent',
      ctaClass: 'bg-[linear-gradient(90deg,#F5A623,#D4A017)] bg-clip-text text-transparent',
      ctaBg: 'bg-amber-500',
      dividerClass: 'bg-[linear-gradient(90deg,transparent,#F5A623,transparent)]',
      featureClass: isDark ? 'text-slate-200' : 'text-slate-700',
      priceClass: isDark ? 'text-white' : 'text-slate-900',
      overlayClass: isDark ? 'bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.08),transparent_26%)]' : '',
      idealLabelClass: isDark ? 'text-amber-300/70' : '',
    };
  }
  return {
    borderClass: isDark ? 'border-slate-800' : 'border-slate-200',
    cardClass: isDark
      ? 'bg-[linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] shadow-[0_28px_70px_-28px_rgba(15,23,42,1)]'
      : 'bg-white',
    badgeClass: isDark ? 'bg-slate-800 ring-1 ring-slate-700/80 text-slate-200' : 'bg-slate-100 text-slate-600',
    idealClass: isDark ? 'bg-slate-900/90 ring-1 ring-slate-800/80 text-slate-300' : 'bg-slate-50 text-slate-600',
    titleClass: 'text-slate-400',
    ctaClass: 'text-slate-500',
    ctaBg: 'bg-slate-900',
    dividerClass: isDark ? 'bg-gradient-to-r from-transparent via-slate-700 to-transparent' : 'bg-gradient-to-r from-transparent via-slate-200 to-transparent',
    featureClass: isDark ? 'text-slate-300' : 'text-slate-700',
    priceClass: isDark ? 'text-white' : 'text-slate-900',
    overlayClass: isDark ? 'bg-[radial-gradient(circle_at_top_right,rgba(51,65,85,0.25),transparent_34%)]' : '',
    idealLabelClass: 'text-slate-400',
  };
};

export default function UpgradePlanSelector() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const phoneNumber = state?.phoneNumber as string | undefined;
  const slotId = state?.slot_id as string | undefined;
  const currentPlanName = String(state?.currentPlanName || 'Starter');
  const currentBilling = (state?.billing_type || 'monthly') as 'monthly' | 'annual';

  const [desktop, setDesktop] = useState(isDesktop());
  const [isAnnual, setIsAnnual] = useState(currentBilling === 'annual');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const handler = () => setDesktop(isDesktop());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const visiblePlans = useMemo<VisiblePlan[]>(() => {
    const currentKey = currentPlanName.toLowerCase() as PlanKey;
    const orderedKeys: PlanKey[] = ['starter', 'pro', 'power'];
    return orderedKeys.map((key) => {
      const plan = OFFICIAL_PLANS[key];
      return {
        key,
        ...plan,
        forceBilling: key === currentKey ? (currentBilling === 'monthly' ? 'annual' : 'monthly') : undefined,
      };
    });
  }, [currentBilling, currentPlanName]);

  useEffect(() => {
    setCurrentPage(0);
  }, [visiblePlans.length]);

  useEffect(() => {
    if (desktop) return;
    const el = scrollRef.current;
    if (!el || visiblePlans.length === 0) return;
    const targetIndex = 0;
    const timer = setTimeout(() => {
      const cards = el.querySelectorAll<HTMLElement>('[data-plan-card]');
      const card = cards[targetIndex];
      card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      setCurrentPage(targetIndex);
    }, 200);
    return () => clearTimeout(timer);
  }, [desktop, visiblePlans.length]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-plan-card]'));
    if (cards.length === 0) return;

    const viewportCenter = el.scrollLeft + el.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const center = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(center - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setCurrentPage(closestIndex);
  };

  const handleSelect = (plan: VisiblePlan) => {
    const useAnnual = plan.forceBilling ? plan.forceBilling === 'annual' : isAnnual;
    navigate('/dashboard/upgrade-summary', {
      state: {
        phoneNumber,
        slot_id: slotId,
        planName: plan.id,
        currentPlanName,
        stripePriceId: useAnnual ? plan.stripePriceIdAnnual : plan.stripePriceId,
        limit: plan.limit,
        price: useAnnual ? plan.amountAnnual : plan.amount,
        isAnnual: useAnnual,
        isUpgrade: true,
      },
    });
  };

  const Toggle = () => (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Mensual</span>
      <button
        onClick={() => setIsAnnual(!isAnnual)}
        className={`relative h-6 w-12 rounded-full transition-colors duration-300 ${isAnnual ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
      <span className={`text-sm font-bold transition-colors ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Anual</span>
      <span className={`rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 transition-all duration-200 ${isAnnual ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
        Ahorra 17%
      </span>
    </div>
  );

  const renderCard = (plan: VisiblePlan, mobile = false, index = 0) => {
    const theme = getPlanTheme(plan.key, isDark);
    const useAnnual = plan.forceBilling ? plan.forceBilling === 'annual' : isAnnual;
    const amount = useAnnual ? plan.amountAnnual : plan.amount;
    const priceLabel = useAnnual ? `/yr` : `/mo`;
    const featureTexts = t(plan.featuresKey) as unknown as string[];
    const descText = t(plan.descKey) as unknown as string;
    const isFocusedCard = !mobile || currentPage === index;

    return (
      <button
        key={plan.key}
        data-plan-card
        onClick={() => handleSelect(plan)}
        className={`group relative flex cursor-pointer flex-col overflow-visible text-left transition-all duration-500 transform-gpu will-change-transform ${mobile ? 'min-w-[72vw] snap-center shrink-0 rounded-3xl px-6 pb-6 pt-7' : 'rounded-3xl px-8 pb-7 pt-8 hover:-translate-y-2 hover:scale-[1.015]'} border-2 ${theme.borderClass} ${theme.cardClass} ${mobile ? (isFocusedCard ? 'scale-[1.035] -translate-y-3 shadow-[0_34px_84px_-30px_rgba(15,23,42,0.48)]' : 'scale-[0.93] translate-y-3 opacity-80') : ''}`}
        style={plan.key === 'power' && !mobile
          ? { background: isDark ? 'linear-gradient(#0b1018,#0b1018) padding-box, linear-gradient(135deg,#F5A623,#F0C040) border-box' : 'linear-gradient(white,white) padding-box, linear-gradient(135deg,#F5A623,#F0C040) border-box', border: '2px solid transparent' }
          : undefined}
      >
        {theme.overlayClass ? <div className={`pointer-events-none absolute inset-0 ${theme.overlayClass}`} /> : null}
        {plan.forceBilling ? (
          <div className={`absolute ${mobile ? 'top-0 left-1/2 -translate-x-1/2 rounded-b-2xl px-4 py-1.5' : '-top-3 left-6 rounded-full px-4 py-1.5'} bg-emerald-500 text-[10px] font-black uppercase tracking-[0.18em] text-white`}>
            {plan.forceBilling === 'annual' ? 'Cambia a anual' : 'Cambia a mensual'}
          </div>
        ) : plan.key === 'pro' ? (
          <div className={`absolute ${mobile ? 'top-0 left-1/2 -translate-x-1/2 rounded-b-2xl px-5 py-1.5' : '-top-3 left-6 rounded-full px-4 py-1.5'} bg-primary text-[10px] font-black uppercase tracking-[0.18em] text-white`}>
            ⚡ Más popular
          </div>
        ) : null}

        <div className={mobile ? 'pt-5' : ''}>
          <div className={`mb-3 text-[11px] font-black uppercase tracking-widest ${theme.titleClass}`}>{plan.id}</div>
          <div className={`mb-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 ${theme.badgeClass}`}>
            <span className="text-[11px] font-black">{plan.creditsLabel}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`${mobile ? 'text-5xl' : 'text-[48px]'} font-black leading-none ${theme.priceClass}`}>
              ${amount}
            </span>
            <span className="text-sm font-semibold text-slate-400">{priceLabel}</span>
          </div>
          {plan.forceBilling ? (
            <p className="mt-1 text-[11px] font-bold text-emerald-500">
              {plan.forceBilling === 'annual' ? 'Cambio anual inmediato' : 'Cambio mensual inmediato'}
            </p>
          ) : isAnnual ? (
            <p className="mt-1 text-[11px] font-bold text-emerald-500">
              Facturado como ${plan.amountAnnual}/año
            </p>
          ) : null}
        </div>

        <div className={`h-px ${theme.dividerClass}`} />

        <div className={`flex flex-1 flex-col ${mobile ? 'gap-2.5' : 'gap-3'} ${mobile ? 'py-5' : 'py-6'}`}>
          {featureTexts.map((feature, index) => (
            <div key={`${plan.key}-${index}`} className="flex items-start gap-2">
              <CheckIcon />
              <span className={`${mobile ? 'text-[12.5px]' : 'text-[14px]'} leading-relaxed font-semibold ${theme.featureClass}`}>
                {feature}
              </span>
            </div>
          ))}
        </div>

        <div className={`rounded-2xl px-5 py-3.5 ${theme.idealClass}`}>
          <p className={`mb-0.5 text-[9px] font-black uppercase tracking-wider opacity-60 ${theme.idealLabelClass}`}>Ideal para</p>
          <p className={`${mobile ? 'text-[12.5px]' : 'text-[13px]'} leading-relaxed font-bold`}>{descText}</p>
        </div>

        <div className={`flex items-center justify-center gap-1.5 pt-3 ${theme.ctaClass}`}>
          <span className={`${mobile ? 'text-sm' : 'text-[14px]'} font-black`}>Cambiar plan</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <polyline points="12 5 19 12 12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </button>
    );
  };

  if (desktop) {
    return (
      <div className={`min-h-screen font-display ${isDark ? 'bg-background-dark' : 'bg-[#F0F4F8]'}`}>
        <header className={`flex min-h-[72px] items-center justify-between px-8 py-4 ${isDark ? 'border-b border-slate-800 bg-slate-950' : 'border-b border-slate-100 bg-white'}`}>
          <button onClick={() => navigate(-1)} className="flex items-center">
            <TelsimBrandLogo compact iconClassName="h-10 w-10 rounded-xl" textClassName="text-[1.65rem]" />
          </button>
          <div className={`flex items-center gap-2 text-[12px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>{phoneNumber || 'Cambiar plan'}</span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-8 py-8 xl:py-7">
          <div className="mb-8 text-center">
            <h1 className={`text-[36px] font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Elige tu nuevo plan</h1>
            <p className={`mt-2 text-[15px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Plan actual: {currentPlanName} · {currentBilling === 'annual' ? 'Anual' : 'Mensual'} — El cambio es inmediato, sin días de prueba.
            </p>
          </div>

          <div className="mb-8 flex justify-center">
            <Toggle />
          </div>

          <div className={`grid gap-6 ${visiblePlans.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : visiblePlans.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {visiblePlans.map((plan) => renderCard(plan))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background-light font-display dark:bg-background-dark">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-background-light/90 px-5 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-background-dark/90">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-600 dark:text-slate-300">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Planes</h2>
        <div className="w-10" />
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="px-6 pb-4 pt-3 text-center">
          <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Elige tu nuevo plan</h1>
          <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Plan actual: {currentPlanName} · {currentBilling === 'annual' ? 'Anual' : 'Mensual'}
          </p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-3 px-6">
          <Toggle />
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ scrollPaddingInline: 'calc(50% - 36vw)' }}
          className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-[14vw] pb-6 pt-5 [perspective:1400px]"
        >
          {visiblePlans.map((plan, index) => renderCard(plan, true, index))}
        </div>

        <div className="mt-3 flex justify-center gap-2">
          {visiblePlans.map((plan, index) => (
            <div
              key={plan.key}
              className={`rounded-full transition-all duration-300 ${currentPage === index ? 'h-2 w-4 bg-primary' : 'h-2 w-2 bg-slate-200 dark:bg-slate-700'}`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
