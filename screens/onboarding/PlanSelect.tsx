import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { STRIPE_PRICES } from '../../constants/stripePrices';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

// Precios vinculados a Stripe — no modificar
const OFFICIAL_PLANS = {
  starter: { amount: 19.90, amountAnnual: 199, limit: 150, stripePriceId: STRIPE_PRICES.STARTER.MONTHLY, stripePriceIdAnnual: STRIPE_PRICES.STARTER.ANNUAL },
  pro: { amount: 39.90, amountAnnual: 399, limit: 400, stripePriceId: STRIPE_PRICES.PRO.MONTHLY, stripePriceIdAnnual: STRIPE_PRICES.PRO.ANNUAL },
  power: { amount: 99.00, amountAnnual: 990, limit: 1400, stripePriceId: STRIPE_PRICES.POWER.MONTHLY, stripePriceIdAnnual: STRIPE_PRICES.POWER.ANNUAL },
};

// ─── Icono de check SVG inline (sin dependencias externas) ──────────────────
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
    <circle cx="12" cy="12" r="12" fill="#10b981" opacity="0.15" />
    <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

const PlanSelect: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isAnnual, setIsAnnual] = useState(false);
  const [selected, setSelected] = useState<'starter' | 'pro' | 'power'>('pro');
  const [desktop, setDesktop] = useState(isDesktop());
  const isDark = theme === 'dark';

  // Responsive detection
  useEffect(() => {
    const handler = () => setDesktop(isDesktop());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ─── Mobile: scroll snap ───────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    setCurrentPage(Math.round(el.scrollLeft / (el.scrollWidth / 3)));
  };

  useEffect(() => {
    if (desktop) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: 'auto' });
    const t = setTimeout(() => el.scrollTo({ left: el.scrollWidth / 3, behavior: 'smooth' }), 500);
    return () => clearTimeout(t);
  }, [desktop]);

  // ─── Handler de selección ──────────────────────────────────────────────────
  const handleSelect = (planId: 'starter' | 'pro' | 'power') => {
    const cfg = OFFICIAL_PLANS[planId];
    localStorage.setItem('selected_plan', planId);
    localStorage.setItem('selected_plan_price', String(isAnnual ? cfg.amountAnnual : cfg.amount));
    localStorage.setItem('selected_plan_annual', String(isAnnual));
    localStorage.setItem('selected_plan_price_id', isAnnual ? cfg.stripePriceIdAnnual : cfg.stripePriceId);
    navigate(user ? '/onboarding/region' : '/login');
  };

  // ─── Toggle mensual/anual ──────────────────────────────────────────────────
  const Toggle = () => (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Mensual</span>
      <button
        onClick={() => setIsAnnual(!isAnnual)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isAnnual ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
      <span className={`text-sm font-bold transition-colors ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Anual</span>
      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 transition-all duration-200 ${isAnnual ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
        Ahorra 17%
      </span>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // ─── DESKTOP LAYOUT ───────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (desktop) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] dark:bg-background-dark font-display">
        <style>{`
          @keyframes floatBadge { from { transform: translateY(0); } to { transform: translateY(-5px); } }
        `}</style>

        {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
        <header className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center">
            <TelsimBrandLogo compact iconClassName="h-10 w-10 rounded-xl" textClassName="text-[1.65rem]" />
          </button>
          <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
            <span>¿Ya tienes cuenta?</span>
            <button onClick={() => navigate('/login')} className="font-bold text-primary hover:underline">Ingresar →</button>
          </div>
        </header>

        {/* ── BODY ────────────────────────────────────────────────────────── */}
        <main className="mx-auto w-full max-w-[1120px] px-8 py-7 xl:py-6">

          {/* Title */}
          <div className="mx-auto mb-6 w-full max-w-[1040px] text-center xl:mb-5">
            <h1 className="text-[36px] font-black text-slate-900 dark:text-white tracking-tight">Elige tu plan</h1>
          </div>

          {/* Toggle */}
          <div className="mx-auto mb-7 flex w-full max-w-[1040px] justify-center xl:mb-6">
            <Toggle />
          </div>

          {/* ── PLAN CARDS ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-6 items-start">

            {/* ── STARTER ── */}
            <button
              onClick={() => handleSelect('starter')}
              className={`group relative rounded-3xl p-7 border flex flex-col gap-5 cursor-pointer text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white
                ${isDark
                  ? `${selected === 'starter' ? 'border-slate-500 shadow-[0_18px_45px_-22px_rgba(15,23,42,0.95)]' : 'border-slate-800 hover:border-slate-700'} bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 hover:shadow-[0_28px_70px_-28px_rgba(15,23,42,1)]`
                  : `${selected === 'starter' ? 'border-2 border-slate-400 shadow-lg' : 'border-slate-200 hover:border-slate-300'} bg-white`}`}
            >
              <div className={`absolute -top-3 -right-3 w-32 h-32 rounded-full transition-colors ${isDark ? 'bg-slate-800/60 group-hover:bg-slate-700/70 blur-sm' : 'bg-slate-50 group-hover:bg-slate-100'}`} />
              {isDark && <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-slate-600/60 to-transparent" />}
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Starter</span>
                  <div className={`w-10 h-10 rounded-xl group-hover:scale-110 transition-all flex items-center justify-center ${isDark ? 'bg-slate-800 group-hover:bg-slate-700 ring-1 ring-slate-700/80' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="20" rx="2" stroke="#64748b" strokeWidth="2" /><rect x="7" y="4" width="10" height="4" rx="1" fill="#64748b" /></svg>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-full mb-5 ${isDark ? 'bg-slate-800 text-slate-200 ring-1 ring-slate-700/70 group-hover:bg-slate-700' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#64748b" strokeWidth="2" /></svg>
                  <span className={`text-[11px] font-black ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>150 Créditos SMS</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-[48px] font-black transition-colors leading-none ${isDark ? 'text-white group-hover:text-slate-100' : 'text-slate-900 group-hover:text-primary'}`}>
                    {isAnnual ? '$199' : '$19.90'}
                  </span>
                  <span className="text-slate-400 font-semibold text-sm">{isAnnual ? '/yr' : '/mo'}</span>
                </div>
                {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $39.80</p>}
              </div>
              <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-slate-700' : 'via-slate-200'} to-transparent`} />
              <div className="flex flex-col gap-2.5 flex-1">
                {(t('landing.pricing.features.starter') as any).map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckIcon />
                    <span className={`text-[13px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{f}</span>
                  </div>
                ))}
              </div>
              <div className={`transition-colors rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/90 ring-1 ring-slate-800/80 group-hover:bg-slate-800/90' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Ideal para</p>
                <p className={`text-[12px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t('landing.pricing.starter.desc')}</p>
              </div>
              <div className={`flex items-center justify-center gap-2 transition-colors pt-1 ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-400 group-hover:text-primary'}`}>
                <span className="text-[14px] font-black">Seleccionar plan</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><polyline points="12 5 19 12 12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </button>

            {/* ── PRO (destacado) ── */}
            <div className="relative -mt-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px z-10">
                <div className="bg-primary text-white text-[10px] font-black px-5 py-1.5 rounded-b-2xl shadow-lg tracking-widest whitespace-nowrap">
                  ⚡ MÁS POPULAR
                </div>
              </div>
              <button
                onClick={() => handleSelect('pro')}
                className="group relative w-full rounded-3xl p-7 border-2 border-primary flex flex-col gap-5 cursor-pointer text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_-10px_rgba(29,78,216,0.3)]"
                style={{ background: isDark ? 'linear-gradient(160deg,#071226 0%,#0b1730 52%,#08101f 100%)' : 'linear-gradient(160deg,#eff6ff 0%,#ffffff 50%)' }}
              >
                {isDark && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_28%)] pointer-events-none" />}
                <div className="relative pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black text-primary uppercase tracking-widest">Pro</span>
                    <div className={`w-10 h-10 rounded-xl group-hover:scale-110 transition-all flex items-center justify-center ${isDark ? 'bg-primary/15 ring-1 ring-primary/30 group-hover:bg-primary/20' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#1152d4" strokeWidth="2" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-full mb-5 ${isDark ? 'bg-primary/12 ring-1 ring-primary/25 text-blue-100 group-hover:bg-primary/18' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#1152d4" strokeWidth="2" /></svg>
                    <span className="text-[11px] font-black text-primary">400 Créditos SMS</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-[48px] font-black transition-colors leading-none ${isDark ? 'text-white group-hover:text-blue-100' : 'text-slate-900 group-hover:text-primary'}`}>
                      {isAnnual ? '$399' : '$39.90'}
                    </span>
                    <span className="text-slate-400 font-semibold text-sm">{isAnnual ? '/yr' : '/mo'}</span>
                  </div>
                  {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $79.80</p>}
                </div>
                <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-primary/35' : 'via-blue-200'} to-transparent`} />
                <div className="flex flex-col gap-2.5 flex-1">
                  {(t('landing.pricing.features.pro') as any).map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckIcon />
                      <span className={`text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{f}</span>
                    </div>
                  ))}
                </div>
                <div className={`transition-colors rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-950/55 ring-1 ring-primary/20 group-hover:bg-slate-950/70' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                  <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${isDark ? 'text-blue-200/55' : 'text-primary/50'}`}>Ideal para</p>
                  <p className={`text-[12px] font-bold ${isDark ? 'text-blue-100' : 'text-primary'}`}>{t('landing.pricing.pro.desc')}</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-primary transition-colors pt-1">
                  <span className="text-[14px] font-black">Seleccionar plan</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12" stroke="#1152d4" strokeWidth="2" strokeLinecap="round" /><polyline points="12 5 19 12 12 19" stroke="#1152d4" strokeWidth="2" strokeLinecap="round" /></svg>
                </div>
              </button>
            </div>

            {/* ── POWER ── */}
            <button
              onClick={() => handleSelect('power')}
              className="group relative rounded-3xl p-7 flex flex-col gap-5 cursor-pointer text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_-10px_rgba(245,166,35,0.4)]"
              style={{ border: '2px solid transparent', background: isDark ? 'linear-gradient(#0b1018,#0b1018) padding-box, linear-gradient(135deg,#F5A623,#F0C040) border-box' : 'linear-gradient(white,white) padding-box, linear-gradient(135deg,#F5A623,#F0C040) border-box' }}
            >
              {isDark && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.08),transparent_26%)] pointer-events-none" />}
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black uppercase tracking-widest" style={{ background: 'linear-gradient(90deg,#F5A623,#D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Power
                  </span>
                  <div className="w-10 h-10 rounded-xl group-hover:scale-110 transition-all flex items-center justify-center" style={{ background: isDark ? 'linear-gradient(135deg,rgba(245,166,35,0.18),rgba(250,204,21,0.12))' : 'linear-gradient(135deg,#FEF3C7,#FDE68A)', boxShadow: isDark ? 'inset 0 0 0 1px rgba(245,166,35,0.24)' : undefined }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#D97706" strokeWidth="2" strokeLinejoin="round" /></svg>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-5" style={{ background: isDark ? 'linear-gradient(135deg,rgba(245,166,35,0.18),rgba(250,204,21,0.12))' : 'linear-gradient(135deg,#FEF3C7,#FDE68A)', boxShadow: isDark ? 'inset 0 0 0 1px rgba(245,166,35,0.22)' : undefined }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#D97706" strokeWidth="2" /></svg>
                  <span className="text-[11px] font-black" style={{ color: '#D97706' }}>1,400 Créditos SMS</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-[48px] font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isAnnual ? '$990' : '$99.00'}
                  </span>
                  <span className="text-slate-400 font-semibold text-sm">{isAnnual ? '/yr' : '/mo'}</span>
                </div>
                {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $198.00</p>}
              </div>
              <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,#F5A623,transparent)' }} />
              <div className="flex flex-col gap-2.5 flex-1">
                {(t('landing.pricing.features.power') as any).map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckIcon />
                    <span className={`text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{f}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl px-4 py-3" style={{ background: isDark ? 'linear-gradient(135deg,rgba(120,53,15,0.32),rgba(51,35,8,0.55))' : 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', boxShadow: isDark ? 'inset 0 0 0 1px rgba(245,166,35,0.18)' : undefined }}>
                <p className="text-[9px] font-black uppercase tracking-wider mb-0.5" style={{ color: isDark ? '#FCD34D' : '#D97706', opacity: 0.7 }}>Ideal para</p>
                <p className="text-[12px] font-bold" style={{ color: isDark ? '#FEF3C7' : '#92400E' }}>{t('landing.pricing.power.desc')}</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-[14px] font-black group-hover:opacity-80 transition-opacity" style={{ background: 'linear-gradient(90deg,#F5A623,#D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Seleccionar plan
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" /><polyline points="12 5 19 12 12 19" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </button>

          </div>

          {/* Trust bar */}
          <div className={`mt-10 flex items-center justify-center gap-8 border-t pt-6 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            {[
              { icon: '🔒', text: 'Pago seguro SSL' },
              { icon: '💳', text: 'Stripe certificado' },
              { icon: '↩️', text: 'Cancela cuando quieras' },
              { icon: '🏆', text: '500+ empresas activas' },
            ].map(item => (
              <div key={item.text} className={`flex items-center gap-2 text-[12px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ─── MOBILE LAYOUT (original con scroll snap) ─────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display overflow-x-hidden">

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-600 dark:text-slate-300">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Planes</h2>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col pb-10">
        {/* Título */}
        <div className="text-center px-6 pt-3 pb-4">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Elige tu plan</h1>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-6 px-6">
          <Toggle />
        </div>

        {/* Cards — scroll horizontal */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ scrollPaddingInline: 'calc(50% - 35vw)' }}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pt-5 pb-6 px-[15vw] no-scrollbar [perspective:1400px]"
        >
          {/* STARTER */}
          <button
            onClick={() => { setSelected('starter'); handleSelect('starter'); }}
            className={`group relative rounded-3xl p-6 border flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-500 transform-gpu will-change-transform min-w-[70vw] snap-center shrink-0 bg-white dark:bg-surface-dark
              ${isDark
                ? `${selected === 'starter' ? 'border-slate-500 shadow-[0_18px_45px_-22px_rgba(15,23,42,0.95)]' : 'border-slate-800 hover:border-slate-700'} bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`
                : `${selected === 'starter' ? 'border-2 border-slate-400 shadow-lg' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'} bg-white`}
              ${currentPage === 0
                ? 'scale-[1.03] -translate-y-2 shadow-[0_28px_70px_-28px_rgba(15,23,42,0.45)]'
                : 'scale-[0.92] opacity-75 translate-y-3'}`}
            style={{ transformOrigin: 'center center' }}
          >
            <div className={`absolute -top-10 -right-10 w-36 h-36 rounded-full ${isDark ? 'bg-slate-800/70 blur-sm' : 'bg-slate-100/60'}`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Starter</span>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-5 ${isDark ? 'bg-slate-800 ring-1 ring-slate-700/80' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">150 Créditos SMS</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900 dark:text-white">{isAnnual ? '$199' : '$19.90'}</span>
                <span className="text-slate-400 font-semibold">{isAnnual ? '/yr' : '/mo'}</span>
              </div>
              {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $39.80</p>}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
            <div className="relative flex flex-col gap-2.5 flex-1">
              {(t('landing.pricing.features.starter') as any).map((f: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckIcon />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            <div className={`relative rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/90 ring-1 ring-slate-800/80' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Ideal para</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('landing.pricing.starter.desc')}</p>
            </div>
            <div className={`relative flex items-center justify-center gap-1.5 transition-colors pt-1 ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-400 group-hover:text-primary'}`}>
              <span className="text-sm font-black">Empezar gratis</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><polyline points="12 5 19 12 12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
          </button>

          {/* PRO */}
          <button
            onClick={() => { setSelected('pro'); handleSelect('pro'); }}
            className={`group relative rounded-3xl p-6 border-2 border-primary flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-500 transform-gpu will-change-transform min-w-[70vw] snap-center shrink-0
              ${currentPage === 1
                ? 'scale-[1.045] -translate-y-3 shadow-[0_30px_80px_-28px_rgba(29,78,216,0.38)]'
                : 'scale-[0.93] opacity-80 translate-y-3'}`}
            style={{ background: isDark ? 'linear-gradient(160deg,#071226 0%,#0b1730 52%,#08101f 100%)' : 'linear-gradient(160deg,#eff6ff 0%,#ffffff 50%)' }}
          >
            {isDark && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_28%)] pointer-events-none" />}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px">
              <div className="bg-primary text-white text-[10px] font-black px-5 py-1.5 rounded-b-2xl shadow-button tracking-widest whitespace-nowrap">⚡ MÁS POPULAR</div>
            </div>
            <div className="relative pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-primary uppercase tracking-widest">Pro</span>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-5 ${isDark ? 'bg-primary/12 ring-1 ring-primary/25' : 'bg-blue-100'}`}>
                <span className="text-[11px] font-black text-primary">400 Créditos SMS</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-5xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{isAnnual ? '$399' : '$39.90'}</span>
                <span className="text-slate-400 font-semibold">{isAnnual ? '/yr' : '/mo'}</span>
              </div>
              {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $79.80</p>}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent dark:via-primary/35" />
            <div className="relative flex flex-col gap-2.5 flex-1">
              {(t('landing.pricing.features.pro') as any).map((f: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckIcon />
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{f}</span>
                </div>
              ))}
            </div>
            <div className={`relative rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-950/55 ring-1 ring-primary/20' : 'bg-blue-50'}`}>
              <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${isDark ? 'text-blue-200/55' : 'text-primary/50'}`}>Ideal para</p>
              <p className={`text-xs font-bold ${isDark ? 'text-blue-100' : 'text-primary'}`}>{t('landing.pricing.pro.desc')}</p>
            </div>
            <div className={`relative flex items-center justify-center gap-1.5 pt-1 ${isDark ? 'text-blue-100' : 'text-primary'}`}>
              <span className="text-sm font-black">Empezar gratis</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke={isDark ? '#dbeafe' : '#1152d4'} strokeWidth="2" strokeLinecap="round" /><polyline points="12 5 19 12 12 19" stroke={isDark ? '#dbeafe' : '#1152d4'} strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
          </button>

          {/* POWER */}
          <button
            onClick={() => { setSelected('power'); handleSelect('power'); }}
            className={`group relative rounded-3xl p-6 flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-500 transform-gpu will-change-transform min-w-[70vw] snap-center shrink-0
              ${currentPage === 2
                ? 'scale-[1.03] -translate-y-2 shadow-[0_28px_70px_-28px_rgba(245,166,35,0.32)]'
                : 'scale-[0.92] opacity-75 translate-y-3'}`}
            style={{ border: '2px solid transparent', background: isDark ? 'linear-gradient(#0b1018,#0b1018) padding-box, linear-gradient(135deg,#F5A623,#F0C040) border-box' : 'linear-gradient(white,white) padding-box, linear-gradient(135deg,#F5A623,#F0C040) border-box' }}
          >
            {isDark && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.08),transparent_26%)] pointer-events-none" />}
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ background: 'linear-gradient(90deg,#F5A623,#D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Power</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-5" style={{ background: isDark ? 'linear-gradient(135deg,rgba(245,166,35,0.18),rgba(250,204,21,0.12))' : 'linear-gradient(135deg,#FEF3C7,#FDE68A)', boxShadow: isDark ? 'inset 0 0 0 1px rgba(245,166,35,0.22)' : undefined }}>
                <span className="text-[11px] font-black" style={{ color: '#D97706' }}>1,400 Créditos SMS</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-5xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{isAnnual ? '$990' : '$99.00'}</span>
                <span className="text-slate-400 font-semibold">{isAnnual ? '/yr' : '/mo'}</span>
              </div>
              {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $198.00</p>}
            </div>
            <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,#F5A623,transparent)' }} />
            <div className="relative flex flex-col gap-2.5 flex-1">
              {(t('landing.pricing.features.power') as any).map((f: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckIcon />
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{f}</span>
                </div>
              ))}
            </div>
            <div className="relative rounded-2xl px-4 py-3" style={{ background: isDark ? 'linear-gradient(135deg,rgba(120,53,15,0.32),rgba(51,35,8,0.55))' : 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', boxShadow: isDark ? 'inset 0 0 0 1px rgba(245,166,35,0.18)' : undefined }}>
              <p className="text-[9px] font-black uppercase tracking-wider mb-0.5" style={{ color: isDark ? '#FCD34D' : '#D97706', opacity: 0.7 }}>Ideal para</p>
              <p className="text-xs font-bold" style={{ color: isDark ? '#FEF3C7' : '#92400E' }}>{t('landing.pricing.power.desc')}</p>
            </div>
            <div className="relative flex items-center justify-center gap-1.5 pt-1">
              <span className="text-sm font-black group-hover:opacity-80" style={{ background: 'linear-gradient(90deg,#F5A623,#D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Empezar gratis</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" /><polyline points="12 5 19 12 12 19" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
          </button>
        </div>

        {/* Scroll dots */}
        <div className="flex justify-center gap-2 mt-3">
          {['starter', 'pro', 'power'].map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${currentPage === i ? 'w-4 h-2 bg-primary' : 'w-2 h-2 bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default PlanSelect;
