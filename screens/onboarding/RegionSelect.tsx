import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { STRIPE_PRICES } from '../../constants/stripePrices';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

const REGIONS = [
  { id: 'CL', name: 'Chile', flag: '🇨🇱', available: true },
  { id: 'AR', name: 'Argentina', flag: '🇦🇷', available: false },
  { id: 'PE', name: 'Perú', flag: '🇵🇪', available: false },
  { id: 'MX', name: 'México', flag: '🇲🇽', available: false },
  { id: 'CO', name: 'Colombia', flag: '🇨🇴', available: false },
  { id: 'BR', name: 'Brasil', flag: '🇧🇷', available: false },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPlanName(): string {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const parts = hash.split('?');
    if (parts[1]) {
      const params = new URLSearchParams(parts[1]);
      const planFromHash = params.get('plan');
      if (planFromHash) {
        return planFromHash.toLowerCase();
      }
    }
  }
  const raw = localStorage.getItem('selected_plan') || 'pro';
  try { const p = JSON.parse(raw); return (p.planId || p.id || p.plan || raw).toLowerCase(); }
  catch { return raw.toLowerCase(); }
}

const PLAN_COLORS: Record<string, { border: string; badge: string; text: string }> = {
  starter: { border: '#3b82f6', badge: '#dbeafe', text: '#1d4ed8' },
  pro: { border: '#8b5cf6', badge: '#ede9fe', text: '#6d28d9' },
  power: { border: '#f59e0b', badge: '#fef3c7', text: '#b45309' },
};

