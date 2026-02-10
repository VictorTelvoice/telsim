import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// CONFIGURACIÓN INMUTABLE DE PRECIOS TELSIM
const OFFICIAL_PLANS = {
  Starter: { amount: 19.90, limit: 150 },
  Pro:     { amount: 39.90, limit: 400 },
  Power:   { amount: 99.00, limit: 1400 }
};

const PlanSelect: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<'Starter' | 'Pro' | 'Power'>('Pro');

  const plans = [
    {
      id: 'Starter',
      name: 'Starter',
      subtitle: '150 Créditos SMS',
      price: OFFICIAL_PLANS.Starter.amount,
      limit: OFFICIAL_PLANS.Starter.limit,
      icon: 'shield',
      idealFor: 'Usuarios individuales y Desarrolladores.',
      features: [
        'Número SIM Real (no VoIP baratos)',
        'Notificaciones en tiempo real',
        'Visualización en App',
        'Capacidad: 150 SMS mensuales',
        'Soporte técnico vía Ticket'
      ],
      recommended: false
    },
    {
      id: 'Pro',
      name: 'Pro',
      subtitle: '400 Créditos SMS',
      price: OFFICIAL_PLANS.Pro.amount,
      limit: OFFICIAL_PLANS.Pro.limit,
      icon: 'bolt',
      idealFor: 'Equipos DevOps y Automatizadores.',
      popularBadge: 'MÁS POPULAR',
      features: [
        'Todo lo incluido en Starter',
        'SMS 100% automatizados (Sin intervención)',
        'Acceso a API y Webhooks',
        'Capacidad: 400 SMS mensuales',
        'Soporte técnico vía Ticket y Chat en vivo'
      ],
      recommended: true
    },
    {
      id: 'Power',
      name: 'Power',
      subtitle: '1,400 Créditos SMS',
      price: OFFICIAL_PLANS.Power.amount,
      limit: OFFICIAL_PLANS.Power.limit,
      icon: 'electric_bolt',
      idealFor: 'Fintech, Corporativos y Plataformas P2P.',
      features: [
        'Todo lo incluido en Pro',
        'Seguridad y Control Empresarial',
        'Integraciones Personalizadas y Escalabilidad',
        'Capacidad: 1,400 SMS mensuales',
        'Soporte Prioritario 24/7'
      ],
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

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 relative overflow-x-hidden font-display">
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 pointer-events-none"></div>
        
        <main className="w-full max-w-md mx-auto px-6 py-4 flex flex-col h-full min-h-[100dvh] pb-32">
            <header className="flex items-center justify-between mb-4 relative z-10 pt-2">
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Marketplace</h2>
                <div className="w-10"></div> 
            </header>

            <div className="flex gap-2 mb-6 w-full px-1">
                <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-1.5 flex-1 rounded-full bg-primary"></div>
                <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            </div>

            <div className="text-center mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                    Elige tu plan
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-[32ch] mx-auto">
                    Selecciona la potencia de tu nueva línea privada
                </p>
            </div>

            <div className="flex flex-col gap-3 flex-1 mb-6">
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        onClick={() => setSelected(plan.id as any)}
                        className={`relative bg-white dark:bg-surface-dark rounded-[2rem] p-5 border-2 transition-all cursor-pointer ${
                          selected === plan.id 
                          ? 'border-primary shadow-[0_15px_30px_-10px_rgba(29,78,216,0.1)] ring-1 ring-primary/10 scale-[1.01]' 
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                    >
                        {plan.popularBadge && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-lg border border-white/20 uppercase tracking-widest z-10">
                            {plan.popularBadge}
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-1">
                            <div className="flex gap-3 items-center">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                  selected === plan.id ? 'bg-primary text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                                }`}>
                                    <span className="material-symbols-outlined text-[22px]">{plan.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight uppercase tracking-tight">{plan.name}</h3>
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">{plan.subtitle}</p>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                              selected === plan.id ? 'bg-primary border-primary' : 'border-slate-200 dark:border-slate-700'
                            }`}>
                                {selected === plan.id && <span className="material-symbols-outlined text-white text-[14px] font-black">check</span>}
                            </div>
                        </div>

                        <div className="mb-4 border-b border-slate-50 dark:border-slate-800 pb-3 pt-1">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">${plan.price.toFixed(2)}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest ml-1">/mes</span>
                            </div>
                        </div>

                        <ul className="space-y-2 mb-5">
                            {plan.features.map((feat, i) => (
                                <li key={i} className="flex items-start gap-3 text-[12px] text-slate-600 dark:text-slate-300 font-semibold leading-snug">
                                    <div className="w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100 dark:border-blue-800">
                                        <span className="material-symbols-outlined text-primary dark:text-blue-400 text-[12px] font-black">done</span>
                                    </div>
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 lowercase flex items-center gap-1">
                            ideal para: <span className="text-slate-500 dark:text-slate-300 italic font-bold ml-0.5">{plan.idealFor}</span>
                          </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 to-transparent z-40">
                <button 
                    onClick={handleNext}
                    className="group w-full max-w-md mx-auto bg-primary hover:bg-blue-700 active:scale-[0.99] transition-all text-white font-black h-16 rounded-[1.5rem] shadow-button flex items-center justify-between px-2 relative overflow-hidden"
                >
                    <div className="w-12"></div>
                    <span className="text-lg tracking-wide z-10 uppercase text-[15px]">
                      Configurar Plan {selected}
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