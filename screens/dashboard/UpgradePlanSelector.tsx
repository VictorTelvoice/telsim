import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Star, Zap } from 'lucide-react';
import { STRIPE_PRICES } from '../../constants/stripePrices';

const PLAN_ORDER: Record<string, number> = { 'STARTER': 1, 'PRO': 2, 'POWER': 3 };

const PLANS = [
  {
    id: 'Starter',
    name: 'STARTER',
    credits: '150 Créditos SMS',
    price: 19.90,
    annualPrice: 199,
    annualMonthly: 16.58,
    limit: 150,
    stripePriceId: STRIPE_PRICES.STARTER.MONTHLY,
    annualStripePriceId: STRIPE_PRICES.STARTER.ANNUAL,
    accentColor: 'text-slate-500',
    borderColor: 'border-slate-200 dark:border-slate-700',
    bgColor: 'bg-white dark:bg-slate-800',
    idealFor: 'Usuarios individuales y Desarrolladores',
    features: [
      'Número SIM Real (no VoIP baratos)',
      'Notificaciones en tiempo real',
      'Visualización en App',
      'Capacidad: 150 SMS mensuales',
      'Soporte técnico vía Ticket',
    ],
  },
  {
    id: 'Pro',
    name: 'PRO',
    credits: '400 Créditos SMS',
    price: 39.90,
    annualPrice: 399,
    annualMonthly: 33.25,
    limit: 400,
    stripePriceId: STRIPE_PRICES.PRO.MONTHLY,
    annualStripePriceId: STRIPE_PRICES.PRO.ANNUAL,
    popular: true,
    accentColor: 'text-[#0047FF]',
    borderColor: 'border-[#0047FF]',
    bgColor: 'bg-white dark:bg-slate-800',
    idealFor: 'Equipos DevOps y Automatizadores',
    features: [
      'Todo lo incluido en Starter',
      'SMS 100% automatizados (Sin intervención)',
      'Acceso a API, Webhooks, y TelegramBot',
      'Capacidad: 400 SMS mensuales',
      'Soporte técnico vía Ticket y Chat en vivo',
    ],
  },
  {
    id: 'Power',
    name: 'POWER',
    credits: '1,400 Créditos SMS',
    price: 99.00,
    annualPrice: 990,
    annualMonthly: 82.50,
    limit: 1400,
    stripePriceId: STRIPE_PRICES.POWER.MONTHLY,
    annualStripePriceId: STRIPE_PRICES.POWER.ANNUAL,
    accentColor: 'text-amber-500',
    borderColor: 'border-amber-400',
    bgColor: 'bg-white dark:bg-slate-800',
    idealFor: 'Fintech, Corporativos y Plataformas P2P',
    features: [
      'Todo lo incluido en Pro',
      'Seguridad y Control Empresarial',
      'Integraciones Personalizadas y Escalabilidad',
      'Capacidad: 1,400 SMS mensuales',
      'Soporte Prioritario 24/7',
    ],
  },
];