// ─── Step Indicator ──────────────────────────────────────────────────────────
const Step = ({ num, label, active, done }: { num: number; label: string; active?: boolean; done?: boolean }) => (
  <div className="flex items-center gap-2.5">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-all ${done ? 'bg-emerald-400 text-white' :
      active ? 'bg-white text-primary' :
        'bg-white/10 text-white/40'
      }`}>
      {done ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : num}
    </div>
    <span className={`text-[12px] font-semibold ${active ? 'text-white' : done ? 'text-white/70' : 'text-white/30'}`}>{label}</span>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const RegionSelect: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string>('CL');
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
      .update({ onboarding_step: ONBOARDING_STEPS.REGION })
      .eq('id', user.id);
  }, [user?.id]);

  const planId = getPlanName();
  const pc = PLAN_COLORS[planId] ?? PLAN_COLORS.starter;
  const planLabel = planId.charAt(0).toUpperCase() + planId.slice(1);

  const handleContinue = () => {
    // Persistimos para que Payment.tsx pueda reconstruir la región si se pierde location.state.
    try { localStorage.setItem('selected_region', selected); } catch {}

    const isAnnual = localStorage.getItem('selected_plan_annual') === 'true';
    const planNames: Record<string, string> = { starter: 'Starter', pro: 'Pro', power: 'Power' };
    const limits: Record<string, number> = { starter: 150, pro: 400, power: 1400 };
    const monthlyPrices: Record<string, number> = { starter: 19.90, pro: 39.90, power: 99.00 };
    const annualPrices: Record<string, number> = { starter: 199, pro: 399, power: 990 };
    const monthlyIds: Record<string, string> = {
      starter: STRIPE_PRICES.STARTER.MONTHLY,
      pro: STRIPE_PRICES.PRO.MONTHLY,
      power: STRIPE_PRICES.POWER.MONTHLY,
    };
    const annualIds: Record<string, string> = {
      starter: STRIPE_PRICES.STARTER.ANNUAL,
      pro: STRIPE_PRICES.PRO.ANNUAL,
      power: STRIPE_PRICES.POWER.ANNUAL,
    };

    // Prefer saved price (may have been set correctly by PlanSelect or Landing)
    const savedPrice = parseFloat(localStorage.getItem('selected_plan_price') || '0');
    const savedPriceId = localStorage.getItem('selected_plan_price_id') || '';

    const resolvedPlanName = planNames[planId] || 'Starter';
    const resolvedPrice = savedPrice || (isAnnual ? (annualPrices[planId] || 19.90) : (monthlyPrices[planId] || 19.90));
    const resolvedPriceId = savedPriceId || (isAnnual ? (annualIds[planId] || annualIds.starter) : (monthlyIds[planId] || monthlyIds.starter));
    const resolvedLimit = limits[planId] || 150;

    navigate('/onboarding/summary', {
      state: {
        planName: resolvedPlanName,
        price: resolvedPrice,
        isAnnual,
        monthlyLimit: resolvedLimit,
        stripePriceId: resolvedPriceId,
        region: selected,
      }
    });
  };

  // ─── Region button shared ──────────────────────────────────────────────────
  const RegionBtn = ({ reg, compact = false }: { reg: typeof REGIONS[0]; compact?: boolean }) => (
    <button
      key={reg.id}
      disabled={!reg.available}
      onClick={() => reg.available && setSelected(reg.id)}
      className={`flex flex-col items-center justify-center gap-2 ${compact ? 'p-3' : 'p-4'} rounded-2xl border-2 transition-all relative overflow-hidden ${!reg.available
        ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-40 cursor-not-allowed'
        : selected === reg.id
          ? 'border-primary bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-200'
        }`}
    >
      {!reg.available && (
        <span className="absolute top-0 right-0 bg-slate-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg uppercase tracking-tighter">Pronto</span>
      )}
      <span className={`${compact ? 'text-2xl' : 'text-3xl'} ${!reg.available ? 'grayscale' : ''}`}>{reg.flag}</span>
      <span className={`${compact ? 'text-[11px]' : 'text-[13px]'} font-bold ${!reg.available ? 'text-slate-400' :
        selected === reg.id ? 'text-primary' : 'text-slate-800 dark:text-white'
        }`}>{reg.name}</span>
    </button>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // ─── DESKTOP LAYOUT ───────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (desktop) {
    return (
      <div className="min-h-screen flex font-display">
        <style>{`
          @keyframes float { from { transform: translateY(0); } to { transform: translateY(-8px); } }
          @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        `}</style>

        {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
        <div
          className="hidden lg:flex flex-col w-[420px] flex-shrink-0 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #060d1f 0%, #0a1628 40%, #0f1f3d 70%, #0c1832 100%)' }}
        >
          <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #1152d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)' }} />

          <div className="relative z-10 flex h-full flex-col px-10 pt-8 pb-10">
            {/* Logo */}
            <div className="flex min-h-[64px] items-center">
              <TelsimBrandLogo
                compact
                iconClassName="h-10 w-10 rounded-xl"
                textClassName="text-[1.65rem] text-white"
              />
            </div>

            {/* Plan badge */}
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-xl px-3 py-2 self-start"
              style={{ background: pc.badge + '25', border: `1px solid ${pc.border}40` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: pc.border }} />
              <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: pc.border }}>
                Plan {planLabel}
              </span>
            </div>

            {/* Step indicators */}
            <div className="mt-10 flex flex-col gap-4">
              <Step num={1} label="Selecciona tu plan" done />
              <div className="ml-3.5 w-px h-5 bg-white/10" />
              <Step num={2} label="Elige tu región" active />
              <div className="ml-3.5 w-px h-5 bg-white/10" />
              <Step num={3} label="Activa tu SIM" />
            </div>

            {/* Globe illustration */}
            <div className="mt-10 flex-1 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44">
                {/* Animated ring */}
                <div className="absolute inset-0 rounded-full border border-white/10 scale-110" />
                <div className="absolute inset-0 rounded-full border border-white/5 scale-125" />
                <div className="w-44 h-44 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(17,82,212,0.12)', border: '1px solid rgba(17,82,212,0.2)' }}>
                  <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="3" fill="#1152d4" />
                    <circle cx="12" cy="12" r="5" fill="none" stroke="#1152d4" strokeWidth="1" opacity="0.4" />
                  </svg>
                </div>
                {/* Floating flags */}
                <div className="absolute -top-2 right-4 bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/10"
                  style={{ animation: 'float 3s ease-in-out infinite alternate' }}>
                  <span className="text-xl">🇨🇱</span>
                </div>
                <div className="absolute bottom-0 left-2 bg-white/5 rounded-xl p-1.5 border border-white/5 opacity-40">
                  <span className="text-lg">🇲🇽</span>
                </div>
              </div>
            </div>

            {/* Bottom copy */}
            <div className="mt-auto">
              <p className="text-white/70 text-[13px] font-medium leading-relaxed">
                "Nuestras SIMs físicas en Chile están en el mismo rack que los servidores de los operadores."
              </p>
              <div className="flex items-center gap-6 mt-5 pt-5 border-t border-white/10">
                {[['99.9%', 'Uptime'], ['<2s', 'Latencia'], ['30+', 'Países']].map(([v, l]) => (
                  <div key={l} className="text-center">
                    <p className="text-white text-[16px] font-black">{v}</p>
                    <p className="text-white/40 text-[10px]">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
        <div className="flex-1 bg-[#F0F4F8] dark:bg-background-dark flex flex-col">

          {/* Nav */}
          <div className="flex items-center justify-between px-10 pt-8 pb-0">
            <button
              onClick={() => navigate('/onboarding/plan')}
              className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors text-[12px] font-semibold"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Cambiar plan
            </button>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1">
              Paso 2 de 3
            </span>
          </div>

          {/* Form */}
          <div className="flex-1 flex items-center justify-center px-10 py-8">
            <div className="w-full max-w-[520px]">

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-[32px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Elige tu región
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-[14px] mt-2 leading-relaxed">
                  Selecciona el país donde necesitas un número real. Argentina, México, Brasil y más estarán disponibles próximamente.
                </p>
              </div>

              {/* Region grid — 3 columns showing all */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {REGIONS.map(reg => <RegionBtn key={reg.id} reg={reg} compact />)}
              </div>

              {/* Selected summary */}
              {selected && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl flex items-center gap-3">
                  <span className="text-2xl">{REGIONS.find(r => r.id === selected)?.flag}</span>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">{REGIONS.find(r => r.id === selected)?.name} seleccionado</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Recibirás un número local real de ese país</p>
                  </div>
                  <div className="ml-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" style={{ animation: 'pulse-dot 2s infinite' }} />
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleContinue}
                className="w-full h-14 bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-black text-[15px] rounded-2xl flex items-center justify-between px-5"
              >
                <span />
                <span>Continuar</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-4">
                🔒 Tus datos están protegidos con cifrado SSL 256-bit
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ─── MOBILE LAYOUT (original) ─────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 p-6 pt-8 font-display">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <button onClick={() => navigate('/onboarding/plan')} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8 -mt-10">
        <div className="relative w-48 h-48 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 ring-1 ring-blue-100 dark:ring-slate-700">
          <div className="absolute inset-0 rounded-full border border-blue-100/50 scale-125" />
          <div className="absolute top-0 right-10 bg-white dark:bg-slate-700 p-2 rounded-xl shadow-lg" style={{ animation: 'float 3s ease-in-out infinite alternate' }}>
            <span className="text-xl">🇨🇱</span>
          </div>
          <div className="absolute bottom-4 left-6 bg-white dark:bg-slate-700 p-2 rounded-xl shadow-lg opacity-40">
            <span className="text-xl">🇦🇷</span>
          </div>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#1152d4" strokeWidth="1.5" opacity="0.3" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#1152d4" strokeWidth="1.5" opacity="0.3" />
            <circle cx="12" cy="12" r="3" fill="#1152d4" />
          </svg>
          <div className="absolute top-1/3 left-1/3 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        </div>

        <div className="space-y-4 max-w-xs">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('onboarding.step1_title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px] leading-relaxed">
            {t('onboarding.step1_desc')}
          </p>
        </div>

        <div className="w-full grid grid-cols-3 gap-3 mt-4">
          {REGIONS.slice(0, 3).map(reg => <RegionBtn key={reg.id} reg={reg} />)}
        </div>
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={handleContinue}
          className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl flex items-center justify-between px-2"
        >
          <div className="w-12" />
          <span className="text-[17px] tracking-wide uppercase font-bold">{t('onboarding.next')}</span>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </button>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 font-medium">
          {t('onboarding.step_of', { current: 1, total: 3 })}
        </p>
      </div>
    </div>
  );
};

export default RegionSelect;
