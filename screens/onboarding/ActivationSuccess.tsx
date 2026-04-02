import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

interface ActivationData {
  phoneNumber: string;
  planName: string;
  amount: number;
  currency: string;
  monthlyLimit: number;
  isAnnual?: boolean;
  activationState?: string | null;
  nextBillingDate?: string | null;
}

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;
const isMobileDeviceUA = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// ─── Plan pricing catalogue ───────────────────────────────────────────────────
const PLAN_CATALOGUE: Record<string, { monthly: number; annual: number; limit: number }> = {
  Starter: { monthly: 19.90, annual: 199, limit: 150 },
  Pro:     { monthly: 39.90, annual: 399, limit: 400 },
  Power:   { monthly: 99.00, annual: 990, limit: 1400 }
};

const ActivationSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<ActivationData | null>(null);
  const [copied, setCopied] = useState(false);
  const [desktop, setDesktop] = useState(isDesktop());
  const dashboardDestination = isMobileDeviceUA() ? '/dashboard' : '/web';
  const billingDestination = isMobileDeviceUA() ? '/dashboard/billing' : '/web';

  useEffect(() => {
    const handler = () => setDesktop(isDesktop());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const sessionId = new URLSearchParams(location.search).get('session_id');

  const isAnnualCycle = data?.isAnnual === true;
  const nextBillingDate = (() => {
    if (data?.nextBillingDate) return new Date(data.nextBillingDate);
    const base = new Date();
    if (isAnnualCycle) {
      base.setFullYear(base.getFullYear() + 1);
    } else {
      base.setMonth(base.getMonth() + 1);
    }
    return base;
  })();
  const followingRenewal = new Date(nextBillingDate);
  if (isAnnualCycle) {
    followingRenewal.setFullYear(followingRenewal.getFullYear() + 1);
  } else {
    followingRenewal.setMonth(followingRenewal.getMonth() + 1);
  }

  const fmt = (d: Date) => d.toLocaleDateString(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });

  const formatPhone = (num: string) => {
    if (!num) return '— — — — — —';
    const c = num.replace(/\D/g, '');
    if (c.startsWith('569') && c.length === 11) return `+56 9 ${c.substring(3,7)} ${c.substring(7)}`;
    return num.startsWith('+') ? num : `+${num}`;
  };

  const getPlanColors = (plan: string) => {
    const p = (plan || '').toUpperCase();
    if (p.includes('POWER')) return { accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.08)', accentBorder: 'rgba(245,158,11,0.2)', accentClass: 'text-amber-500' };
    if (p.includes('PRO'))   return { accent: '#1d4ed8', accentBg: 'rgba(29,78,216,0.1)',   accentBorder: 'rgba(29,78,216,0.25)',  accentClass: 'text-blue-600' };
    return                          { accent: '#10b981', accentBg: 'rgba(16,185,129,0.08)', accentBorder: 'rgba(16,185,129,0.2)',  accentClass: 'text-emerald-500' };
  };

  useEffect(() => {
    const load = async () => {
      if (location.state?.phoneNumber) {
        setData(location.state as ActivationData);
        return;
      }
      if (user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('phone_number, plan_name, amount, currency, monthly_limit, billing_type, activation_state, next_billing_date')
          .eq('stripe_session_id', sessionId)
          .maybeSingle();
        if (sub) {
          setData({
            phoneNumber: sub.phone_number,
            planName: sub.plan_name,
            amount: sub.amount,
            currency: sub.currency,
            monthlyLimit: sub.monthly_limit,
            isAnnual: sub.billing_type === 'annual',
            activationState: sub.activation_state,
            nextBillingDate: sub.next_billing_date,
          });
        }
      }
    };
    load();
  }, [user, sessionId]);

  useEffect(() => {
    if (!user?.id) return;
    const patch: Record<string, string> = { onboarding_step: ONBOARDING_STEPS.ACTIVATION_SUCCESS };
    if (sessionId) patch.onboarding_checkout_session_id = sessionId;
    void supabase.from('users').update(patch).eq('id', user.id);
  }, [user?.id, sessionId]);

  useEffect(() => {
    if (!user?.id || !data || data.activationState !== 'on_air') return;
    void supabase
      .from('users')
      .update({
        onboarding_completed: true,
        onboarding_step: ONBOARDING_STEPS.COMPLETED,
        onboarding_checkout_session_id: null,
      })
      .eq('id', user.id);
  }, [user?.id, data?.activationState]);

  if (!data) return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
      <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (data.activationState && data.activationState !== 'on_air') {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-8 text-center">
        <div>
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Sincronizando...</h3>
          <p className="text-sm font-medium text-slate-500 max-w-[36ch] mx-auto">
            Estamos esperando confirmación operativa real del servicio.
          </p>
        </div>
      </div>
    );
  }

  const colors = getPlanColors(data.planName);

  // Get correct price based on isAnnual
  const planCfg = PLAN_CATALOGUE[data.planName] || PLAN_CATALOGUE.Pro;
  const displayPrice = data.isAnnual ? planCfg.annual : (data.amount || planCfg.monthly);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(formatPhone(data.phoneNumber));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // ──────────────────────────────────────────────────────────────────────────
  if (desktop) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] dark:bg-background-dark font-display flex flex-col">
        {/* Glow */}
        <div style={{ position:'fixed', top:'-100px', left:'50%', transform:'translateX(-50%)', width:'700px', height:'500px', borderRadius:'50%', background:`radial-gradient(circle, ${colors.accent}, transparent)`, filter:'blur(100px)', opacity:0.1, pointerEvents:'none', zIndex:0 }} />

        {/* Top nav */}
        <header className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between relative z-10">
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
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            Resumen
            <span className="mx-1 text-slate-200">·</span>
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">¡Activado!</span>
          </div>
          <div className="w-20" />
        </header>

        {/* Body */}
        <div className="flex-1 flex items-start justify-center px-8 py-12 relative z-10">
          <div className="w-full max-w-3xl">

            {/* Hero success */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-5">
                <div style={{ position:'absolute', inset:0, borderRadius:'22px', border:`2px solid ${colors.accentBorder}`, animation:'ping 2s ease-out infinite', pointerEvents:'none' }} />
                <div className="bg-white dark:bg-slate-900 relative z-10" style={{ width:'76px', height:'76px', borderRadius:'22px', border:`1.5px solid ${colors.accentBorder}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: colors.accentBg, border: `1px solid ${colors.accentBorder}` }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: colors.accent, animation:'pulse 1.8s ease-in-out infinite' }} />
                <span style={{ fontSize:'10px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em', color: colors.accent }}>Línea Activada</span>
              </div>

              <h1 className="text-[38px] font-black text-slate-900 dark:text-white tracking-tight mb-2">¡Activación Completa!</h1>
              <p className="text-slate-500 dark:text-slate-400 text-[15px] font-medium">Tu SIM física está operativa y lista para su uso.</p>
            </div>

            {/* 2-col grid */}
            <div className="grid grid-cols-5 gap-6">

              {/* Left: número + detalles */}
              <div className="col-span-3 flex flex-col gap-4">

                {/* Número SIM */}
                <button
                  onClick={handleCopyPhone}
                  className="bg-white dark:bg-slate-900 rounded-3xl border-2 p-6 flex flex-col items-center cursor-pointer hover:shadow-md transition-all w-full"
                  style={{ borderColor: colors.accentBorder }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tu Número SIM</span>
                  </div>
                  <span className="text-[32px] font-black text-slate-900 dark:text-white tracking-wider font-mono mb-2">{formatPhone(data.phoneNumber)}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: copied ? colors.accent : '#94a3b8' }}>
                    {copied ? '✓ Copiado al portapapeles' : 'Click para copiar'}
                  </span>
                </button>

                {/* Plan + Precio grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Plan</span>
                    </div>
                    <p className="text-[20px] font-black uppercase tracking-tight mb-1" style={{ color: colors.accent }}>{data.planName}</p>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{data.monthlyLimit} Créditos SMS / mes</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Precio</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-[20px] font-black text-slate-900 dark:text-white">${displayPrice > 0 ? displayPrice.toFixed(2) : '—'}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{isAnnualCycle ? '/año' : '/mes'}</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Servicio prepago</p>
                  </div>
                </div>

                {/* Shield note */}
                <div className="rounded-2xl p-4 flex gap-3" style={{ background: colors.accentBg, border: `1px solid ${colors.accentBorder}` }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:'2px' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                    Servicio prepago con cobro inmediato. Si no cumple lo esperado y hubo un uso legítimo, nuestro equipo puede revisar un reembolso del 100%.
                  </p>
                </div>
              </div>

              {/* Right: billing timeline + CTA */}
              <div className="col-span-2 flex flex-col gap-4">

                {/* Timeline */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Ciclo de Facturación</span>
                  </div>
                  {[
                    { dot:'#10b981', label:'HOY — ACTIVACIÓN', desc:`$${displayPrice > 0 ? displayPrice.toFixed(2) : '—'} cobrado · Servicio operativo`, color:'#10b981', line:true },
                    { dot:colors.accent, label:fmt(nextBillingDate).toUpperCase(), desc:`Próxima renovación · $${displayPrice > 0 ? displayPrice.toFixed(2) : '—'} ${(data.currency||'USD').toUpperCase()}`, color:colors.accent, line:true },
                    { dot:'rgba(148,163,184,0.4)', label:fmt(followingRenewal).toUpperCase(), desc:`Renovación recurrente · cada ${isAnnualCycle ? '12 meses' : '30 días'}`, color:'#94a3b8', line:false },
                  ].map((row, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center w-3 shrink-0 pt-1">
                        <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:row.dot, flexShrink:0 }} />
                        {row.line && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1.5 min-h-[20px]" />}
                      </div>
                      <div className={row.line ? 'pb-4' : ''}>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color:row.color }}>{row.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{row.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <button
                  onClick={() => navigate(dashboardDestination)}
                  className="w-full h-14 bg-primary hover:bg-blue-700 text-white font-black text-[14px] uppercase tracking-wide rounded-2xl flex items-center justify-between px-5 transition-all active:scale-[0.98]"
                >
                  <span />
                  <span>Ir al Dashboard</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>

                <button
                  onClick={() => navigate(billingDestination)}
                  className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white font-bold text-[12px] uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  Ver Facturación
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes ping { 0%{transform:scale(1);opacity:0.5;} 80%,100%{transform:scale(1.9);opacity:0;} }
          @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        `}</style>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      <div
        className="pointer-events-none fixed left-1/2 top-[-60px] z-0 h-[380px] w-[500px] -translate-x-1/2 rounded-full blur-[80px]"
        style={{ background: `radial-gradient(circle, ${colors.accent}, transparent)`, opacity: 0.12 }}
      />

      <header className="grid grid-cols-[40px_1fr_40px] items-center gap-3 px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-10 h-10 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-[#1e3a8a] dark:text-blue-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          aria-label="Ir al inicio"
        >
          <span className="material-icons-round text-[20px]">home</span>
        </button>
        <h1 className="text-center text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
          Activacion
        </h1>
        <div className="w-10" />
      </header>

      <main className="relative z-10 px-5 py-4 space-y-5 pb-10 max-w-lg mx-auto">
        <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border"
              style={{ background: colors.accentBg, borderColor: colors.accentBorder }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: colors.accent }} />
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: colors.accent }}>
                Activo
              </span>
            </div>
            <button
              onClick={handleCopyPhone}
              className="size-8 rounded-lg items-center justify-center text-white flex shadow-sm hover:scale-110 active:scale-95 transition-transform"
              style={{ background: colors.accent }}
              aria-label={copied ? 'Numero copiado' : 'Copiar numero'}
            >
              <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'content_copy'}</span>
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="mb-2 flex items-center justify-center gap-2">
              <div
                className="size-8 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm"
                style={{ borderColor: colors.accentBorder, boxShadow: `0 8px 20px ${colors.accentBg}` }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Tu linea activa
              </p>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatPhone(data.phoneNumber)}
            </h2>
            <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Tu SIM ya esta operativa y lista para recibir SMS.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/dashboard/numbers')}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold py-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span className="material-icons-round text-lg">sim_card</span>
              <span>Mis Lineas</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="bg-primary hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span className="material-icons-round text-lg">credit_card</span>
              <span>Facturacion</span>
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-2">
              Plan
            </p>
            <p className="text-[18px] font-black uppercase tracking-tight mb-1" style={{ color: colors.accent }}>
              {data.planName}
            </p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {data.monthlyLimit} Creditos SMS
            </p>
          </div>
          <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-2">
              Facturacion
            </p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[18px] font-black text-slate-900 dark:text-white">
                ${displayPrice > 0 ? displayPrice.toFixed(2) : '—'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {isAnnualCycle ? '/ano' : '/mes'}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Servicio prepago
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-surface-dark rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Ciclo de Facturacion
              </h3>
            </div>
          </div>

          {[
            { dot:'#10b981', label:'HOY — ACTIVACION', desc:`$${displayPrice > 0 ? displayPrice.toFixed(2) : '—'} cobrado · Servicio operativo`, color:'#10b981', line:true },
            { dot:colors.accent, label:fmt(nextBillingDate).toUpperCase(), desc:`Proxima renovacion · $${displayPrice > 0 ? displayPrice.toFixed(2) : '—'} ${(data.currency || 'USD').toUpperCase()}`, color:colors.accent, line:true },
            { dot:'rgba(148,163,184,0.35)', label:fmt(followingRenewal).toUpperCase(), desc:`Renovacion recurrente · cada ${isAnnualCycle ? '12 meses' : '30 dias'}`, color:'#94a3b8', line:false },
          ].map((row, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center w-3 shrink-0 pt-1">
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:row.dot, flexShrink:0 }} />
                {row.line && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1.5 min-h-[20px]" />}
              </div>
              <div className={row.line ? 'pb-1' : ''}>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-0.5" style={{ color: row.color }}>
                  {row.label}
                </p>
                <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                  {row.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section
          className="rounded-2xl p-4 flex gap-3 border"
          style={{ background: colors.accentBg, borderColor: colors.accentBorder }}
        >
          <span className="material-symbols-outlined text-[18px] mt-0.5" style={{ color: colors.accent }}>
            verified_user
          </span>
          <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            Servicio prepago con cobro inmediato. Si no cumple lo esperado y hubo un uso legítimo, nuestro equipo puede revisar un reembolso del 100%.
          </p>
        </section>
      </main>

      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:0.5;} 80%,100%{transform:scale(1.9);opacity:0;} }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
      `}</style>
    </div>
  );
};

export default ActivationSuccess;
