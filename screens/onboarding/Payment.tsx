import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Loader2, 
  ShieldCheck, 
  Lock, 
  Zap, 
  ChevronRight, 
  ArrowLeft,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{status: string, brand: string, last4: string} | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  
  const planData = location.state || {};
  const planName = planData.planName || 'Pro';
  const price = planData.price || 39.90;
  const monthlyLimit = planData.monthlyLimit || 400;
  const stripePriceId = planData.stripePriceId || 'price_1SzJS9EADSrtMyiagxHUI2qM';

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
        if (data.status === 'success') setPaymentInfo(data);
      } catch (err) { console.error(err); } finally { setLoadingPayment(false); }
    };
    fetchPaymentInfo();
  }, [user]);

  const handleCheckout = async (forceManual: boolean = false) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: stripePriceId, userId: user.id, planName, monthlyLimit, isUpgrade: false, forceManual
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.instant && data.subscriptionId) {
        navigate(`/onboarding/processing?id=${data.subscriptionId}&plan=${planName}`);
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      alert(err.message || "Error de conexión.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl pb-32">
            <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => !isProcessing && navigate(-1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"><ArrowLeft className="size-5" /></button>
                <h2 className="text-[11px] font-black flex-1 text-center pr-10 uppercase tracking-[0.2em]">Caja de Seguridad</h2>
            </div>

            <div className="flex-1 flex flex-col px-5 pt-5 overflow-y-auto no-scrollbar">
                <div className="mb-5">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-1">Finalizar Suscripción</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic">Nueva infraestructura lista para despliegue.</p>
                </div>

                <div className="bg-white dark:bg-[#1A2230] rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-soft mb-6 flex justify-between items-center group">
                    <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-widest font-black text-primary mb-0.5">Nodo {planName}</span>
                        <span className="text-slate-900 dark:text-white font-black text-xl tracking-tighter uppercase">{planName}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-slate-900 dark:text-white font-black text-xl tracking-tighter tabular-nums">${Number(price).toFixed(2)}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">USD / Mes</span>
                    </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[#111318] dark:text-white font-black text-[10px] uppercase tracking-[0.2em] ml-1">Medio de pago</h3>
                  {paymentInfo && !isProcessing ? (
                    <div className="p-5 bg-emerald-50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                      <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-emerald-500 border border-emerald-100 dark:border-emerald-800"><Zap className="size-5" /></div>
                          <div>
                             <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest leading-none mb-0.5">Pago Rápido Activo</p>
                             <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 capitalize">{paymentInfo.brand} •• {paymentInfo.last4}</p>
                          </div>
                      </div>
                      <button onClick={() => handleCheckout(false)} disabled={isProcessing} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black h-12 rounded-xl shadow-lg flex items-center justify-between px-2 active:scale-95 transition-all">
                          <div className="w-8"></div>
                          <span className="text-[12px] uppercase tracking-[0.1em]">Confirmar y Pagar</span>
                          <div className="size-8 bg-white/20 rounded-lg flex items-center justify-center"><ChevronRight className="size-4" /></div>
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 text-center">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-5 opacity-40" alt="Stripe" />
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed italic">{loadingPayment ? 'Sincronizando pasarela...' : 'Conexión segura SSL. Tus datos están protegidos por Stripe.'}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-3">
                    <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed">No se realizará ningún cargo hasta que finalice el periodo de prueba de 7 días. Puedes gestionar desde el panel.</p>
                </div>
            </div>

            <div className="fixed bottom-0 z-[60] w-full max-w-md bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-5 pb-8 flex flex-col gap-3">
                {(!paymentInfo || isProcessing) && (
                  <button onClick={() => handleCheckout(true)} disabled={isProcessing} className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-black h-14 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70">
                      <div className="w-10 flex items-center justify-center">{isProcessing && <Loader2 className="size-4 animate-spin text-white/80" />}</div>
                      <span className="text-[14px] tracking-wide uppercase">{isProcessing ? 'Sincronizando...' : 'Pagar con Stripe'}</span>
                      <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors"><Lock className="size-4 text-white" /></div>
                  </button>
                )}
                {paymentInfo && !isProcessing && (
                  <button onClick={() => handleCheckout(true)} className="w-full text-center text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] hover:text-primary transition-all">Pagar con otra tarjeta (Manual)</button>
                )}
                <div className="flex items-center justify-center gap-1.5 opacity-20"><ShieldCheck className="size-3" /><p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500">Gateway Verificado v4.0</p></div>
            </div>
        </div>
    </div>
  );
};

export default Payment;