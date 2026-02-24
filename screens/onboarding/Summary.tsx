import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Summary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  
  const planData = useMemo(() => {
    if (location.state && location.state.planName) return location.state;
    
    const savedPlanId = localStorage.getItem('selected_plan');
    if (savedPlanId) {
      const mapping: Record<string, any> = {
        starter: { planName: 'Starter', stripePriceId: 'price_1SzJRLEADSrtMyiaQaDEp44E' },
        pro:     { planName: 'Pro',     stripePriceId: 'price_1SzJS9EADSrtMyiagxHUI2qM' },
        power:   { planName: 'Power',   stripePriceId: 'price_1SzJSbEADSrtMyiaPEMzNKUe' }
      };
      return mapping[savedPlanId] || {};
    }
    return {};
  }, [location.state]);

  const planName = planData.planName || 'Pro';
  const stripePriceId = planData.stripePriceId || 'price_1SzJS9EADSrtMyiagxHUI2qM';
  
  // Clear the saved plan once it's been loaded into the component state
  React.useEffect(() => {
    localStorage.removeItem('selected_plan');
  }, []);

  const planDetails = useMemo(() => {
    const plans: Record<string, { price: number; limit: number; features: string[] }> = {
      Starter: { 
        price: 19.90, 
        limit: 150,
        features: ['Número SIM Real', 'Notificaciones tiempo real', 'Soporte vía Ticket']
      },
      Pro: { 
        price: 39.90, 
        limit: 400,
        features: ['API & Webhooks', 'Automatización 100%', 'Soporte vía Chat']
      },
      Power: { 
        price: 99.00, 
        limit: 1400,
        features: ['Seguridad Empresarial', 'Escalabilidad P2P', 'Soporte 24/7']
      }
    };
    return plans[planName] || plans.Pro;
  }, [planName]);

  const billingDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  }, []);

  const handleNext = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigate('/onboarding/payment', { 
        state: { 
            planName,
            price: planDetails.price,
            monthlyLimit: planDetails.limit,
            stripePriceId
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

            <div className="flex-1 flex flex-col px-6 pb-44 overflow-y-auto no-scrollbar">
                <div className="pb-6 pt-2">
                    <h1 className="text-[#111318] dark:text-white tracking-tight text-[28px] font-extrabold leading-tight text-left mb-2">Revisa tu suscripción</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-relaxed">Confirma los detalles antes de proceder al pago seguro.</p>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-[#1A2230] p-0 shadow-soft border border-slate-100 dark:border-slate-800 mb-6">
                    <div className="flex items-center gap-4 p-5 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="size-12 shrink-0 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center text-2xl">
                           🇨🇱
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#111318] dark:text-white text-[15px] font-bold leading-tight uppercase tracking-tight">Línea Física Chile</p>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest mt-0.5 text-primary">Infraestructura Real (+56)</p>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-5">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Plan Seleccionado</span>
                                <span className="text-[#111318] dark:text-white font-black text-xl uppercase tracking-tight">{planName}</span>
                                <span className="text-[10px] font-bold text-slate-500 mt-1">{planDetails.limit} Créditos Mensuales</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[#111318] dark:text-white font-black text-xl">${planDetails.price.toFixed(2)}</span>
                                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-widest">/ Mes</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                           {planDetails.features.map((f, i) => (
                             <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                                {f}
                             </div>
                           ))}
                        </div>

                        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-4">
                            <div className="flex items-start gap-3 mb-3">
                                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" style={{fontSize: '20px'}}>verified_user</span>
                                <div className="flex flex-col">
                                    <p className="text-emerald-800 dark:text-emerald-300 text-sm font-black leading-tight uppercase tracking-tight">7 Días de Prueba Gratis</p>
                                    <p className="text-emerald-700 dark:text-emerald-400/80 text-[11px] font-medium leading-relaxed mt-1">Disfruta de la potencia total de TELSIM sin cargos iniciales.</p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-emerald-500/10 flex justify-between items-center">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Primer cobro:</span>
                                <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">{billingDate}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mb-6 px-2">
                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-[11px] font-black uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span>${planDetails.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 text-[11px] font-black uppercase tracking-widest">
                        <span>Descuento Trial (7 días)</span>
                        <span>-${planDetails.price.toFixed(2)}</span>
                    </div>
                    <div className="my-2 h-px w-full bg-gray-200 dark:bg-gray-800"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-[#111318] dark:text-white text-lg font-black uppercase tracking-tighter">Total a pagar hoy</span>
                        <span className="text-[#111318] dark:text-white text-3xl font-black tracking-tighter">$0.00</span>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-6 pb-10">
                <button 
                    onClick={handleNext}
                    disabled={isNavigating}
                    className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden"
                >
                    <div className="w-12"></div>
                    <span className="text-[17px] tracking-wide uppercase">
                        Iniciar Prueba Gratis
                    </span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <span className="material-symbols-outlined text-white">arrow_forward</span>
                    </div>
                </button>
            </div>
        </div>
    </div>
  );
};

export default Summary;