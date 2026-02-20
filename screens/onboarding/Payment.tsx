import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, ShieldCheck, Lock, AlertCircle } from 'lucide-react';

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const planData = location.state || {};
  const planName = planData.planName || 'Pro';
  const price = planData.price || 39.90;
  const monthlyLimit = planData.monthlyLimit || 400;
  const stripePriceId = planData.stripePriceId || 'price_1SzJS9EADSrtMyiagxHUI2qM';

  const handleCheckout = async () => {
    if (!user) return;
    setIsProcessing(true);

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: stripePriceId,
          userId: user.id,
          planName: planName,
          monthlyLimit: monthlyLimit,
          isUpgrade: false
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "No se pudo generar la sesión de pago.");
      }

      window.location.href = data.url;

    } catch (err: any) {
      console.error("Payment Error:", err);
      alert(err.message || "Error al conectar con el servidor de pagos.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <button 
                    onClick={() => !isProcessing && navigate(-1)}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${isProcessing ? 'opacity-30' : ''}`}
                >
                    <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{fontSize: '24px'}}>arrow_back</span>
                </button>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10 uppercase tracking-tighter">Pago Seguro</h2>
            </div>

            <div className="flex-1 flex flex-col px-6 pt-8 pb-40 overflow-y-auto no-scrollbar">
                <div className="bg-white dark:bg-[#1A2230] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6 shadow-sm mb-10 flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Suscripción Seleccionada</span>
                        <span className="text-[#111318] dark:text-white font-black text-xl uppercase tracking-tight">{planName}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[#111318] dark:text-white font-black text-xl">${Number(price).toFixed(2)}</span>
                        <span className="text-emerald-500 text-[9px] font-black bg-emerald-500/10 px-2 py-1 rounded-lg uppercase">Prueba 7 días</span>
                    </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-[#111318] dark:text-white font-black text-[13px] uppercase tracking-[0.1em] mb-4">Nodo de Pago</h3>
                  <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border-2 border-primary/20 flex flex-col items-center gap-6 text-center">
                    <div className="size-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-7" alt="Stripe" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                      Conexión encriptada con el servidor.<br/>Tus datos están protegidos por Stripe.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-4">
                    <ShieldCheck className="size-6 text-primary shrink-0" />
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        Confirmación: No se realizará ningún cargo hasta que finalice el periodo de prueba de 7 días.
                    </p>
                </div>
            </div>

            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-6 pb-10">
                <button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70"
                >
                    <div className="w-12 flex items-center justify-center">
                        {isProcessing && <Loader2 className="size-5 animate-spin text-white/80" />}
                    </div>
                    <span className="text-[17px] tracking-wide uppercase">
                        {isProcessing ? 'Conectando...' : 'Pagar con Stripe'}
                    </span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Lock className="size-6 text-white" />
                    </div>
                </button>
                <div className="mt-4 flex items-center justify-center gap-2 opacity-40">
                    <p className="text-[9px] text-center font-black uppercase tracking-widest">
                        TELSIM SECURE CHECKOUT v3.2 (SERVER-SIDE)
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Payment;