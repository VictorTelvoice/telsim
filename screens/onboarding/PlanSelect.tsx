import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const PlanSelect: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<'Starter' | 'Pro' | 'Power'>('Pro');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DEFINICIÓN ÚNICA Y VERIFICADA DE PLANES TELSIM
  const plans = [
    {
      id: 'Starter',
      name: 'Starter',
      subtitle: '150 Créditos SMS',
      price: 19.90, // PRECIO NUEVO
      limit: 150,
      icon: 'shield',
      features: ["Acceso API", "Webhooks", "Soporte Email"],
      recommended: false
    },
    {
      id: 'Pro',
      name: 'Pro',
      subtitle: '400 Créditos SMS',
      price: 39.90, // PRECIO NUEVO
      limit: 400,
      icon: 'bolt',
      features: ["Todo lo del Starter", "Prioridad de Red", "Soporte Chat"],
      recommended: true
    },
    {
      id: 'Power',
      name: 'Power',
      subtitle: '1,400 Créditos SMS',
      price: 99.00, // PRECIO NUEVO
      limit: 1400,
      icon: 'electric_bolt',
      features: ["Infraestructura Dedicada", "Soporte 24/7"],
      recommended: false
    }
  ];

  const handleNext = async () => {
    const selectedPlan = plans.find(p => p.id === selected);
    if (!selectedPlan) return;

    setIsSubmitting(true);
    
    // EXTRACCIÓN DE VALORES LITERALES PARA EL BACKEND
    const p_plan_name = selectedPlan.name;
    const p_amount = selectedPlan.price;
    const p_monthly_limit = selectedPlan.limit;

    try {
      // LLAMADA RPC CON VALORES GARANTIZADOS (19.90, 39.90, 99.00)
      await supabase.rpc('purchase_subscription', {
        p_plan_name: p_plan_name,
        p_amount: p_amount,
        p_monthly_limit: p_monthly_limit
      });

      // Navegación al resumen inyectando el estado exacto
      navigate('/onboarding/summary', { 
        state: { 
          planName: p_plan_name,
          price: p_amount,
          monthlyLimit: p_monthly_limit
        } 
      });
    } catch (error) {
      console.error("Error al procesar suscripción:", error);
      // Fallback: Permitir avance visual pero manteniendo la integridad del dato seleccionado
      navigate('/onboarding/summary', { 
        state: { 
          planName: p_plan_name,
          price: p_amount,
          monthlyLimit: p_monthly_limit
        } 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 relative overflow-x-hidden font-display">
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 pointer-events-none"></div>
        
        <main className="w-full max-w-md mx-auto px-6 py-4 flex flex-col h-full min-h-[100dvh] pb-32">
            <header className="flex items-center justify-between mb-6 relative z-10 pt-2">
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Marketplace</h2>
                <div className="w-10"></div> 
            </header>

            <div className="flex gap-2 mb-8 w-full px-1">
                <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-1.5 flex-1 rounded-full bg-primary"></div>
                <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            </div>

            <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                    Elige tu plan
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-[32ch] mx-auto">
                    Selecciona la potencia de tu nueva línea privada
                </p>
            </div>

            <div className="flex flex-col gap-4 flex-1 mb-6">
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        onClick={() => setSelected(plan.id as any)}
                        className={`relative bg-white dark:bg-surface-dark rounded-2xl p-5 border-2 transition-all cursor-pointer ${
                          selected === plan.id 
                          ? 'border-primary shadow-[0_4px_20px_-2px_rgba(29,78,216,0.15)]' 
                          : 'border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-3 items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  selected === plan.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                    <span className="material-symbols-outlined text-[20px]">{plan.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight uppercase tracking-tight">{plan.name}</h3>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{plan.subtitle}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {plan.recommended && (
                                  <span className="bg-primary/10 text-primary text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">Recomendado</span>
                                )}
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                                  selected === plan.id ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                    {selected === plan.id && <span className="material-symbols-outlined text-white text-[16px] font-black">check</span>}
                                </div>
                            </div>
                        </div>
                        <div className="mb-5 border-b border-slate-100 dark:border-slate-700 pb-4">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">${plan.price.toFixed(2)}</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">/mes</span>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            {plan.features.map((feat, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-primary dark:text-blue-400 text-[14px] font-black">check</span>
                                    </div>
                                    {feat}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/90 to-transparent z-40">
                <button 
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="group w-full max-w-md mx-auto bg-primary hover:bg-blue-700 active:scale-[0.99] transition-all text-white font-black h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden"
                >
                    <div className="w-12"></div>
                    <span className="text-lg tracking-wide z-10 uppercase text-[15px]">
                      {isSubmitting ? 'Procesando...' : `Suscribirse al Plan ${selected}`}
                    </span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm z-10 group-hover:bg-white/30 transition-colors">
                        {isSubmitting ? (
                          <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined text-white text-[24px]">arrow_forward</span>
                        )}
                    </div>
                </button>
            </div>
        </main>
    </div>
  );
};

export default PlanSelect;