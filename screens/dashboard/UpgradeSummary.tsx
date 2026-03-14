import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Check, Zap, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PLAN_CONFIG: Record<string, any> = {
  Starter: {
    color: '#64748b', bg: '#f8fafc', border: '#e2e8f0',
    features: ['150 SMS mensuales', 'Número SIM Real', 'Notificaciones en tiempo real', 'Soporte vía Ticket'],
  },
  Pro: {
    color: '#0047FF', bg: '#eff6ff', border: '#0047FF',
    features: ['400 SMS mensuales', 'SMS 100% automatizados', 'Acceso a API y Webhooks', 'Soporte prioritario Chat en vivo'],
  },
  Power: {
    color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b',
    features: ['1,400 SMS mensuales', 'Seguridad y Control Empresarial', 'Integraciones Personalizadas', 'Soporte Prioritario 24/7'],
  },
};

export default function UpgradeSummary() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    phoneNumber, slot_id, planName, currentPlanName,
    stripePriceId, limit, price, isAnnual,
  } = state || {};

  const config = PLAN_CONFIG[planName] || PLAN_CONFIG.Starter;
  const displayPrice = isAnnual ? price : price;
  const billingLabel = isAnnual ? '/año' : '/mes';

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

      // Redirigir a Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err: any) {
      alert(err.message || 'Error al procesar el upgrade');
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 32px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Cambiar plan
        </button>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Confirmar upgrade</span>
        <span style={{ fontSize: 12, background: '#f1f5f9', color: '#64748b', padding: '2px 10px', borderRadius: 20, fontFamily: 'monospace' }}>{phoneNumber}</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 32, alignItems: 'start' }}>

        {/* LEFT: Plan details */}
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Confirma tu nuevo plan</h1>
          <p style={{ color: '#94a3b8', fontSize: 15, margin: '0 0 32px' }}>
            Cambias de <strong style={{ color: '#475569' }}>{currentPlanName || 'Starter'}</strong> a <strong style={{ color: config.color }}>{planName}</strong>. El cambio es inmediato.
          </p>

          {/* Plan card */}
          <div style={{ background: 'white', borderRadius: 20, border: `2px solid ${config.border}`, padding: 28, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: config.color, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 4px' }}>{planName}</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 }}>{limit?.toLocaleString()} créditos/mes</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: '#0f172a' }}>${displayPrice.toFixed(2)}</span>
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{billingLabel}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {config.features.map((f: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={11} color="#16a34a" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: 13, color: '#475569' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info inmediato */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Zap size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#15803d', margin: '0 0 2px' }}>Activación inmediata</p>
              <p style={{ fontSize: 12, color: '#16a34a', margin: 0 }}>Tu línea se reconfigurará instantáneamente con las nuevas capacidades {planName}. Sin tiempo de espera.</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Summary box */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>Resumen del pedido</h3>

            {/* Number */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} color="#64748b" />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, margin: 0 }}>NÚMERO SIM</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'monospace' }}>{phoneNumber}</p>
              </div>
            </div>

            {/* Plan change */}
            <div style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>Plan anterior</span>
                <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through' }}>{currentPlanName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>Nuevo plan</span>
                <span style={{ fontSize: 13, color: config.color, fontWeight: 700 }}>{planName}</span>
              </div>
            </div>

            {/* Billing */}
            <div style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Facturación</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{isAnnual ? 'Anual' : 'Mensual'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Período de prueba</span>
                <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Sin trial</span>
              </div>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 20px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Total hoy</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>${displayPrice.toFixed(2)}</span>
            </div>

            {/* CTA */}
            <button
              onClick={handleConfirmUpgrade}
              disabled={isProcessing}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
                background: isProcessing ? '#94a3b8' : config.color,
                color: 'white', fontSize: 15, fontWeight: 800, cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s',
              }}
            >
              {isProcessing ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Procesando...</>
              ) : (
                <>Confirmar upgrade a {planName} →</>
              )}
            </button>

            <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: '12px 0 0' }}>
              🔒 Pago seguro. El cobro es inmediato y sin período de prueba.
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}