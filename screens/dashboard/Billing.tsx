import React from 'react';
import { useNavigate } from 'react-router-dom';

const Billing: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen relative pb-20">
             <header className="flex items-center justify-between px-6 py-5 bg-background-light dark:bg-background-dark sticky top-0 z-20">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-800 dark:text-white">
                    <span className="material-icons-round">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Suscripción y Facturación</h1>
                <div className="w-10"></div>
            </header>

            <main className="px-5 space-y-8">
                <section>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 px-1 uppercase tracking-wide opacity-80">Tu Plan Actual</h3>
                    <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-5 shadow-soft border border-slate-100 dark:border-slate-700/50 flex flex-col gap-4 relative overflow-hidden">
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-2xl opacity-60 pointer-events-none"></div>
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <div className="text-xl font-extrabold text-slate-900 dark:text-white">Telsim Flex (Basic)</div>
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Renovación automática el 24 Oct</div>
                            </div>
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 uppercase tracking-wide shadow-sm">
                                Activo
                            </span>
                        </div>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full relative z-10"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-6 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-slate-500 uppercase italic">Visa</span>
                                </div>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">•••• 4242</span>
                            </div>
                            <button className="text-xs font-semibold text-primary hover:text-blue-600 transition-colors">Cambiar</button>
                        </div>
                    </div>
                </section>

                <section>
                    <button className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-900/50 flex items-center justify-center relative transition-all active:scale-[0.98]">
                        <span>Mejorar a Pro</span>
                        <span className="material-icons-round absolute right-4 text-white/80">arrow_forward</span>
                    </button>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide opacity-80">Métodos de Pago</h3>
                    </div>
                    <button className="w-full flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed hover:border-primary/50 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all group active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                <span className="material-icons-round text-xl">add_card</span>
                            </div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Agregar Tarjeta</span>
                        </div>
                        <span className="material-icons-round text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
                    </button>
                </section>

                <section>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 px-1 uppercase tracking-wide opacity-80">Historial de Pagos</h3>
                    <div className="bg-surface-light dark:bg-surface-dark rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                        {[
                            { month: 'OCT', day: '24', price: '$14.00' },
                            { month: 'SEP', day: '24', price: '$14.00' },
                            { month: 'AGO', day: '24', price: '$14.00' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700">
                                        <span className="text-[9px] font-bold uppercase tracking-wider">{item.month}</span>
                                        <span className="text-lg font-extrabold text-slate-700 dark:text-slate-300">{item.day}</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">Suscripción Flex</div>
                                        <div className="text-xs font-medium text-slate-500">Cobro automático</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-slate-900 dark:text-white text-sm">-{item.price}</span>
                                    <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                        <span className="material-icons-round text-lg">picture_as_pdf</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Billing;