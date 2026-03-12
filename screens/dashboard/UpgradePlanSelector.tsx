import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Zap } from 'lucide-react';
import { STRIPE_PRICES } from '../../constants/stripePrices';

const PLAN_ORDER: Record<string, number> = { STARTER: 1, PRO: 2, POWER: 3 };

const PLANS = [
  {
    id: 'Starter', name: 'STARTER',
    credits: '150 Créditos SMS', price: 19.90, annualPrice: 199, annualMonthly: 16.58, limit: 150,
    stripePriceId: STRIPE_PRICES.STARTER.MONTHLY, annualStripePriceId: STRIPE_PRICES.STARTER.ANNUAL,
    accent: '#64748b', border: '#e2e8f0', badgeBg: '', popular: false,
    idealFor: 'Usuarios individuales y Desarrolladores',
    features: ['Número SIM Real (no VoIP baratos)', 'Notificaciones en tiempo real', 'Visualización en App', 'Capacidad: 150 SMS mensuales', 'Soporte técnico vía Ticket'],
  },
  {
    id: 'Pro', name: 'PRO',
    credits: '400 Créditos SMS', price: 39.90, annualPrice: 399, annualMonthly: 33.25, limit: 400,
    stripePriceId: STRIPE_PRICES.PRO.MONTHLY, annualStripePriceId: STRIPE_PRICES.PRO.ANNUAL,
    accent: '#0047FF', border: '#0047FF', badgeBg: '#0047FF', popular: true,
    idealFor: 'Equipos DevOps y Automatizadores',
    features: ['Todo lo incluido en Starter', 'SMS 100% automatizados (Sin intervención)', 'Acceso a API, Webhooks, y TelegramBot', 'Capacidad: 400 SMS mensuales', 'Soporte técnico vía Ticket y Chat en vivo'],
  },
  {
    id: 'Power', name: 'POWER',
    credits: '1,400 Créditos SMS', price: 99.00, annualPrice: 990, annualMonthly: 82.50, limit: 1400,
    stripePriceId: STRIPE_PRICES.POWER.MONTHLY, annualStripePriceId: STRIPE_PRICES.POWER.ANNUAL,
    accent: '#f59e0b', border: '#f59e0b', badgeBg: '#f59e0b', popular: false,
    idealFor: 'Fintech, Corporativos y Plataformas P2P',
    features: ['Todo lo incluido en Pro', 'Seguridad y Control Empresarial', 'Integraciones Personalizadas y Escalabilidad', 'Capacidad: 1,400 SMS mensuales', 'Soporte Prioritario 24/7'],
  },
];

