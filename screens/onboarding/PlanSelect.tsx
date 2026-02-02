import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PlanSelect: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<'basic' | 'power'>('basic');

  const handleNext = () => {
    // Exact strings requested for Webhook logic
    const planName = selected === 'basic' ? 'Telsim Flex (Basic)' : 'Telsim Power (Pro)';
    navigate('/onboarding/summary', { state: { planName } });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 relative overflow-x-hidden">
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 pointer-events-none"></div>
        
        <main className="w-full max-w-md mx-auto px-6 py-4 flex flex-col h-full min-h-[100dvh]">
            <header className="flex items-center justify-between mb-6 relative z-10 pt-2">
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Selección de Plan</h2>
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
                    Selecciona la potencia que necesita tu comunicación.
                </p>
            </div>

            <div className="flex flex-col gap-4 flex-1 mb-6">
                {/* Flex Plan */}
                <div 
                    onClick={() => setSelected('basic')}
                    className={`relative bg-white dark:bg-surface-dark rounded-2xl p-5 border-2 transition-all cursor-pointer ${selected === 'basic' ? 'border-blue-500 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.15)]' : 'border-slate-200 dark:border-slate-700'}`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3 items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined text-[20px]">sim_card</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">Telsim Flex</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Plan Básico</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded">15 DÍAS GRATIS</span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selected === 'basic' ? 'bg-blue-500' : 'border-2 border-slate-300'}`}>
                                {selected === 'basic' && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                            </div>
                        </div>
                    </div>
                    <div className="mb-5 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">$13.90</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">/mes</span>
                        </div>
                    </div>
                    <ul className="space-y-3">
                        {["SIM Física Real (Non-VoIP)", "Validaciones Ilimitadas", "Activación Manual", "Dashboard Web"].map((feat, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[14px]">check</span>
                                </div>
                                {feat}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Power Plan */}
                <div 
                     onClick={() => setSelected('power')}
                     className={`relative bg-white dark:bg-surface-dark rounded-2xl p-5 border-2 transition-all cursor-pointer ${selected === 'power' ? 'border-blue-500 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.15)]' : 'border-slate-200 dark:border-slate-700'}`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3 items-center">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">bolt</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">Telsim Power</h3>
                                    <span className="text-yellow-500 material-symbols-outlined text-[18px] fill-1">bolt</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Pro & Automation</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-600">RECOMENDADO</span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selected === 'power' ? 'bg-blue-500' : 'border-2 border-slate-300 dark:border-slate-600'}`}>
                                {selected === 'power' && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                            </div>
                        </div>
                    </div>
                    <div className="mb-5 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">$99.00</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">/mes</span>
                        </div>
                    </div>
                    <ul className="space-y-3">
                        {["Todo lo del Basic", "Puerto Dedicado 24/7", "Webhooks y API Access", "Soporte Prioritario"].map((feat, i) => (
                             <li key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[14px]">check</span>
                                </div>
                                {feat}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="flex flex-col gap-4 mt-auto">
                <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-[11px] font-medium text-center px-4">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                     Pagos seguros y encriptados. Cancela cuando quieras.
                </div>
                <button 
                    onClick={handleNext}
                    className="group w-full bg-primary hover:bg-primary-dark active:scale-[0.99] transition-all text-white font-bold h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden"
                >
                    <span className="absolute inset-0 w-full h-full bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                    <div className="w-12"></div>
                    <span className="text-lg tracking-wide z-10">Siguiente</span>
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