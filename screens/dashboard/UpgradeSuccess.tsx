import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;
const isMobileDeviceUA = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const PLAN_CREDITS: Record<string, number> = {
  Starter: 150,
  Pro: 400,
  Power: 1400,
};

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  Starter: { monthly: 19.90, annual: 199 },
  Pro:     { monthly: 39.90, annual: 399 },
  Power:   { monthly: 99.00, annual: 990 },
};

const PLAN_COLORS: Record<string, string> = {
  Starter: 'from-yellow-400 to-orange-400',
  Pro:     'from-blue-500 to-blue-600',
  Power:   'from-yellow-600 to-yellow-700',
};

export default function UpgradeSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(10);
  const [desktop, setDesktop] = useState(isDesktop());
  const dashboardDestination = isMobileDeviceUA() ? '/dashboard/numbers' : '/web';
  const billingDestination = isMobileDeviceUA() ? '/dashboard/billing' : '/web';

  // Leer params de la URL: ?slotId=8A&planName=Starter&isAnnual=true
  const params = new URLSearchParams(location.search);
  const planName = params.get('planName') || 'Pro';
  const isAnnual  = params.get('isAnnual') === 'true';
  const slotId    = params.get('slotId') || '';

  const credits = PLAN_CREDITS[planName] ?? 400;
  const price   = PLAN_PRICES[planName]?.[isAnnual ? 'annual' : 'monthly'] ?? 0;
  const billingLabel = isAnnual ? 'Anual' : 'Mensual';
  const accent = planName === 'Power' ? '#f59e0b' : planName === 'Pro' ? '#1d4ed8' : '#10b981';
  const accentBg = planName === 'Power' ? 'rgba(245,158,11,0.08)' : planName === 'Pro' ? 'rgba(29,78,216,0.10)' : 'rgba(16,185,129,0.08)';
  const accentBorder = planName === 'Power' ? 'rgba(245,158,11,0.2)' : planName === 'Pro' ? 'rgba(29,78,216,0.25)' : 'rgba(16,185,129,0.2)';
  const planGradient = PLAN_COLORS[planName] ?? 'from-blue-500 to-blue-600';
  const today = new Date();
  const nextRenewal = new Date();
  nextRenewal.setDate(nextRenewal.getDate() + (isAnnual ? 365 : 30));
  const secondRenewal = new Date();
  secondRenewal.setDate(secondRenewal.getDate() + (isAnnual ? 730 : 60));
  const fmt = (d: Date) =>
    d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

  useEffect(() => {
    const handler = () => setDesktop(isDesktop());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (!user?.id || !slotId) return;

    let cancelled = false;

    const syncBilling = async () => {
      try {
        const res = await fetch('/api/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync-subscription-billing',
            slotId,
          }),
        });
        if (!res.ok && !cancelled) {
          console.warn('[UPGRADE_SUCCESS] sync-subscription-billing failed', await res.text().catch(() => ''));
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[UPGRADE_SUCCESS] sync-subscription-billing error', err);
        }
      }
    };

    void syncBilling();
    return () => {
      cancelled = true;
    };
  }, [slotId, user?.id]);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(dashboardDestination);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [dashboardDestination, navigate]);

  if (desktop) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] font-display flex flex-col">
        <div
          style={{
            position: 'fixed',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '700px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}, transparent)`,
            filter: 'blur(100px)',
            opacity: 0.1,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <header className="relative z-10 flex min-h-[72px] items-center justify-between border-b border-slate-100 bg-white px-8 py-4">
          <TelsimBrandLogo compact iconClassName="h-10 w-10 rounded-xl" textClassName="text-[1.65rem]" />
          <div className="flex items-center gap-2 text-[12px] font-bold text-slate-400">
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            Upgrade confirmado
          </div>
          <div className="w-20" />
        </header>

        <div className="flex-1 flex items-start justify-center px-8 py-12 relative z-10">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <div className="relative inline-block mb-5">
                <div style={{ position: 'absolute', inset: 0, borderRadius: '22px', border: `2px solid ${accentBorder}`, animation: 'ping 2s ease-out infinite', pointerEvents: 'none' }} />
                <div className="bg-white relative z-10" style={{ width: '76px', height: '76px', borderRadius: '22px', border: `1.5px solid ${accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent, animation: 'pulse 1.8s ease-in-out infinite' }} />
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: accent }}>Upgrade Aplicado</span>
              </div>
              <h1 className="text-[38px] font-black text-slate-900 tracking-tight mb-2">¡Upgrade Exitoso!</h1>
              <p className="text-slate-500 text-[15px] font-medium">Tu línea ya opera con el plan {planName} y facturación {billingLabel.toLowerCase()}.</p>
            </div>

            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3 flex flex-col gap-4">
                <div className="bg-white rounded-3xl border-2 p-6 w-full" style={{ borderColor: accentBorder }}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan Activado</span>
                  </div>
                  <span className="text-[32px] font-black text-slate-900 tracking-tight mb-2 block">{planName} · {billingLabel}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Activo inmediatamente</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[14px]" style={{ color: accent }}>mail</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SMS</span>
                    </div>
                    <p className="text-[20px] font-black uppercase tracking-tight mb-1" style={{ color: accent }}>{credits.toLocaleString()} SMS</p>
                    <p className="text-[11px] font-medium text-slate-400">Capacidad mensual del plan</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[14px] text-slate-400">credit_card</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Facturacion</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-[20px] font-black text-slate-900">${price.toFixed(2)}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isAnnual ? '/año' : '/mes'}</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400">{billingLabel}</p>
                  </div>
                </div>

                <div className="rounded-2xl p-4 flex gap-3" style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
                  <span className="material-symbols-outlined text-[15px] mt-0.5" style={{ color: accent }}>verified_user</span>
                  <p className="text-[12px] font-medium text-slate-600 leading-relaxed">
                    El upgrade fue procesado con Stripe y tu nueva suscripción ya quedó operativa sin período de prueba.
                  </p>
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-4">
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Ciclo de Facturación</span>
                  </div>
                  {[
                    { dot: '#10b981', label: 'HOY — UPGRADE', desc: `Se activó ${planName} · ${billingLabel}`, color: '#10b981', line: true },
                    { dot: accent, label: fmt(nextRenewal).toUpperCase(), desc: `Próximo cobro · $${price.toFixed(2)} USD`, color: accent, line: true },
                    { dot: 'rgba(148,163,184,0.4)', label: fmt(secondRenewal).toUpperCase(), desc: `Renovación recurrente · cada ${isAnnual ? '365 días' : '30 días'}`, color: '#94a3b8', line: false },
                  ].map((row, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center w-3 shrink-0 pt-1">
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: row.dot, flexShrink: 0 }} />
                        {row.line && <div className="w-px flex-1 bg-slate-200 my-1.5 min-h-[20px]" />}
                      </div>
                      <div className={row.line ? 'pb-4' : ''}>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: row.color }}>{row.label}</p>
                        <p className="text-[11px] text-slate-500 leading-snug">{row.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate(dashboardDestination)}
                  className="w-full h-14 bg-primary hover:bg-blue-700 text-white font-black text-[14px] uppercase tracking-wide rounded-2xl flex items-center justify-between px-5 transition-all active:scale-[0.98]"
                >
                  <span />
                  <span>Ir a Mis SIMs</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate(billingDestination)}
                  className="w-full h-11 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 font-bold text-[12px] uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">credit_card</span>
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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      <div
        className="pointer-events-none fixed left-1/2 top-[-60px] z-0 h-[380px] w-[500px] -translate-x-1/2 rounded-full blur-[80px]"
        style={{ background: `radial-gradient(circle, ${accent}, transparent)`, opacity: 0.12 }}
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
          Upgrade
        </h1>
        <div className="w-10" />
      </header>

      <main className="relative z-10 px-5 py-4 space-y-5 pb-10 max-w-lg mx-auto">
        <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{ background: accentBg, borderColor: accentBorder }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
                Activo
              </span>
            </div>
            <div
              className="size-8 rounded-lg border bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm"
              style={{ borderColor: accentBorder, boxShadow: `0 8px 20px ${accentBg}` }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="mb-2 flex items-center justify-center gap-2">
              <div
                className="size-8 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm"
                style={{ borderColor: accentBorder, boxShadow: `0 8px 20px ${accentBg}` }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Tu plan activo
              </p>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {planName} · {billingLabel}
            </h2>
            <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Tu línea ya fue actualizada y está operando con la nueva capacidad de SMS.
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
              className="bg-primary hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
            <p className="text-[18px] font-black uppercase tracking-tight mb-1" style={{ color: accent }}>
              {planName}
            </p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {credits.toLocaleString()} Creditos SMS
            </p>
          </div>
          <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-2">
              Facturacion
            </p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[18px] font-black text-slate-900 dark:text-white">
                ${price.toFixed(2)}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {isAnnual ? '/ano' : '/mes'}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {billingLabel}
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
            { dot: '#10b981', label: 'HOY — UPGRADE', desc: `Cambio inmediato a ${planName} · ${billingLabel}`, color: '#10b981', line: true },
            { dot: accent, label: fmt(nextRenewal).toUpperCase(), desc: `Proximo cobro · $${price.toFixed(2)} USD`, color: accent, line: true },
            { dot: 'rgba(148,163,184,0.35)', label: fmt(secondRenewal).toUpperCase(), desc: `Renovacion recurrente · cada ${isAnnual ? '365 dias' : '30 dias'}`, color: '#94a3b8', line: false },
          ].map((row, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center w-3 shrink-0 pt-1">
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: row.dot, flexShrink: 0 }} />
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

        <section className="rounded-2xl p-4 flex gap-3 border" style={{ background: accentBg, borderColor: accentBorder }}>
          <span className="material-symbols-outlined text-[18px] mt-0.5" style={{ color: accent }}>
            verified_user
          </span>
          <div className="flex-1">
            <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              Upgrade procesado de forma segura por Stripe. Tu nueva suscripción quedó activa desde ahora.
            </p>
            <p className="mt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Redirigiendo automáticamente en {countdown}s
            </p>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:0.5;} 80%,100%{transform:scale(1.9);opacity:0;} }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
      `}</style>
    </div>
  );
}
