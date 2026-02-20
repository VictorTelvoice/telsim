
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Smartphone,
  Zap,
  CheckCircle2,
  Lock,
  Sparkles,
  CreditCard
} from 'lucide-react';

const UpgradeSummary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInstantSuccess, setIsInstantSuccess] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{status: string, brand: string, last4: string} | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(true);

  const upgradeData = location.state;

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/get-payment-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await response.json();
        if (data.status === 'success') {
          setPaymentInfo(data);
        }
      } catch (err) {
        console.error("Error al obtener info de pago:", err);
      } finally {
        setLoadingPayment(false);
      }
    };

    fetchPaymentInfo();
  }, [user]);

  if (!user || !upgradeData) return <Navigate to="/dashboard/numbers" replace />;

  const { phoneNumber, planName, price, limit, stripePriceId, slot_id } = upgradeData;

  const handleConfirmUpgrade = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: stripePriceId,
          userId: user.id,
          phoneNumber: phoneNumber,
          planName: planName,
          isUpgrade: true,
          slot_id: slot_id,
          monthlyLimit: limit
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Fallo en la comunicación con Stripe.");

      // ESCENARIO A: Upgrade Instantáneo (One-Click)
      if (data.instant) {
        setIsInstantSuccess(true);
        setIsProcessing(false);
        return;
      }

      // ESCENARIO B: Redirección normal
      if (data.url) {
        window.location.href = data.url;
      }

    } catch (err: any) {
      console.error("Upgrade error:", err);
      alert(err.message || "Error al procesar la mejora del plan.");
      setIsProcessing(false);
    }
  };

  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
      return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    return num.startsWith('+') ? num : `+${num}`;
  };

  const getButtonText = () => {
    if (isProcessing) return 'Sincronizando Hardware...';
    if (loadingPayment) return 'Confirmar Upgrade';
    if (paymentInfo) {
      const brandFormatted = paymentInfo.brand.charAt(0).toUpperCase() + paymentInfo.brand.slice(1);
      return `Actualizar ahora (${brandFormatted} •••• ${paymentInfo.last4})`;
    }
    return 'Confirmar Upgrade';
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <button 
                    onClick={() => !isProcessing && navigate(-1)}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${isProcessing ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                    <ArrowLeft className="size-5" />
                </button>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10 uppercase tracking-tighter">Confirmar Mejora</h2>
            </div>

            <div className="flex-1 flex flex-col px-6 pt-8 pb-48 overflow-y-auto no-scrollbar">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Resumen de Upgrade</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed italic">Cambio de potencia en tiempo real.</p>
                </div>

                <div className="bg-white dark:bg-[#1A2230] rounded-[2rem] border border-gray-100 dark:border-gray-700/50 p-6 shadow-soft mb-6 relative overflow-hidden group">
                    <div className="flex flex-col gap-1 mb-4">
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Hardware a potenciar</span>
                        <span className="text-2xl font-mono font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                            {formatPhoneNumber(phoneNumber)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                        <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Zap className="size-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nueva Configuración</span>
                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase">Plan {planName} • {limit} SMS</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 space-y-4 border border-slate-100 dark:border-slate-800/50">
                    <div className="flex justify-between items-center text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Diferencia Mensual</span>
                        <span className="text-slate-900 dark:text-white font-mono text-sm">${Number(price).toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Total hoy</span>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">${Number(price).toFixed(2)}</span>
                    </div>
                </div>

                {paymentInfo && (
                  <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="size-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                       <CreditCard className="size-4 text-emerald-500" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Pago con un clic activado</p>
                       <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Usando {paymentInfo.brand} terminada en {paymentInfo.last4}</p>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex items-center gap-3 px-2">
                    <div className={`size-2 rounded-full ${paymentInfo ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500 animate-pulse'}`}></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed">
                        {paymentInfo 
                          ? 'El cargo se procesará instantáneamente de forma segura.' 
                          : 'Si ya tienes una tarjeta guardada, el cargo se procesará inmediatamente usando One-Click Checkout.'}
                    </p>
                </div>
            </div>

            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-6 pb-10">
                <button 
                    onClick={handleConfirmUpgrade}
                    disabled={isProcessing}
                    className={`group w-full ${paymentInfo ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-primary hover:bg-blue-700 shadow-button'} transition-all text-white font-bold h-16 rounded-2xl flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70`}
                >
                    <div className="w-12 flex items-center justify-center">
                        {isProcessing && <Loader2 className="size-5 animate-spin text-white/80" />}
                        {!isProcessing && paymentInfo && <CreditCard className="size-5 text-white/40" />}
                    </div>
                    <span className="text-[15px] tracking-wide uppercase font-black flex-1 text-center px-2 leading-tight">
                        {getButtonText()}
                    </span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Sparkles className="size-5 text-white" />
                    </div>
                </button>
                {paymentInfo && !isProcessing && (
                  <p className="mt-3 text-[9px] font-black text-center text-slate-400 uppercase tracking-[0.2em] animate-in fade-in duration-700">
                    Se cargará a tu método de pago predeterminado
                  </p>
                )}
                <div className="mt-4 flex items-center justify-center gap-1.5 opacity-40">
                    <ShieldCheck className="size-3" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Protocolo de Pago Instantáneo Seguro</p>
                </div>
            </div>
        </div>

        {/* MODAL DE ÉXITO INSTANTÁNEO */}
        {isInstantSuccess && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-500">
                <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 p-10 flex flex-col items-center text-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                        <div className="size-20 rounded-3xl bg-emerald-500 flex items-center justify-center text-white relative z-10">
                            <CheckCircle2 className="size-10" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">¡Plan Actualizado!</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Tu línea ya cuenta con la nueva potencia asignada en el Ledger.</p>
                    
                    <button 
                        onClick={() => navigate('/dashboard/numbers')}
                        className="w-full h-14 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95"
                    >
                        Entrar al Panel
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default UpgradeSummary;
