import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Added MessageSquare to the lucide-react imports
import { CheckCircle2, ShieldCheck, Zap, ArrowRight, Smartphone, MessageSquare } from 'lucide-react';

const Summary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const planName = location.state?.planName || 'Pro';
  const price = location.state?.price || '39.90';
  const monthlyLimit = location.state?.monthlyLimit || 400;

  const handleNext = () => {
    navigate('/onboarding/payment', { 
      state: { planName, price, monthlyLimit } 
    });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center bg-background-light/90 dark:bg-background-dark/90 px-4 py-3 backdrop-blur-sm">
                <div 
                    onClick={() => navigate('/onboarding/plan')}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{fontSize: '24px'}}>arrow_back</span>
                </div>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10 uppercase tracking-widest text-[11px]">Resumen de Pedido</h2>
            </div>
            
            <div className="flex flex-col gap-2 px-6 pt-2 pb-4">
                <div className="flex justify-between items-center">
                    <p className="text-primary dark:text-blue-400 text-[10px] font-black uppercase tracking-widest leading-normal">Paso 3 de 3</p>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Finalizar</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-gray-700 overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500 ease-out" style={{width: '100%'}}></div>
                </div>
            </div>

            <div className="flex-1 flex flex-col px-6 pb-40 overflow-y-auto">
                <div className="pb-8 pt-4">
                    <h1 className="text-[#111318] dark:text-white tracking-tight text-3xl font-black leading-tight mb-2">Revisa tu suscripción</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed">Confirma los detalles de tu nueva infraestructura física.</p>
                </div>

                <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#1A2230] shadow-soft border border-slate-100 dark:border-slate-800 mb-8 transition-transform hover:scale-[1.01] duration-300">
                    <div className="flex items-center gap-4 p-6 border-b border-slate-50 dark:border-gray-700/50">
                        <div className="size-14 shrink-0 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-2xl border border-blue-100 dark:border-blue-800">
                           🇨🇱
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#111318] dark:text-white text-[15px] font-black uppercase tracking-tight">Número de Chile (+56)</p>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">SIM Física (Non-VoIP)</p>
                        </div>
                    </div>
                    <div className="p-6 flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 block mb-1">Plan Seleccionado</span>
                                <span className="text-primary dark:text-blue-400 font-black text-xl uppercase tracking-tighter">TELSIM {planName}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[#111318] dark:text-white font-black text-xl tracking-tighter">${price}</span>
                                <span className="text-[10px] font-bold text-gray-400 block">Mensual</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Capacidad</span>
                                <div className="flex items-center gap-1.5">
                                    <MessageSquare className="size-3 text-primary" />
                                    <span className="text-[13px] font-black dark:text-white">{monthlyLimit} SMS</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Automatización</span>
                                <div className="flex items-center gap-1.5">
                                    <Zap className="size-3 text-amber-500" />
                                    <span className="text-[13px] font-black dark:text-white uppercase tracking-tighter">API ACTIVA</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-4 flex items-start gap-4">
                            <CheckCircle2 className="size-6 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                                <p className="text-emerald-800 dark:text-emerald-300 text-[13px] font-black uppercase tracking-tight mb-1">Activación Inmediata</p>
                                <p className="text-emerald-700/70 dark:text-emerald-400/80 text-[11px] font-medium leading-relaxed italic">Tu puerto físico se asignará automáticamente al confirmar el pago.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 mb-6 px-1">
                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-sm font-bold">
                        <span className="uppercase tracking-widest text-[10px]">Subtotal</span>
                        <span className="tabular-nums">${price}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                        <span className="uppercase tracking-widest text-[10px]">Cuota de Activación</span>
                        <span className="uppercase tracking-widest text-[10px]">Gratis</span>
                    </div>
                    <div className="my-2 h-px w-full bg-slate-100 dark:bg-gray-800"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-[#111318] dark:text-white text-lg font-black uppercase tracking-widest">Total hoy</span>
                        <span className="text-[#111318] dark:text-white text-3xl font-black tracking-tighter tabular-nums">${price}</span>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/80 dark:bg-[#101622]/85 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 p-6 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={handleNext}
                    className="relative group w-full overflow-hidden rounded-2xl bg-primary p-4 h-16 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] hover:shadow-blue-500/40"
                >
                    <div className="relative flex w-full items-center justify-between px-2">
                        <span className="text-white text-[15px] font-black uppercase tracking-widest">Confirmar y Pagar</span>
                        <div className="size-10 flex items-center justify-center rounded-xl bg-white/20 transition-transform group-hover:translate-x-1">
                            <ArrowRight className="size-5 text-white" />
                        </div>
                    </div>
                </button>
                <div className="mt-5 flex items-center justify-center gap-2 opacity-40">
                    <ShieldCheck className="size-4 text-gray-500 dark:text-gray-400" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 text-center">Transacción Encriptada 256-bit</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Summary;