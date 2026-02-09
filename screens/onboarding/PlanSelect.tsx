import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const OFFICIAL_PLANS = {
  Starter: { amount: 19.90, limit: 150 },
  Pro:     { amount: 39.90, limit: 400 },
  Power:   { amount: 99.00, limit: 1400 }
};

const PlanSelect: React.FC = () => {
  const navigate = useNavigate();
  const { loading } = useAuth();
  const [selected, setSelected] = useState<'Starter' | 'Pro' | 'Power'>('Pro');

  const plans = [
    {
      id: 'Starter',
      name: 'Starter',
      subtitle: '150 Créditos SMS',
      price: OFFICIAL_PLANS.Starter.amount,
      limit: OFFICIAL_PLANS.Starter.limit,
      icon: 'shield',
      features: ["Acceso API", "Webhooks", "Soporte Email"],
      recommended: false
    },
    {
      id: 'Pro',
      name: 'Pro',
      subtitle: '400 Créditos SMS',
      price: OFFICIAL_PLANS.Pro.amount,
      limit: OFFICIAL_PLANS.Pro.limit,
      icon: 'bolt',
      features: ["Todo lo del Starter", "Prioridad de Red", "Soporte Chat"],
      recommended: true
    },
    {
      id: 'Power',
      name: 'Power',
      subtitle: '1,400 Créditos SMS',
      price: OFFICIAL_PLANS.Power.amount,
      limit: OFFICIAL_PLANS.Power.limit,
      icon: 'electric_bolt',
      features: ["Infraestructura Dedicada", "Soporte 24/7"],
      recommended: false
    }
  ];

  const handleNext = () => {
    const planConfig = OFFICIAL_PLANS[selected];
    navigate('/onboarding/summary', { 
      state: { 
        planName: selected,
        price: planConfig.amount,
        monthlyLimit: planConfig.limit
      } 
    });
  };

  if (loading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 relative overflow-x-hidden font-display">
        <main className="w-full max-w-md mx-auto px-6 py-4 flex flex-col h-full min-h-[100dvh] pb-32">
            <header className="flex items-center justify-between mb-6 relative z-10 pt-2">
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Suscripción</h2>
                <div className="w-10"></div> 
            </header>

            <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                    Elige el plan
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-[32ch] mx-auto">
                    Añade una nueva línea de alta potencia a tu panel.
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
                            {plan.recommended && (
                              <span className="bg-primary/10 text-primary text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">Top Ventas</span>
                            )}
                        </div>
                        <div className="mb-2">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">${plan.price.toFixed(2)}</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">/mes</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/90 dark:via-background-dark/90 to-transparent z-40">
                <button 
                    onClick={handleNext}
                    className="group w-full max-w-md mx-auto bg-primary hover:bg-blue-700 active:scale-[0.99] transition-all text-white font-black h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden"
                >
                    <div className="w-12"></div>
                    <span className="text-lg tracking-wide z-10 uppercase text-[15px]">
                      Configurar Nueva Línea
                    </span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm z-10 group-hover:bg-white/30 transition-colors">
                        <span className="material-symbols-outlined text-white text-[24px]">arrow_forward</span>
                    </div>
                </button>
            </div>
        </main>
    </div>
  );
};

export default PlanSelect;