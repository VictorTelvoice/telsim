import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Bloqueo atómico a nivel de UI para evitar que el usuario dispare múltiples navegaciones
  const isProcessingRef = useRef(false);
  
  const planName = location.state?.planName || 'Pro';
  const price = location.state?.price || 39.90;
  const monthlyLimit = location.state?.monthlyLimit || 400;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    
    // GUARDIA ATÓMICA: Si ya se está procesando, bloqueamos inmediatamente
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
        // Navegación hacia la pantalla de procesamiento donde ocurre el RPC
        navigate('/onboarding/processing', { 
            state: { planName, price, monthlyLimit } 
        });
    } catch (error) {
        console.error("Fallo de navegación:", error);
        isProcessingRef.current = false;
        setIsProcessing(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <div 
                    onClick={() => !isProcessing && navigate('/onboarding/summary')}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${isProcessing ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                    <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{fontSize: '24px'}}>arrow_back</span>
                </div>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10 uppercase tracking-tighter">Pago Seguro</h2>
            </div>

            <div className="flex-1 flex flex-col px-6 pt-8 pb-40 overflow-y-auto no-scrollbar">
                {/* Plan Summary Card */}
                <div className="bg-white dark:bg-[#1A2230] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6 shadow-sm mb-10 flex justify-between items-center transition-all">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Plan Seleccionado</span>
                        <span className="text-[#111318] dark:text-white font-black text-xl">{planName}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[#111318] dark:text-white font-black text-xl">${Number(price).toFixed(2)}</span>
                        <span className="text-emerald-500 text-[9px] font-black bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">7 días Gratis</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-6 px-1">
                    <h3 className="text-[#111318] dark:text-white font-black text-[11px] uppercase tracking-[0.2em]">Método de Pago</h3>
                    <div className="flex items-center gap-2 opacity-60">
                        <span className="text-[9px] uppercase font-bold text-gray-400">Gateway:</span>
                        <span className="font-extrabold text-[#635BFF] italic text-sm">Stripe</span>
                    </div>
                </div>

                {/* Card Form Mockup */}
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de tarjeta</label>
                        <div className="relative">
                            <input 
                                disabled={isProcessing}
                                className="block w-full rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary sm:text-sm h-14 pl-5 pr-24 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none disabled:opacity-50 font-bold" 
                                placeholder="0000 0000 0000 0000" 
                                type="text" 
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                <div className="h-6 w-9 bg-slate-50 dark:bg-white/10 rounded border border-slate-100 dark:border-white/10 flex items-center justify-center text-[8px] font-black text-blue-800 dark:text-white">VISA</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimiento</label>
                            <input 
                                disabled={isProcessing}
                                className="block w-full rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary sm:text-sm h-14 px-5 transition-all font-bold disabled:opacity-50" 
                                placeholder="MM / AA" 
                                type="text" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CVC</label>
                            <input 
                                disabled={isProcessing}
                                className="block w-full rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary sm:text-sm h-14 px-5 transition-all font-bold disabled:opacity-50" 
                                placeholder="123" 
                                type="text" 
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/10">
                        <ShieldCheck className="size-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Encriptación de Grado Bancario</span>
                    </div>
                </div>
            </div>

            {/* Bottom Button */}
            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-6 pb-10">
                <button 
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                    className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <div className="w-12 flex items-center justify-center">
                        {isProcessing && <Loader2 className="size-5 animate-spin text-white/80" />}
                    </div>
                    <span className="text-[17px] tracking-wide uppercase">
                        {isProcessing ? 'Sincronizando...' : 'Activar SIM'}
                    </span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <span className="material-symbols-outlined text-white">
                            {isProcessing ? 'sync' : 'arrow_forward'}
                        </span>
                    </div>
                </button>
                <div className="mt-4 flex items-center justify-center gap-2 opacity-40">
                    <Lock className="size-3" />
                    <p className="text-[9px] text-center font-black uppercase tracking-widest">
                        Sin cargos por 7 días. Cancela en cualquier momento.
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Payment;