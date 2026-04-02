import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
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
      .update({ onboarding_step: ONBOARDING_STEPS.PAYMENT })
      .eq('id', user.id);
  }, [user?.id]);

  // ─── Fallback: read from localStorage if location.state is lost (e.g. after Stripe back nav)
  const _state = location.state || {};
  const _lsId = localStorage.getItem('selected_plan');
  const _lsAnnual = localStorage.getItem('selected_plan_annual') === 'true';
  const _lsPrice = parseFloat(localStorage.getItem('selected_plan_price') || '0') || 0;
  const _lsPriceId = localStorage.getItem('selected_plan_price_id') || '';
  const _nameMap: Record<string, string> = { starter: 'Starter', pro: 'Pro', power: 'Power' };

  const planName = _state.planName || (_lsId ? _nameMap[_lsId] : null) || 'Starter';
  const isAnnual = _state.isAnnual ?? _lsAnnual;
  const price = _state.price || _lsPrice || 19.90;
  const monthlyLimit = _state.monthlyLimit || (({ Starter: 150, Pro: 400, Power: 1400 } as Record<string, number>)[planName] ?? 150);
  const stripePriceId = _state.stripePriceId || _lsPriceId || '';
  const region =
    (typeof _state.region === 'string' ? _state.region : undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('selected_region') || undefined : undefined) ||
    undefined;

  const handleCheckout = async () => {
    if (!user) return;
    setIsProcessing(true);

    try {
      const response = await fetch('/api/checkout?action=session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'session',
          priceId: stripePriceId,
          userId: user.id,
          planName: planName,
          monthlyLimit: monthlyLimit,
          isUpgrade: false,
          isAnnual: isAnnual,
          region
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        if (response.status === 422) {
          throw new Error(data.error || 'No hay disponibilidad para contratar este plan en este momento. Intenta más tarde.');
        }
        if (response.status === 409) {
          throw new Error(data.error || 'Hubo un conflicto temporal al reservar tu SIM. Reintenta en unos minutos.');
        }
        throw new Error(data.error || 'No se pudo generar la sesión de pago.');
      }
      const checkoutSessionId =
        typeof data.checkoutSessionId === 'string' ? data.checkoutSessionId : null;
      if (checkoutSessionId) {
        await supabase
          .from('users')
          .update({
            onboarding_step: ONBOARDING_STEPS.PROCESSING,
            onboarding_checkout_session_id: checkoutSessionId,
          })
          .eq('id', user.id);
      }
      window.location.href = data.url;

    } catch (err: any) {
      console.error("Payment Error:", err);
      alert(err.message || "Error al conectar con el servidor de pagos.");
      setIsProcessing(false);
    }
  };

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
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            Resumen
            <span className="mx-1 text-slate-200">·</span>
            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-[10px] font-black">4</span>
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Pago</span>
          </div>
          <button
            onClick={() => !isProcessing && navigate(-1)}
            className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors text-[12px] font-semibold"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 flex items-start justify-center px-8 py-12">
          <div className="w-full max-w-3xl">
            <div className="mb-8">
              <h1 className="text-[30px] font-black text-slate-900 dark:text-white tracking-tight">{t('onboarding.secure_payment')}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-[14px] mt-1.5">Tu suscripción se activa hoy. La garantía de satisfacción permite revisión de reembolso del 100% dentro de 7 días para la primera compra, sujeta a uso legítimo.</p>
            </div>

            <div className="grid grid-cols-5 gap-6">
              {/* Left: plan summary + stripe */}
              <div className="col-span-3 flex flex-col gap-5">
                {/* Plan summary card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Suscripción seleccionada</span>
                  </div>
                  <div className="px-6 py-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-900 dark:text-white font-black text-2xl uppercase tracking-tight">{planName}</span>
                        {isAnnual && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">Anual</span>
                        )}
                      </div>
                      <span className="block text-[12px] font-bold text-slate-400 dark:text-slate-500">{monthlyLimit} OTPs / mes</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-900 dark:text-white font-black text-2xl">${Number(price).toFixed(2)}</span>
                      <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isAnnual ? '/año' : '/mes'}</span>
                    </div>
                  </div>
                </div>

                {/* Stripe payment */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400 mb-5">{t('onboarding.payment_node')}</h3>
                  <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-5 text-center">
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
                        className="h-7"
                        alt="Stripe"
                      />
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                      {t('onboarding.stripe_desc')}
                    </p>
                  </div>
                </div>

                {/* Shield note */}
                <div className="p-5 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex gap-4">
                  <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t('onboarding.confirmation_desc')}
                  </p>
                </div>
              </div>

              {/* Right: total + CTA */}
              <div className="col-span-2 flex flex-col gap-5">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                  <h3 className="text-[13px] font-black uppercase tracking-wider text-slate-400 mb-5">Resumen de cobro</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-slate-400 text-[11px] font-black uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span>${Number(price).toFixed(2)}</span>
                    </div>
                    <div className="my-1 h-px w-full bg-slate-100" />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-900 dark:text-white text-lg font-black uppercase">Total hoy</span>
                      <span className="text-slate-900 dark:text-white text-3xl font-black">${Number(price).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-black text-[15px] h-14 rounded-2xl flex items-center justify-between px-5 disabled:opacity-70"
                >
                  <span>
                    {isProcessing ? (
                      <Loader2 className="size-5 animate-spin text-white/80" />
                    ) : (
                      <span />
                    )}
                  </span>
                  <span>{isProcessing ? t('onboarding.connecting') : t('onboarding.pay_with_stripe')}</span>
                  <Lock className="size-5 text-white/70" />
                </button>

                <div className="flex flex-col gap-2 px-2">
                  {[
                    { icon: '🔒', text: 'Pago seguro con SSL 256-bit' },
                    { icon: '↩️', text: 'Cancela cuando quieras' },
                    { icon: '🛡️', text: 'Garantía de satisfacción sujeta a revisión' },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
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
        <div className="sticky top-0 z-20 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => !isProcessing && navigate(-1)}
            className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${isProcessing ? 'opacity-30' : ''}`}
          >
            <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{ fontSize: '24px' }}>arrow_back</span>
          </button>
          <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10 uppercase tracking-tighter">{t('onboarding.secure_payment')}</h2>
        </div>

        <div className="flex-1 flex flex-col px-6 pt-8 pb-40 overflow-y-auto no-scrollbar">
          <div className="bg-white dark:bg-[#1A2230] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6 shadow-sm mb-10 flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">{t('onboarding.selected_subscription')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[#111318] dark:text-white font-black text-xl uppercase tracking-tight">{planName}</span>
                {isAnnual && (
                  <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 px-1.5 py-0.5 rounded-full">Anual</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-[#111318] dark:text-white font-black text-xl">${Number(price).toFixed(2)}</span>
                <span className="text-[10px] font-bold text-slate-400">{isAnnual ? '/yr' : '/mo'}</span>
              </div>
              <span className="text-emerald-500 text-[9px] font-black bg-emerald-500/10 px-2 py-1 rounded-lg uppercase">{t('onboarding.trial_7_days')}</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-[#111318] dark:text-white font-black text-[13px] uppercase tracking-[0.06em] mb-4">{t('onboarding.payment_node')}</h3>
            <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border-2 border-primary/20 flex flex-col items-center gap-6 text-center">
              <div className="size-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md">
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-7" alt="Stripe" />
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('onboarding.stripe_desc')}
              </p>
            </div>
          </div>

          <div className="mt-4 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-4">
            <ShieldCheck className="size-6 text-primary shrink-0" />
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('onboarding.confirmation_desc')}
            </p>
          </div>
        </div>

        <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-6 pb-10">
          <button
            onClick={handleCheckout}
            disabled={isProcessing}
            className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70"
          >
            <div className="w-12 flex items-center justify-center">
              {isProcessing && <Loader2 className="size-5 animate-spin text-white/80" />}
            </div>
            <span className="text-[17px] tracking-wide uppercase">
              {isProcessing ? t('onboarding.connecting') : t('onboarding.pay_with_stripe')}
            </span>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Lock className="size-6 text-white" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payment;
