
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, Clock, ShoppingCart, Zap, ArrowRight, CheckCircle2, Flame, Timer } from 'lucide-react';

const SniperBots: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: <Timer className="size-6" />,
      title: "1. Reserva de Puerto Flash",
      desc: "Nuestras SIMs de baja latencia se reservan exclusivamente para tu cuenta minutos antes del drop, garantizando disponibilidad total."
    },
    {
      icon: <Zap className="size-6" />,
      title: "2. Disparo Instantáneo",
      desc: "Tu bot detecta el SMS al instante. No hay colas de espera ni procesamiento compartido. El código se entrega en milisegundos."
    },
    {
      icon: <ShoppingCart className="size-6" />,
      title: "3. Checkout Exitoso",
      desc: "Supera la verificación SMS de la pasarela de pago antes de que el stock se agote. Ideal para lanzamientos de segundos."
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-32">
      {/* Header Estilo Sniper/Precision */}
      <div className="relative h-72 overflow-hidden bg-[#1A1005]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 via-orange-600/10 to-transparent z-10"></div>
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute top-40 right-10 w-48 h-48 bg-orange-600 rounded-full blur-[80px]"></div>
        </div>
        
        <header className="relative z-20 flex items-center justify-between px-6 py-5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full bg-white/5 backdrop-blur-md text-white border border-white/10">
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">Protocolo Low Latency</span>
          <div className="w-9"></div>
        </header>

        <div className="relative z-20 px-8 pt-6 flex flex-col items-center text-center">
          <div className="size-20 bg-gradient-to-b from-amber-400 to-orange-600 rounded-3xl border border-white/20 flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)] transform -rotate-6">
            <Target className="size-10 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
            Sniper <span className="text-amber-400">Bots</span>
          </h1>
        </div>
      </div>

      <main className="px-6 -mt-8 relative z-30 space-y-8">
        {/* Speed Metrics Card */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <Flame className="text-orange-500 size-5 shrink-0" />
            <p className="text-[11px] font-black text-orange-700 dark:text-amber-400 uppercase tracking-tight">
              Diseñado para Drops de Alta Demanda
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center text-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">&lt; 450ms</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Latencia SMS</span>
             </div>
             <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center text-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">99.9%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tasa de Éxito</span>
             </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed text-center px-4">
            Cada milisegundo cuenta. Nuestra arquitectura omite el procesamiento en nube estándar para entregar el código directamente a tu socket.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Estrategia de Ejecución</h3>
          {steps.map((step, idx) => (
            <div key={idx} className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft flex items-start gap-5 group transition-all">
              <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/30 group-hover:scale-110 transition-transform duration-300">
                {step.icon}
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white mb-1">{step.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Compatible Stores */}
        <div className="bg-slate-900 dark:bg-orange-950/20 rounded-[2.5rem] p-8 border border-white/5">
          <div className="flex items-center gap-3 mb-6">
             <div className="size-2 bg-amber-500 rounded-full animate-pulse"></div>
             <h3 className="text-sm font-black text-white uppercase tracking-widest">Tiendas Compatibles</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              "Nike SNKRS", "Ticketmaster", "Adidas Confirmed", 
              "Supreme NYC", "PlayStation Direct", "NVIDIA Store",
              "Foot Locker", "DICE FM"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                <CheckCircle2 className="size-3 text-amber-500" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Floating CTA */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/90 dark:via-background-dark/90 to-transparent z-40">
        <button 
          onClick={() => navigate('/onboarding/region')}
          className="group w-full max-w-md mx-auto h-16 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(234,88,12,0.3)] flex items-center justify-between px-2 transition-all active:scale-[0.98]"
        >
          <div className="w-12"></div>
          <span className="text-[15px] uppercase tracking-widest">Activar Sniper Mode</span>
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-colors">
            <ArrowRight className="size-6" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default SniperBots;
