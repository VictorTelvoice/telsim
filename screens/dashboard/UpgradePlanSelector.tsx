import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Zap } from 'lucide-react';
import { STRIPE_PRICES } from '../../constants/stripePrices';

const PLANS = [
  {
    id: 'Starter',
    name: 'STARTER',
    credits: '150 Creditos SMS',
    price: 19.9,
    annualPrice: 199,
    annualMonthly: 16.58,
    limit: 150,
    stripePriceId: STRIPE_PRICES.STARTER.MONTHLY,
    annualStripePriceId: STRIPE_PRICES.STARTER.ANNUAL,
    accent: 'text-slate-500',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-900',
    popular: false,
    idealFor: 'Usuarios individuales y desarrolladores',
    features: [
      'Numero SIM real',
      'Notificaciones en tiempo real',
      'Visualizacion en app',
      'Capacidad: 150 SMS mensuales',
      'Soporte tecnico via ticket',
    ],
  },
  {
    id: 'Pro',
    name: 'PRO',
    credits: '400 Creditos SMS',
    price: 39.9,
    annualPrice: 399,
    annualMonthly: 33.25,
    limit: 400,
    stripePriceId: STRIPE_PRICES.PRO.MONTHLY,
    annualStripePriceId: STRIPE_PRICES.PRO.ANNUAL,
    accent: 'text-[#0047FF]',
    border: 'border-[#0047FF]',
    badgeBg: 'bg-[#0047FF]',
    popular: true,
    idealFor: 'Equipos DevOps y automatizadores',
    features: [
      'Todo lo incluido en Starter',
      'SMS 100% automatizados',
      'Acceso a API, Webhooks y TelegramBot',
      'Capacidad: 400 SMS mensuales',
      'Soporte via ticket y chat en vivo',
    ],
  },
  {
    id: 'Power',
    name: 'POWER',
    credits: '1,400 Creditos SMS',
    price: 99,
    annualPrice: 990,
    annualMonthly: 82.5,
    limit: 1400,
    stripePriceId: STRIPE_PRICES.POWER.MONTHLY,
    annualStripePriceId: STRIPE_PRICES.POWER.ANNUAL,
    accent: 'text-amber-500',
    border: 'border-amber-400',
    badgeBg: 'bg-amber-500',
    popular: false,
    idealFor: 'Fintech, corporativos y plataformas P2P',
    features: [
      'Todo lo incluido en Pro',
      'Seguridad y control empresarial',
      'Integraciones personalizadas',
      'Capacidad: 1,400 SMS mensuales',
      'Soporte prioritario 24/7',
    ],
  },
];

type PlanWithForce = (typeof PLANS)[number] & { forceAnnual?: boolean };

