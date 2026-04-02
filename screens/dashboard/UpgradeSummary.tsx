import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

const PLAN_CONFIG: Record<string, { color: string; bg: string; border: string; limit: number; features: string[] }> = {
  Starter: {
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    limit: 150,
    features: ['150 SMS mensuales', 'Numero SIM real', 'Notificaciones en tiempo real', 'Soporte via ticket'],
  },
  Pro: {
    color: '#0047FF',
    bg: '#eff6ff',
    border: '#0047FF',
    limit: 400,
    features: ['400 SMS mensuales', 'SMS 100% automatizados', 'Acceso a API y Webhooks', 'Soporte prioritario chat en vivo'],
  },
  Power: {
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#f59e0b',
    limit: 1400,
    features: ['1,400 SMS mensuales', 'Seguridad empresarial', 'Integraciones personalizadas', 'Soporte prioritario 24/7'],
  },
};

const CheckIcon = () => (
  <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: '16px' }}>
    check_circle
  </span>
);

export default function UpgradeSummary() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [desktop, setDesktop] = useState(isDesktop());
  const [isProcessing, setIsProcessing] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handler = () => setDesktop(isDesktop());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const {
    phoneNumber,
    slot_id,
    planName = 'Pro',
    currentPlanName = 'Starter',
    stripePriceId,
    limit,
    price,
    isAnnual,
  } = state || {};

  const config = PLAN_CONFIG[planName] || PLAN_CONFIG.Pro;
  const resolvedLimit = limit || config.limit;
  const resolvedPrice = Number(price || 0);

  const billingLabel = isAnnual ? 'Anual' : 'Mensual';

  const summaryItems = useMemo(
    () => [
      { label: 'Plan anterior', value: currentPlanName },
      { label: 'Nuevo plan', value: `${planName} · ${billingLabel}` },
      { label: 'Linea SIM', value: phoneNumber || '—' },
      { label: 'Capacidad', value: `${resolvedLimit} SMS / mes` },
    ],
    [billingLabel, currentPlanName, phoneNumber, planName, resolvedLimit]
  );

  const handleConfirmUpgrade = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade',
          userId: user.id,
          slotId: slot_id,
          newPriceId: stripePriceId,
          newPlanName: planName,
          isAnnual: isAnnual ?? false,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el upgrade');
      }

      if (data.instant) {
        const q = new URLSearchParams({
          slotId: String(slot_id ?? ''),
          planName: String(planName ?? ''),
          isAnnual: String(!!isAnnual),
        });
        navigate(`/dashboard/upgrade-success?${q.toString()}`);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err: any) {
      alert(err.message || 'Error al procesar el upgrade');
      setIsProcessing(false);
    }
  };

  const PlanCard = () => (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1A2230]">
      <div className="border-b border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/30">
        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Upgrade de infraestructura</span>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{planName}</span>
          <span
            className="rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
            style={{ color: config.color, borderColor: `${config.color}40`, backgroundColor: `${config.color}12` }}
          >
            {billingLabel}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Linea seleccionada</span>
            <span className="font-mono text-xl font-black text-slate-900 dark:text-white">{phoneNumber || '—'}</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">{resolvedLimit} SMS / mes</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                Sin trial
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-slate-900 dark:text-white">${resolvedPrice.toFixed(2)}</span>
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{isAnnual ? '/año' : '/mes'}</span>
          </div>
        </div>

        <div className="space-y-2">
          {config.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
              <CheckIcon />
              {feature}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-800/40 dark:bg-emerald-900/20">
          <div className="mb-3 flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-emerald-800 dark:text-emerald-300">Activación inmediata</p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-emerald-700 dark:text-emerald-400/80">
                Tu SIM se actualizará con las nuevas capacidades al confirmar el upgrade.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-emerald-500/10 pt-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Cambio</span>
            <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">
              {currentPlanName} → {planName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const Totals = () => (
    <div className="flex flex-col gap-3">
      {summaryItems.map((item) => (
        <div key={item.label} className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
          <span>{item.label}</span>
          <span className="max-w-[52%] truncate text-right text-slate-700 dark:text-slate-200">{item.value}</span>
        </div>
      ))}
      <div className="my-1 h-px w-full bg-slate-200 dark:bg-slate-800" />
      <div className="flex items-center justify-between">
        <span className="text-lg font-black uppercase text-slate-900 dark:text-white">Total hoy</span>
        <span className="text-3xl font-black text-slate-900 dark:text-white">${resolvedPrice.toFixed(2)}</span>
      </div>
    </div>
  );

  if (desktop) {
    return (
      <div className={`flex min-h-screen flex-col font-display ${isDark ? 'bg-background-dark' : 'bg-[#F0F4F8]'}`}>
        <header className={`flex min-h-[64px] items-center justify-between border-b px-8 py-3 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-white'}`}>
          <TelsimBrandLogo compact iconClassName="h-10 w-10 rounded-xl" textClassName="text-[1.65rem]" />
          <div className={`flex items-center gap-2 text-[12px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400">
              <span className="text-[10px] text-white">✓</span>
            </span>
            Plan upgrade
            <span className={`mx-1 ${isDark ? 'text-slate-700' : 'text-slate-200'}`}>·</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <span className="text-[10px] font-black text-white">2</span>
            </span>
            <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Confirmación</span>
          </div>
          <button
            onClick={() => !isProcessing && navigate(-1)}
            className={`flex items-center gap-1.5 text-[12px] font-semibold transition-colors hover:text-primary ${isDark ? 'text-slate-400' : 'text-slate-400'}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
        </header>

        <div className="flex flex-1 items-start justify-center px-8 py-8 xl:py-7">
          <div className="w-full max-w-3xl">
            <div className="mb-6">
              <h1 className={`text-[30px] font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Confirma tu upgrade</h1>
              <p className={`mt-1.5 text-[14px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Revisa los detalles antes de aplicar el cambio a tu SIM.</p>
            </div>

            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3">
                <PlanCard />
              </div>

              <div className="col-span-2 flex flex-col gap-5">
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-5 text-[13px] font-black uppercase tracking-wider text-slate-400">Resumen de cobro</h3>
                  <Totals />
                </div>

                <button
                  onClick={handleConfirmUpgrade}
                  disabled={isProcessing}
                  className="group flex h-14 w-full items-center justify-between rounded-2xl bg-primary px-5 text-[15px] font-black text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70"
                >
                  <span>{isProcessing ? <Loader2 className="h-5 w-5 animate-spin text-white/80" /> : <span />}</span>
                  <span>{isProcessing ? 'Procesando...' : `Confirmar upgrade a ${planName}`}</span>
                  <span className="material-symbols-outlined text-white/80">arrow_forward</span>
                </button>

                <div className="flex flex-col gap-2 px-2">
                  {[
                    { icon: '⚡', text: 'Cambio inmediato en tu infraestructura' },
                    { icon: '🔒', text: 'Pago seguro procesado por Stripe' },
                    { icon: '🛡️', text: 'Sin periodo de prueba en upgrades' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
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

  return (
    <div className="flex min-h-screen flex-col items-center bg-background-light font-display text-[#111318] antialiased dark:bg-background-dark dark:text-white">
      <div className="relative flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-background-light shadow-2xl dark:bg-background-dark">
        <div className="sticky top-0 z-20 flex items-center bg-background-light/90 px-4 py-3 backdrop-blur-sm dark:bg-background-dark/90">
          <div
            onClick={() => !isProcessing && navigate(-1)}
            className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${isProcessing ? 'opacity-30' : ''}`}
          >
            <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{ fontSize: '24px' }}>
              arrow_back
            </span>
          </div>
          <h2 className="flex-1 pr-10 text-center text-lg font-bold leading-tight text-[#111318] dark:text-white">Confirmar upgrade</h2>
        </div>

        <div className="flex flex-col gap-2 px-6 pb-4 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-primary dark:text-blue-400">Paso 2 de 2</p>
            <p className="text-xs font-medium text-gray-400">Finalizar</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#dbdfe6] dark:bg-gray-700">
            <div className="h-full w-full bg-primary" />
          </div>
        </div>

        <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-6 pb-44">
          <div className="pb-6 pt-2">
            <h1 className="mb-2 text-left text-[28px] font-extrabold leading-tight tracking-tight text-[#111318] dark:text-white">
              Confirma tu nuevo plan
            </h1>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">
              Revisa tu upgrade antes de aplicarlo a la línea.
            </p>
          </div>

          <div className="mb-6">
            <PlanCard />
          </div>

          <div className="mb-6 flex flex-col gap-3 px-2">
            <Totals />
          </div>

          <div className="mx-2 mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-[11px] font-bold leading-relaxed text-slate-600 dark:text-slate-300">
                Este upgrade se cobra de inmediato y actualiza tu SIM sin esperar un nuevo período de prueba.
              </p>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 z-30 w-full max-w-md border-t border-gray-100 bg-white/95 p-6 pb-10 backdrop-blur-md dark:border-gray-800 dark:bg-[#101622]/95">
          <button
            onClick={handleConfirmUpgrade}
            disabled={isProcessing}
            className="group flex h-16 w-full items-center justify-between rounded-2xl bg-primary px-2 font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70"
          >
            <div className="w-12">
              {isProcessing ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-white/80" /> : null}
            </div>
            <span className="text-[17px] uppercase tracking-wide">
              {isProcessing ? 'Procesando...' : `Confirmar ${planName}`}
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 transition-colors group-hover:bg-white/30">
              <span className="material-symbols-outlined text-white">arrow_forward</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
