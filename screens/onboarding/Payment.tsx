import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Strict lock for the confirmation action (immediate protection)
  const isProcessingRef = useRef(false);
  
  const planName = location.state?.planName || 'Pro';
  const price = location.state?.price || 39.90;
  const monthlyLimit = location.state?.monthlyLimit || 400;

  const handleSubscribe = () => {
    // 1. Strict guard: If already processing, stop execution immediately
    if (isProcessingRef.current) return;

    // 2. Lock the process and update UI state
    isProcessingRef.current = true;
    setIsProcessing(true);

    let success = false;
    try {
        // 3. Proceed to processing
        // CORRECCIÓN: Se envía TODO el estado para evitar que el siguiente componente use fallbacks incorrectos
        navigate('/onboarding/processing', { 
            state: { 
                planName,
                price,
                monthlyLimit
            } 
        });
        success = true;
    } catch (error) {
        console.error("Navigation error:", error);
    } finally {
        // 4. Only unlock if it wasn't successful (e.g. navigation failed)
        if (!success) {
            isProcessingRef.current = false;
            setIsProcessing(false);
        }
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
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10">Pago Seguro</h2>
            </div>

            <div className="flex-1 flex flex-col px-6 pt-6 pb-40 overflow-y-auto no-scrollbar">
                <div className="bg-white dark:bg-[#1A2230] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 shadow-sm mb-8 flex justify-between items-center transition-transform hover:scale-[1.01] duration-300">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">Plan</span>
                        <span className="text-[#111318] dark:text-white font-bold text-[15px]">{planName}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[#111318] dark:text-white font-bold text-[15px]">${Number(price).toFixed(2)} hoy</span>
                        <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Prueba de 15 días</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-5 px-1">
                    <h3 className="text-[#111318] dark:text-white font-bold text-base">Detalles de la tarjeta</h3>
                    <div className="flex items-center gap-2 opacity-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider pt-0.5">Powered by</span>
                        <span className="font-extrabold text-[#635BFF] italic">Stripe</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Número de tarjeta</label>
                        <div className="relative flex items-center">
                            <input 
                                disabled={isProcessing}
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-[50px] pl-4 pr-24 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none ring-0 disabled:opacity-50" 
                                placeholder="0000 0000 0000 0000" 
                                type="text" 
                            />
                            <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                                <div className="h-6 w-9 bg-white dark:bg-gray-100 rounded border border-gray-200 flex items-center justify-center p-0.5 text-[8px] font-bold text-blue-800">VISA</div>
                                <div className="h-6 w-9 bg-white dark:bg-gray-100 rounded border border-gray-200 flex items-center justify-center p-0.5">
                                    <div className="flex -space-x-1">
                                        <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">MM / AA</label>
                            <input 
                                disabled={isProcessing}
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-[50px] pl-4 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none disabled:opacity-50" 
                                placeholder="MM / AA" 
                                type="text" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">CVC</label>
                            <div className="relative">
                                <input 
                                    disabled={isProcessing}
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-[50px] pl-4 pr-10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none disabled:opacity-50" 
                                    placeholder="123" 
                                    type="text" 
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <span className="material-symbols-outlined" style={{fontSize: '20px'}}>credit_card</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Nombre en la tarjeta</label>
                        <input 
                            disabled={isProcessing}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-[50px] pl-4 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none disabled:opacity-50" 
                            placeholder="Como aparece en la tarjeta" 
                            type="text" 
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">País o región</label>
                        <div className="relative">
                            <select 
                                disabled={isProcessing}
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A2230] text-[#111318] dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-[50px] pl-4 pr-10 appearance-none transition-all outline-none disabled:opacity-50"
                            >
                                <option>Estados Unidos</option>
                                <option selected>Chile</option>
                                <option>México</option>
                                <option>España</option>
                                <option>Colombia</option>
                                <option>Argentina</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 flex items-center">
                                <span className="material-symbols-outlined" style={{fontSize: '24px'}}>keyboard_arrow_down</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-8 mb-4 opacity-80">
                    <div className="flex size-7 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{fontSize: '16px'}}>lock</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Información encriptada y segura</span>
                </div>
            </div>

            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/80 dark:bg-[#101622]/85 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-5 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <p className="text-[11px] text-center text-gray-500 dark:text-gray-400 mb-4 px-2 font-medium leading-relaxed">
                    No se realizará ningún cargo hasta que termine tu prueba de 15 días. Cancela en cualquier momento.
                </p>
                <button 
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                    className={`relative group w-full overflow-hidden rounded-xl bg-primary p-4 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] hover:shadow-blue-500/40 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    <div className="relative flex w-full items-center justify-center">
                        <span className="text-white text-[17px] font-bold tracking-wide">
                            {isProcessing ? 'Procesando...' : 'Confirmar Suscripción'}
                        </span>
                        {!isProcessing && (
                            <div className="absolute right-0 flex items-center justify-center rounded-full bg-white/20 p-1 transition-transform group-hover:translate-x-1 mr-2">
                                <span className="material-symbols-outlined text-white" style={{fontSize: '20px'}}>arrow_forward</span>
                            </div>
                        )}
                    </div>
                </button>
                <div className="mt-4 flex items-center justify-center gap-1.5 opacity-60">
                    <span className="material-symbols-outlined text-gray-500 dark:text-gray-400" style={{fontSize: '14px'}}>lock</span>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">Pagos procesados por Stripe. Conexión encriptada SSL.</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Payment;