export default function UpgradePlanSelector() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);

  const { phoneNumber, slot_id, currentPlanName, billing_type } = state || {};
  const currentOrder = PLAN_ORDER[(currentPlanName || 'Starter').toUpperCase()] ?? 1;
  const currentBilling = billing_type || 'monthly';

  // REGLA:
  // - Si el usuario tiene Plan X Mensual, siempre mostrar primero el Plan X Anual,
  //   más los planes superiores (afectados por el toggle).
  // - Si el usuario tiene Plan X Anual, solo mostrar planes superiores.
  const samePlanAnnual = currentBilling === 'monthly'
    ? PLANS.find(p => PLAN_ORDER[p.id.toUpperCase()] === currentOrder) ?? null
    : null;

  const higherPlans = PLANS.filter(plan => {
    const order = PLAN_ORDER[plan.id.toUpperCase()] ?? 1;
    return order > currentOrder;
  });

  const handleSelect = (plan: typeof PLANS[0], opts?: { forceAnnual?: boolean }) => {
    const annual = opts?.forceAnnual ?? isAnnual;
    navigate('/dashboard/upgrade-summary', {
      state: {
        phoneNumber, slot_id, planName: plan.id, currentPlanName,
        stripePriceId: annual ? plan.annualStripePriceId : plan.stripePriceId,
        limit: plan.limit,
        price: annual ? plan.annualPrice : plan.price,
        isAnnual: annual,
        isUpgrade: true,
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 32px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Mis SIMs
        </button>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Cambiar plan</span>
        <span style={{ fontSize: 12, background: '#f1f5f9', color: '#64748b', padding: '2px 10px', borderRadius: 20, fontFamily: 'monospace' }}>{phoneNumber}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '48px 48px 80px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Elige tu nuevo plan</h1>
          <p style={{ color: '#94a3b8', fontSize: 15, margin: 0 }}>
            Plan actual: <strong style={{ color: '#475569' }}>{currentPlanName || 'Starter'} · {currentBilling === 'annual' ? 'Anual' : 'Mensual'}</strong>
            {' '}— El cambio es inmediato, sin días de prueba.
          </p>
        </div>

        {/* Toggle: solo controla planes superiores, nunca el mismo plan anual */}
        {higherPlans.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: !isAnnual ? '#0f172a' : '#94a3b8' }}>Mensual</span>
            <button
              onClick={() => setIsAnnual(p => !p)}
              style={{
                width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: isAnnual ? '#0047FF' : '#e2e8f0', position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: isAnnual ? 25 : 3,
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s'
              }} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: isAnnual ? '#0f172a' : '#94a3b8' }}>Anual</span>
            {isAnnual && (
              <span style={{ fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
                Ahorra 17%
              </span>
            )}
          </div>
        )}

        {/* Plan cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: (() => {
            const totalCards = (samePlanAnnual ? 1 : 0) + higherPlans.length;
            if (totalCards <= 1) return '360px';
            if (totalCards === 2) return 'repeat(2, 1fr)';
            return 'repeat(3, 1fr)';
          })(),
          gap: 24,
          justifyContent: 'center',
        }}>
          {/* Mismo plan anual primero (si aplica) */}
          {samePlanAnnual && (
            <div
              key={samePlanAnnual.id}
              onClick={() => handleSelect(samePlanAnnual, { forceAnnual: true })}
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                background: 'white', borderRadius: 20, border: `2px solid ${samePlanAnnual.border}`,
                padding: '28px 24px 24px', cursor: 'pointer',
                boxShadow: samePlanAnnual.popular ? `0 8px 32px ${samePlanAnnual.accent}22` : '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px ${samePlanAnnual.accent}33`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = samePlanAnnual.popular ? `0 8px 32px ${samePlanAnnual.accent}22` : '0 2px 8px rgba(0,0,0,0.06)'; }}
            >
              {/* Badge for same plan annual */}
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#059669', color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1 }}>
                Cambia a anual · Ahorra 17%
              </div>

              {/* Plan name */}
              <p style={{ fontSize: 11, fontWeight: 800, color: samePlanAnnual.accent, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px' }}>{samePlanAnnual.name}</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', borderRadius: 20, padding: '4px 10px', marginBottom: 16, width: 'fit-content' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{samePlanAnnual.credits}</span>
              </div>

              {/* Price (always annual for same plan) */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 52, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>${samePlanAnnual.annualMonthly.toFixed(2)}</span>
                  <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>/mo</span>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Facturado como ${samePlanAnnual.annualPrice}/año</p>
              </div>

              {/* Features */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {samePlanAnnual.features.map((f: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Check size={10} color="#16a34a" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 13, color: '#475569' }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* Ideal para */}
              <div style={{ background: samePlanAnnual.popular ? '#eff6ff' : samePlanAnnual.id === 'Power' ? '#fffbeb' : '#f8fafc', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: samePlanAnnual.accent, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 3px' }}>Ideal para</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: samePlanAnnual.popular ? '#1d4ed8' : samePlanAnnual.id === 'Power' ? '#b45309' : '#475569', margin: 0 }}>{samePlanAnnual.idealFor}</p>
              </div>

              {/* CTA */}
              <button
                onClick={e => { e.stopPropagation(); handleSelect(samePlanAnnual, { forceAnnual: true }); }}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                  background: samePlanAnnual.popular ? '#0047FF' : samePlanAnnual.id === 'Power' ? '#f59e0b' : '#0f172a',
                  color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                Seleccionar plan →
              </button>
            </div>
          )}

          {/* Planes superiores, afectados por el toggle */}
          {higherPlans.map(plan => {
            const displayPrice = isAnnual ? plan.annualMonthly : plan.price;
            return (
              <div
                key={plan.id}
                onClick={() => handleSelect(plan)}
                style={{
                  position: 'relative', display: 'flex', flexDirection: 'column',
                  background: 'white', borderRadius: 20, border: `2px solid ${plan.border}`,
                  padding: '28px 24px 24px', cursor: 'pointer',
                  boxShadow: plan.popular ? `0 8px 32px ${plan.accent}22` : '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px ${plan.accent}33`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = plan.popular ? `0 8px 32px ${plan.accent}22` : '0 2px 8px rgba(0,0,0,0.06)'; }}
              >
                {/* Badge solo para populares, nunca para "cambia a anual" */}
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: plan.badgeBg, color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 14px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1 }}>
                    <Zap size={9} /> Más Popular
                  </div>
                )}

                {/* Plan name */}
                <p style={{ fontSize: 11, fontWeight: 800, color: plan.accent, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px' }}>{plan.name}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', borderRadius: 20, padding: '4px 10px', marginBottom: 16, width: 'fit-content' }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{plan.credits}</span>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 52, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>${displayPrice.toFixed(2)}</span>
                    <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>/mo</span>
                  </div>
                  {isAnnual && <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Facturado como ${plan.annualPrice}/año</p>}
                </div>

                {/* Features */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Check size={10} color="#16a34a" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 13, color: '#475569' }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* Ideal para */}
                <div style={{ background: plan.popular ? '#eff6ff' : plan.id === 'Power' ? '#fffbeb' : '#f8fafc', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: plan.accent, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 3px' }}>Ideal para</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: plan.popular ? '#1d4ed8' : plan.id === 'Power' ? '#b45309' : '#475569', margin: 0 }}>{plan.idealFor}</p>
                </div>

                {/* CTA */}
                <button
                  onClick={e => { e.stopPropagation(); handleSelect(plan); }}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                    background: plan.popular ? '#0047FF' : plan.id === 'Power' ? '#f59e0b' : '#0f172a',
                    color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  Seleccionar plan →
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 32 }}>
          🔒 El upgrade es inmediato y sin período de prueba. Se te cobrará el plan completo desde hoy.
        </p>
      </div>
    </div>
  );
}

