import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Bloqueo estricto a nivel de referencia para evitar race conditions antes de navegación
  const isProcessingRef = useRef(false);
  
  const planName = location.state?.planName || 'Pro';
  const price = location.state?.price || 39.90;
  const monthlyLimit = location.state?.monthlyLimit || 400;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. GUARDIA DE UI: Si ya se hizo clic, no hacer nada
    if (isProcessingRef.current) return;

    // 2. BLOQUEO INMEDIATO
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
        // 3. NAVEGACIÓN A PROCESSING (Donde ocurre el RPC)
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
            <div className="sticky top-0 z-20 flex items-center bg-background-light/90 dark:bg-background-dark/90 px-4 py-3 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50">
                <div 
                    onClick={() => !isProcessing && navigate('/onboarding/summary')}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${isProcessing ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                    <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{fontSize: '24px'}}>arrow_back</span>
                </div>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10 uppercase tracking-tighter">Pago Seguro</h2>
            </div>

            <div className="flex-1 flex flex-col px-6 pt-6 pb-40 overflow-y-auto no-scrollbar">
                <div className="bg-white dark:bg-[#1A2230] rounded-2xl border border-gray-200 dark:border-gray-700/50 p-5 shadow-sm mb-8 flex justify-between items-center transition-all hover:scale-[1.01]">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-black text-slate-400 dark:text-slate-500">Plan Seleccionado</span>
                        <span className="text-[#111318] dark:text-white font-black text-lg">{planName}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[#111318] dark:text-white font-black text-lg">${Number(price).toFixed(2)}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full uppercase">15 días Gratis</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-5 px-1">
                    <h3 className="text-[#111318] dark:text-white font-black text-sm uppercase tracking-widest">Tarjeta de Crédito</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Gateway:</span>
                        <span className="font-extrabold text-[#635BFF] italic text-sm">Stripe</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Número de tarjeta</label>
                        <div className="relative">
                            <input 
                                disabled={isProcessing}
                                className="block w-full rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-14 pl-4 pr-24 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none disabled:opacity-50 font-bold" 
                                placeholder="0000 0000 0000 0000" 
                                type="text" 
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                <div className="h-6 w-9 bg-slate-50 dark:bg-white/10 rounded flex items-center justify-center text-[8px] font-black text-blue-800 dark:text-white border border-slate-200 dark:border-white/10">VISA</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Vencimiento</label>
                            <input 
                                disabled={isProcessing}
                                className="block w-full rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-14 pl-4 transition-all font-bold disabled:opacity-50" 
                                placeholder="MM / AA" 
                                type="text" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">CVC</label>
                            <input 
                                disabled={isProcessing}
                                className="block w-full rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-14 pl-4 transition-all font-bold disabled:opacity-50" 
                                placeholder="123" 
                                type="text" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Titular</label>
                        <input 
                            disabled={isProcessing}
                            className="block w-full rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-14 pl-4 transition-all font-bold disabled:opacity-50" 
                            placeholder="Como aparece en el plástico" 
                            type="text" 
                        />
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 opacity-60">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{fontSize: '18px'}}>lock</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">AES-256 Cloud Encryption</span>
                </div>
            </div>

            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/90 dark:bg-background-dark/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 p-6 pb-10">
                <button 
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                    className={`relative group w-full overflow-hidden rounded-2xl bg-primary p-4 h-16 shadow-button transition-all active:scale-[0.98] ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
                >
                    <div className="relative flex w-full items-center justify-center gap-3">
                        {isProcessing ? (
                            <>
                                <Loader2 className="size-5 animate-spin text-white/80" />
                                <span className="text-white text-[15px] font-black uppercase tracking-widest">Procesando...</span>
                            </>
                        ) : (
                            <>
                                <span className="text-white text-[15px] font-black uppercase tracking-widest">Activar Puerto Físico</span>
                                <span className="material-symbols-outlined text-white transition-transform group-hover:translate-x-1" style={{fontSize: '20px'}}>arrow_forward</span>
                            </>
                        )}
                    </div>
                </button>
                <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 mt-4 font-black uppercase tracking-widest">
                    Sin cargos durante los primeros 15 días. Cancela en un clic.
                </p>
            </div>
        </div>
    </div>
  );
};

export default Payment;