export default function UpgradePlanSelector() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);

  const { phoneNumber, slot_id, currentPlanName, billing_type } = state || {};
  const currentOrder = PLAN_ORDER[(currentPlanName || 'Starter').toUpperCase()] ?? 1;
  const currentBilling = billing_type || 'monthly';

  const availablePlans = PLANS.filter(plan => {
    const order = PLAN_ORDER[plan.id.toUpperCase()] ?? 1;
    if (order > currentOrder) return true;
    if (order === currentOrder && currentBilling === 'monthly') return true;
    return false;
  });

  const handleSelect = (plan: typeof PLANS[0]) => {
    const stripePriceId = isAnnual ? plan.annualStripePriceId : plan.stripePriceId;
    const price = isAnnual ? plan.annualPrice : plan.price;
    navigate('/dashboard/upgrade-summary', {
      state: {
        phoneNumber,
        slot_id,
        planName: plan.id,
        currentPlanName,
        stripePriceId,
        limit: plan.limit,
        price,
        isAnnual,
        isUpgrade: true,
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#0D1321] font-display">
      {/* Header con back */}
      <div className="flex items-center gap-3 px-8 py-5 bg-white dark:bg-[#101622] border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition font-semibold"
        >
          <ArrowLeft size={16} />
          Mis SIMs
        </button>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white">Cambiar plan</span>
        <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-mono">{phoneNumber}</span>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Título */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Elige tu nuevo plan
          </h1>
          <p className="text-slate-400 text-base">
            Plan actual: <span className="font-bold text-slate-600 dark:text-slate-300">{currentPlanName || 'Starter'} · {currentBilling === 'annual' ? 'Anual' : 'Mensual'}</span>
            {' '}— El cambio es inmediato, sin días de prueba.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Mensual</span>
          <button
            onClick={() => setIsAnnual(p => !p)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isAnnual ? 'bg-[#0047FF]' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-bold transition-colors ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Anual</span>
          {isAnnual && (
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Ahorra 17%
            </span>
          )}
        </div>

        {/* Cards de planes */}
        <div className={`grid gap-6 ${availablePlans.length === 1 ? 'max-w-sm mx-auto' : availablePlans.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-3'}`}>
          {availablePlans.map(plan => {
            const isSameAnnual = PLAN_ORDER[plan.id.toUpperCase()] === currentOrder && currentBilling === 'monthly';
            const displayPrice = isAnnual ? plan.annualMonthly : plan.price;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col ${plan.bgColor} rounded-2xl border-2 ${plan.borderColor} p-7 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1`}
                onClick={() => handleSelect(plan)}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0047FF] text-white text-[10px] font-black px-4 py-1 rounded-full shadow uppercase tracking-widest flex items-center gap-1">
                    <Zap size={10} /> Más Popular
                  </div>
                )}
                {isSameAnnual && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black px-4 py-1 rounded-full shadow uppercase tracking-widest">
                    Cambia a anual · Ahorra 17%
                  </div>
                )}

                {/* Plan name y créditos */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest ${plan.accentColor} mb-1`}>{plan.name}</p>
                    <div className="flex itemscenter gap-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-full px-2.5 py-1 w-fit">
                      <MessageSquare size={10} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{plan.credits}</span>
                    </div>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-700`}>
                    <Star size={16} className={plan.accentColor} />
                  </div>
                </div>

                {/* Precio */}
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">${displayPrice.toFixed(2)}</span>
                    <span className="text-sm text-slate-400 font-bold mb-2">/mo</span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-slate-400 mt-1">Facturado como ${plan.annualPrice}/año</p>
                  )}
                </div>

                {/* Features */}
                <div className="flex flex-col gap-2.5 flex-1 mb-6">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="size-4 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] text-emerald-600 font-black">✓</span>
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{f}</span>
                    </div>
                  ))}
                </div>

                {/* Ideal para */}
                <div className={`rounded-xl p-3 ${plan.popular ? 'bg-blue-50 dark:bg-blue-900/20' : plan.id === 'Power' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-slate-700/30'}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${plan.accentColor}`}>Ideal para</p>
                  <p className={`text-xs font-semibold ${plan.popular ? 'text-blue-700 dark:text-blue-300' : plan.id === 'Power' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}>{plan.idealFor}</p>
                </div>

                {/* CTA */}
                <button
                  className={`mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.popular ? 'bg-[#0047FF] text-white hover:bg-blue-700' : plan.id === 'Power' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'}`}
                  onClick={e => { e.stopPropagation(); handleSelect(plan); }}
                >
                  Seleccionar plan →
                </button>
              </div>
            );
          })}
        </div>

        {/* Nota sin trial */}
        <p className="text-center text-xs text-slate-400 mt-8">
          🔒 El upgrade es inmediato y sin período de prueba. Se te cobrará el plan completo desde hoy.
        </p>
      </div>
    </div>
  );
}

