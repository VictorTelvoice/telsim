import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Zap, Calendar, CreditCard, ArrowRight, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
  const dashboardDestination = isMobileDeviceUA() ? '/dashboard/numbers' : '/web';

  // Leer params de la URL: ?slotId=8A&planName=Starter&isAnnual=true
  const params = new URLSearchParams(location.search);
  const planName = params.get('planName') || 'Pro';
  const isAnnual  = params.get('isAnnual') === 'true';
  const slotId    = params.get('slotId') || '';

  const credits = PLAN_CREDITS[planName] ?? 400;
  const price   = PLAN_PRICES[planName]?.[isAnnual ? 'annual' : 'monthly'] ?? 0;
  const billingLabel = isAnnual ? 'Anual' : 'Mensual';
  const planGradient = PLAN_COLORS[planName] ?? 'from-blue-500 to-blue-600';

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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* Header con gradiente del plan */}
          <div className={`bg-gradient-to-r ${planGradient} p-8 text-white text-center`}>
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 rounded-full p-4">
                <CheckCircle className="w-12 h-12 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-1">¡Upgrade exitoso!</h1>
            <p className="text-white/80 text-sm">
              Tu línea ha sido actualizada al plan <strong>{planName} · {billingLabel}</strong>
            </p>
          </div>

          {/* Detalles del plan */}
          <div className="p-6 space-y-4">

            {/* Fila plan activado */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Star className="w-4 h-4" />
                Plan activado
              </div>
              <span className="font-semibold text-gray-900">{planName} · {billingLabel}</span>
            </div>

            {/* Fila créditos */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Zap className="w-4 h-4" />
                Créditos SMS / mes
              </div>
              <span className="font-semibold text-gray-900">{credits.toLocaleString()} SMS</span>
            </div>

            {/* Fila facturación */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar className="w-4 h-4" />
                Facturación
              </div>
              <span className="font-semibold text-gray-900">{billingLabel}</span>
            </div>

            {/* Fila monto */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <CreditCard className="w-4 h-4" />
                Monto cobrado
              </div>
              <span className="font-semibold text-gray-900">
                ${price.toFixed(2)} {isAnnual ? '/ año' : '/ mes'}
              </span>
            </div>

            {/* Fila estado */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                Estado
              </div>
              <span className="flex items-center gap-1.5 text-green-600 font-semibold text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                Activo inmediatamente
              </span>
            </div>

          </div>

          {/* Footer con botón */}
          <div className="px-6 pb-6 space-y-3">
            <button
              onClick={() => navigate(dashboardDestination)}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              Ir a Mis SIMs
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-xs text-gray-400">
              Redirigiendo automáticamente en {countdown}s
            </p>
          </div>

        </div>

        {/* Badge inferior */}
        <p className="text-center text-xs text-gray-400 mt-4">
          🔒 Pago procesado de forma segura por Stripe
        </p>

      </div>
    </div>
  );
}