export default function UpgradePlanSelector() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const phoneNumber = state?.phoneNumber as string | undefined;
  const slotId = state?.slot_id as string | undefined;
  const currentPlanName = (state?.currentPlanName || 'Starter') as string;
  const currentBilling = (state?.billing_type || 'monthly') as 'monthly' | 'annual';

  const [showAnnual, setShowAnnual] = useState(currentBilling === 'annual');

  const samePlanAnnual =
    currentBilling === 'monthly'
      ? PLANS.find((plan) => plan.id.toLowerCase() === currentPlanName.toLowerCase()) ?? null
      : null;

  const otherPlans = PLANS.filter((plan) => plan.id.toLowerCase() !== currentPlanName.toLowerCase());

  const visiblePlans: PlanWithForce[] = [
    ...(samePlanAnnual ? [{ ...samePlanAnnual, forceAnnual: true }] : []),
    ...otherPlans,
  ];

  const handleSelect = (plan: PlanWithForce) => {
    const isAnnual = plan.forceAnnual ?? showAnnual;
    navigate('/dashboard/upgrade-summary', {
      state: {
        phoneNumber,
        slot_id: slotId,
        planName: plan.id,
        currentPlanName,
        stripePriceId: isAnnual ? plan.annualStripePriceId : plan.stripePriceId,
        limit: plan.limit,
        price: isAnnual ? plan.annualPrice : plan.price,
        isAnnual,
        isUpgrade: true,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 md:px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft size={16} />
            <span>Mis SIMs</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-black text-slate-900">Cambiar plan</span>
          {phoneNumber && (
            <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 md:ml-0">
              {phoneNumber}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-10 md:px-8 md:pt-14">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-[44px] font-black leading-[0.95] tracking-tight text-slate-900 md:text-6xl">
            Elige tu nuevo plan
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400 md:text-xl">
            Plan actual:{' '}
            <strong className="text-slate-700">
              {currentPlanName} · {currentBilling === 'annual' ? 'Anual' : 'Mensual'}
            </strong>{' '}
            — El cambio es inmediato, sin días de prueba.
          </p>
        </section>

        {visiblePlans.length > 0 && (
          <section className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <span className={`text-lg font-bold ${!showAnnual ? 'text-slate-900' : 'text-slate-400'}`}>Mensual</span>
            <button
              onClick={() => setShowAnnual((prev) => !prev)}
              className={`relative h-14 w-28 rounded-full transition-colors ${
                showAnnual ? 'bg-[#1d4fff]' : 'bg-slate-200'
              }`}
              type="button"
              role="switch"
              aria-checked={showAnnual}
            >
              <span
                className={`absolute top-2 h-10 w-10 rounded-full bg-white shadow-md transition-all ${
                  showAnnual ? 'left-[4.25rem]' : 'left-2'
                }`}
              />
            </button>
            <span className={`text-lg font-black ${showAnnual ? 'text-slate-900' : 'text-slate-400'}`}>Anual</span>
            {showAnnual && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-600">
                Ahorra 17%
              </span>
            )}
          </section>
        )}

        <section className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visiblePlans.map((plan) => {
            const isAnnual = plan.forceAnnual ?? showAnnual;
            const displayPrice = isAnnual ? plan.annualMonthly : plan.price;
            const planTone = plan.id === 'Power'
              ? 'bg-amber-50 text-amber-700'
              : plan.id === 'Pro'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-slate-100 text-slate-600';
            const idealTone = plan.id === 'Power'
              ? 'bg-amber-50 text-amber-700'
              : plan.id === 'Pro'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-slate-50 text-slate-600';

            return (
              <article
                key={plan.id}
                onClick={() => handleSelect(plan)}
                className={`relative flex min-h-[640px] cursor-pointer flex-col rounded-[2rem] border-2 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:p-7 ${plan.border}`}
              >
                {plan.forceAnnual && (
                  <div className="absolute -top-3 left-6 rounded-full bg-emerald-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    Cambia a anual · Ahorra 17%
                  </div>
                )}
                {!plan.forceAnnual && plan.popular && (
                  <div className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-[#0047FF] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    <Zap size={10} />
                    Más popular
                  </div>
                )}

                <div className={`text-sm font-black uppercase tracking-[0.32em] ${plan.accent}`}>{plan.name}</div>
                <div className={`mt-3 inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-semibold ${planTone}`}>
                  {plan.credits}
                </div>

                <div className="mt-7">
                  <div className="flex items-end gap-2">
                    <span className="text-[56px] font-black leading-none tracking-tight text-slate-900 md:text-[72px]">
                      ${displayPrice.toFixed(2)}
                    </span>
                    <span className="mb-2 text-xl font-bold text-slate-400">/mo</span>
                  </div>
                  {isAnnual && (
                    <p className="mt-2 text-base text-slate-400">
                      Facturado como ${plan.annualPrice}/año
                    </p>
                  )}
                </div>

                <div className="mt-8 flex flex-1 flex-col gap-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                        <Check size={14} className="text-emerald-600" strokeWidth={3} />
                      </div>
                      <span className="text-lg leading-8 text-slate-600">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className={`mt-7 rounded-2xl px-4 py-3 ${idealTone}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ideal para</p>
                  <p className="mt-1 text-sm font-bold">{plan.idealFor}</p>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSelect(plan);
                  }}
                  className={`mt-6 h-14 rounded-2xl text-base font-black text-white transition hover:opacity-90 ${
                    plan.id === 'Power'
                      ? 'bg-amber-500'
                      : plan.popular
                        ? 'bg-[#0047FF]'
                        : 'bg-slate-900'
                  }`}
                >
                  Seleccionar plan
                </button>
              </article>
            );
          })}
        </section>

        <p className="mt-8 text-center text-sm font-medium text-slate-400 md:text-base">
          El upgrade es inmediato y sin período de prueba. Se cobrará el plan completo desde hoy.
        </p>
      </main>
    </div>
  );
}
