import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Summary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // EXTRAEMOS LOS DATOS O USAMOS LOS NUEVOS VALORES BASE OBLIGATORIOS
  const planName = location.state?.planName || 'Pro';
  
  // LÓGICA DE PRECIO BLINDADA POR PLAN (STARTER: 19.90, PRO: 39.90, POWER: 99.00)
  const getOfficialPrice = (name: string) => {
    if (name === 'Power') return 99.00;
    if (name === 'Starter') return 19.90;
    return 39.90; // Default Pro
  };

  const getOfficialLimit = (name: string) => {
    if (name === 'Power') return 1400;
    if (name === 'Starter') return 150;
    return 400; // Default Pro
  };

  const planPrice = location.state?.price || getOfficialPrice(planName);
  const monthlyLimit = location.state?.monthlyLimit || getOfficialLimit(planName);
  
  const priceString = `$${Number(planPrice).toFixed(2)}`;

  const handleNext = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    navigate('/onboarding/payment', { 
      state: { 
        planName,
        price: planPrice,
        monthlyLimit
      } 
    });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center bg-background-light/90 dark:bg-background-dark/90 px-4 py-3 backdrop-blur-sm">
                <div 
                    onClick={() => !isNavigating && navigate('/onboarding/plan')}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer ${isNavigating ? 'opacity-30' : ''}`}
                >
                    <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{fontSize: '24px'}}>arrow_back</span>
                </div>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10">Resumen de Pedido</h2>
            </div>
            
            <div className="flex flex-col gap-2 px-6 pt-2 pb-4">
                <div className="flex justify-between items-center">
                    <p className="text-primary dark:text-blue-400 text-sm font-bold leading-normal">Paso 3 de 3</p>
                    <p className="text-gray-400 text-xs font-medium">Finalizar</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#dbdfe6] dark:bg-gray-700 overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500 ease-out" style={{width: '100%'}}></div>
                </div>
            </div>

            <div className="flex-1 flex flex-col px-6 pb-40 overflow-y-auto">
                <div className="pb-6 pt-2">
                    <h1 className="text-[#111318] dark:text-white tracking-tight text-[28px] font-extrabold leading-tight text-left mb-2">Revisa tu suscripción</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-relaxed">Confirma los detalles antes de proceder al pago seguro.</p>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#1A2230] p-0 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-primary/40 mb-8 transition-transform hover:scale-[1.01] duration-300">
                    <div className="flex items-center gap-4 p-5 border-b border-gray-100 dark:border-gray-700/50">
                        <div className="relative size-12 shrink-0 rounded-full border border-gray-100 dark:border-gray-600 shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center text-2xl">
                           🇨🇱
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#111318] dark:text-white text-base font-bold leading-tight">Número de Chile (+56)</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-normal mt-0.5">Infraestructura Física Real</p>
                        </div>
                    </div>
                    <div className="p-5 flex flex-col gap-5">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex flex-col">
                                <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-1">Plan Seleccionado</span>
                                <span className="text-[#111318] dark:text-white font-bold text-base">{planName} ({monthlyLimit} Créditos)</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[#111318] dark:text-white font-bold text-base whitespace-nowrap">{priceString} / mes</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-3.5 flex items-start gap-3">
                            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" style={{fontSize: '20px'}}>check_circle</span>
                            <div className="flex flex-col">
                                <p className="text-emerald-800 dark:text-emerald-300 text-sm font-bold leading-tight mb-1">Prueba Gratuita Activa</p>
                                <p className="text-emerald-700 dark:text-emerald-400/80 text-xs font-medium leading-relaxed">No se te cobrará nada durante los primeros 15 días.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mb-6">
                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-sm font-medium">
                        <span>Subtotal Mensual</span>
                        <span>{priceString}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                        <span>Descuento Trial (15 días)</span>
                        <span>-{priceString}</span>
                    </div>
                    <div className="my-2 h-px w-full bg-gray-200 dark:bg-gray-800"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-[#111318] dark:text-white text-lg font-bold">Total hoy</span>
                        <span className="text-[#111318] dark:text-white text-2xl font-extrabold tracking-tight">$0.00</span>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/80 dark:bg-[#101622]/85 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-5 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={handleNext}
                    disabled={isNavigating}
                    className={`relative group w-full overflow-hidden rounded-xl bg-primary p-4 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] hover:shadow-blue-500/40 ${isNavigating ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    <div className="relative flex w-full items-center justify-center">
                        <span className="text-white text-[17px] font-bold tracking-wide">
                            {isNavigating ? 'Cargando Pasarela...' : 'Iniciar Prueba Gratis'}
                        </span>
                        {!isNavigating && (
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

export default Summary;