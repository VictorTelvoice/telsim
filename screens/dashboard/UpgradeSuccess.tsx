import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Zap } from 'lucide-react';

const PLAN_CONFIG: Record<string, any> = {
  Starter: { color: '#64748b', bg: '#f8fafc' },
  Pro: { color: '#0047FF', bg: '#eff6ff' },
  Power: { color: '#f59e0b', bg: '#fffbeb' },
};

export default function UpgradeSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { phoneNumber, planName, price, isAnnual, limit } = state || {};
  const config = PLAN_CONFIG[planName] || PLAN_CONFIG.Starter;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ maxWidth: 560, width: '100%', background: 'white', borderRadius: 24, border: '1px solid #e2e8f0', padding: 48, textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={36} color="#16a34a" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>¡Upgrade exitoso!</h1>
        <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 32px' }}>
          Tu SIM <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{phoneNumber}</span> ha sido actualizada al plan <span style={{ fontWeight: 800, color: config.color }}>{planName}</span>.
        </p>
        <div style={{ background: config.bg, borderRadius: 16, padding: '20px 24px', marginBottom: 32, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Plan activado</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: config.color }}>{planName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Créditos disponibles</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{limit?.toLocaleString()} SMS/mes</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Monto cobrado</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>${price?.toFixed(2)} {isAnnual ? '/año' : '/mes'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Estado</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={12} /> Activo inmediatamente
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate('/web')}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: config.color, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          Ir a Mis SIMs <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
