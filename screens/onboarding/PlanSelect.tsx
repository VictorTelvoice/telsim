import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

// Precios vinculados a Stripe — no modificar
const OFFICIAL_PLANS = {
  starter: { amount: 19.90, amountAnnual: 199, limit: 150, stripePriceId: 'price_1SzJRLEADSrtMyiaQaDEp44E' },
  pro:     { amount: 39.90, amountAnnual: 399, limit: 400, stripePriceId: 'price_1SzJS9EADSrtMyiagxHUI2qM' },
  power:   { amount: 99.00, amountAnnual: 990, limit: 1400, stripePriceId: 'price_1SzJSbEADSrtMyiaPEMzNKUe' },
};

const PlanSelect: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isAnnual, setIsAnnual] = useState(false);
  const [selected, setSelected] = useState<'starter' | 'pro' | 'power'>('pro');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1); // pro = center = index 1

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    setCurrentPage(Math.round(el.scrollLeft / (el.scrollWidth / 3)));
  };

  // Animación Starter → PRO al abrir la pantalla (igual que en el landing)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (window.innerWidth >= 768) {
      // Desktop: centrar en PRO sin animación
      el.scrollTo({ left: el.scrollWidth / 3, behavior: 'auto' });
    } else {
      // Móvil: posicionar en Starter y deslizar suavemente al PRO
      el.scrollTo({ left: 0, behavior: 'auto' });
      const timer = setTimeout(() => {
        el.scrollTo({ left: el.scrollWidth / 3, behavior: 'smooth' });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSelectAndContinue = (planId: 'starter' | 'pro' | 'power') => {
    const planConfig = OFFICIAL_PLANS[planId];
    localStorage.setItem('selected_plan', planId);
    localStorage.setItem('selected_plan_price', String(isAnnual ? planConfig.amountAnnual : planConfig.amount));
    localStorage.setItem('selected_plan_annual', String(isAnnual));
    localStorage.setItem('selected_plan_price_id', planConfig.stripePriceId);
    navigate('/onboarding/region');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display overflow-x-hidden">

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-rounded text-slate-600 dark:text-slate-300 text-[22px]">arrow_back</span>
        </button>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Planes</h2>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col pb-10">

        {/* Título */}
        <div className="text-center px-6 pt-3 pb-4">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Elige tu plan</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
            {t('landing.pricing.subtitle')}
          </p>
        </div>

        {/* Toggle anual/mensual */}
        <div className="flex items-center justify-center gap-3 mb-6 px-6">
          <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            Mensual
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isAnnual ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-bold transition-colors ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            Anual
          </span>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 transition-all duration-200 ${isAnnual ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            Ahorra 17%
          </span>
        </div>

        {/* Cards — scroll horizontal en mobile, grid en desktop */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pt-4 pb-4 -mx-6 px-6 no-scrollbar md:grid md:grid-cols-3 md:overflow-x-visible md:mx-6 md:px-0"
        >

          {/* ── STARTER ── */}
          <button
            onClick={() => { setSelected('starter'); handleSelectAndContinue('starter'); }}
            className={`group relative rounded-3xl p-6 border flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl min-w-[78vw] md:min-w-0 snap-center shrink-0 md:shrink
              ${selected === 'starter'
                ? 'border-2 border-slate-400 shadow-lg bg-white dark:bg-surface-dark'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark hover:border-slate-400'
              }`}
          >
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-slate-100/60 group-hover:bg-slate-100 transition-colors duration-300 dark:bg-slate-800/40" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-slate-50 group-hover:bg-slate-100/80 transition-colors dark:bg-slate-800/20" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('landing.pricing.starter.name')}</span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 group-hover:scale-110 transition-all flex items-center justify-center">
                  <span className="material-symbols-rounded text-slate-500 text-[18px]">sim_card</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 transition-colors px-3 py-1.5 rounded-full mb-5">
                <span className="material-symbols-rounded text-slate-500 text-[13px]">sms</span>
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">{t('landing.pricing.starter.credits')}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors duration-300">
                  {isAnnual ? '$199' : '$19.90'}
                </span>
                <span className="text-slate-400 font-semibold">{isAnnual ? '/yr' : '/mo'}</span>
              </div>
              {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $39.80</p>}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
            <div className="relative flex flex-col gap-2.5 flex-1">
              {(t('landing.pricing.features.starter') as any).map((f: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="material-symbols-rounded text-emerald-500 text-[15px] mt-0.5 shrink-0">check_circle</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            <div className="relative bg-slate-50 dark:bg-slate-800 group-hover:bg-slate-100 transition-colors rounded-2xl px-4 py-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t('common.learn_more')}</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('landing.pricing.starter.desc')}</p>
            </div>
            <div className="relative flex items-center justify-center gap-1.5 text-slate-400 group-hover:text-primary transition-colors pt-1">
              <span className="text-sm font-black">Seleccionar</span>
              <span className="material-symbols-rounded text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </button>

          {/* ── PRO ── */}
          <button
            onClick={() => { setSelected('pro'); handleSelectAndContinue('pro'); }}
            className="group relative rounded-3xl p-6 border-2 border-primary flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_-10px_rgba(29,78,216,0.3)] min-w-[78vw] md:min-w-0 snap-center shrink-0 md:shrink"
            style={{ background: 'linear-gradient(160deg,#eff6ff 0%,#ffffff 50%)' }}
          >
            {/* Badge más popular */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px">
              <div className="bg-primary text-white text-[10px] font-black px-5 py-1.5 rounded-b-2xl shadow-button tracking-widest whitespace-nowrap">
                {t('landing.pricing.pro.badge')}
              </div>
            </div>
            <div className="relative pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-primary uppercase tracking-widest">{t('landing.pricing.pro.name')}</span>
                <div className="w-9 h-9 rounded-xl bg-blue-100 group-hover:bg-blue-200 group-hover:scale-110 transition-all flex items-center justify-center">
                  <span className="material-symbols-rounded text-primary text-[18px]">rocket_launch</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-blue-100 group-hover:bg-blue-200 transition-colors px-3 py-1.5 rounded-full mb-5">
                <span className="material-symbols-rounded text-primary text-[13px]">sms</span>
                <span className="text-[11px] font-black text-primary">{t('landing.pricing.pro.credits')}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900 group-hover:text-primary transition-colors duration-300">
                  {isAnnual ? '$399' : '$39.90'}
                </span>
                <span className="text-slate-400 font-semibold">{isAnnual ? '/yr' : '/mo'}</span>
              </div>
              {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $79.80</p>}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
            <div className="relative flex flex-col gap-2.5 flex-1">
              {(t('landing.pricing.features.pro') as any).map((f: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="material-symbols-rounded text-emerald-500 text-[15px] mt-0.5 shrink-0">check_circle</span>
                  <span className="text-xs font-semibold text-slate-700">{f}</span>
                </div>
              ))}
            </div>
            <div className="relative bg-blue-50 group-hover:bg-blue-100 transition-colors rounded-2xl px-4 py-3">
              <p className="text-[9px] font-black text-primary/50 uppercase tracking-wider mb-0.5">{t('common.learn_more')}</p>
              <p className="text-xs font-bold text-primary">{t('landing.pricing.pro.desc')}</p>
            </div>
            <div className="relative flex items-center justify-center gap-1.5 text-primary pt-1">
              <span className="text-sm font-black">Seleccionar</span>
              <span className="material-symbols-rounded text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </button>

          {/* ── POWER ── */}
          <button
            onClick={() => { setSelected('power'); handleSelectAndContinue('power'); }}
            className="group relative rounded-3xl p-6 flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_-10px_rgba(245,166,35,0.4)] min-w-[78vw] md:min-w-0 snap-center shrink-0 md:shrink"
            style={{ border: '2px solid transparent', background: 'linear-gradient(white,white) padding-box, linear-gradient(135deg,#F5A623,#F0C040) border-box' }}
          >
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ background: 'linear-gradient(90deg,#F5A623,#D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {t('landing.pricing.power.name')}
                </span>
                <div className="w-9 h-9 rounded-xl group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(245,166,35,0.5)] transition-all flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' }}>
                  <span className="material-symbols-rounded text-[18px]" style={{ color: '#D97706' }}>workspace_premium</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-5" style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' }}>
                <span className="material-symbols-rounded text-[13px]" style={{ color: '#D97706' }}>sms</span>
                <span className="text-[11px] font-black" style={{ color: '#D97706' }}>{t('landing.pricing.power.credits')}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900 transition-colors duration-300">
                  {isAnnual ? '$990' : '$99.00'}
                </span>
                <span className="text-slate-400 font-semibold">{isAnnual ? '/yr' : '/mo'}</span>
              </div>
              {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $198.00</p>}
            </div>
            <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,#F5A623,transparent)' }} />
            <div className="relative flex flex-col gap-2.5 flex-1">
              {(t('landing.pricing.features.power') as any).map((f: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="material-symbols-rounded text-emerald-500 text-[15px] mt-0.5 shrink-0">check_circle</span>
                  <span className="text-xs font-semibold text-slate-700">{f}</span>
                </div>
              ))}
            </div>
            <div className="relative rounded-2xl px-4 py-3" style={{ background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)' }}>
              <p className="text-[9px] font-black uppercase tracking-wider mb-0.5" style={{ color: '#D97706', opacity: 0.7 }}>{t('common.learn_more')}</p>
              <p className="text-xs font-bold" style={{ color: '#92400E' }}>{t('landing.pricing.power.desc')}</p>
            </div>
            <div className="relative flex items-center justify-center gap-1.5 pt-1">
              <span className="text-sm font-black group-hover:opacity-80 transition-opacity" style={{ background: 'linear-gradient(90deg,#F5A623,#D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Seleccionar
              </span>
              <span className="material-symbols-rounded text-[18px] group-hover:translate-x-1 transition-transform" style={{ color: '#F5A623' }}>arrow_forward</span>
            </div>
          </button>

        </div>

        {/* Scroll dots (mobile) */}
        <div className="flex justify-center gap-2 mt-3 md:hidden">
          {['starter', 'pro', 'power'].map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${currentPage === i ? 'w-4 h-2 bg-primary' : 'w-2 h-2 bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>
      </main>

    </div>
  );
};

export default PlanSelect;
