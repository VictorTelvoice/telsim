
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ShieldCheck, ShoppingCart, Search, Lock, ArrowRight, CheckCircle2, Store } from 'lucide-react';

const SecureShopping: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: <Search className="size-6" />,
      title: "1. Identidad Transaccional",
      desc: "Activa un número exclusivo para tus perfiles de Marketplace, MercadoLibre o Amazon."
    },
    {
      icon: <ShieldCheck className="size-6" />,
      title: "2. Publica sin Riesgos",
      desc: "Evita que scrapers y estafadores cosechen tu número personal de tus anuncios públicos."
    },
    {
      icon: <ShoppingCart className="size-6" />,
      title: "3. Checkout Verificado",
      desc: "Recibe códigos 3D Secure y validaciones de pasarelas de pago directamente en tu panel."
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-32">
      {/* Header Estilo Premium Shopping */}
      <div className="relative h-72 overflow-hidden bg-[#061B14]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 via-slate-900/60 to-transparent z-10"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-64 h-64 bg-emerald-500 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-blue-600 rounded-full blur-[100px]"></div>
        </div>
        
        <header className="relative z-20 flex items-center justify-between px-6 py-5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 transition-colors hover:bg-white/20">
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Protocolo Secure-Trade</span>
          <div className="w-9"></div>
        </header>

        <div className="relative z-20 px-8 pt-6 flex flex-col items-center text-center">
          <div className="size-20 bg-emerald-500 rounded-3xl border border-white/20 flex items-center justify-center text-white mb-6 shadow-[0_20px_40px_rgba(16,185,129,0.3)] transform rotate-3">
            <ShoppingBag className="size-10" />
          </div>
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
            Compras <span className="text-emerald-400">Seguras</span>
          </h1>
          <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mt-2">Protección de Datos en Marketplace</p>
        </div>
      </div>

      <main className="px-6 -mt-8 relative z-30 space-y-8">
        {/* Value Proposition Card */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 shadow-soft border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
            <Lock className="text-emerald-600 size-5 shrink-0" />
            <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
              Escudo contra Spam y Fraude Digital
            </p>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed text-center px-4">
            No permitas que extraños en internet tengan tu número personal. Utiliza una SIM secundaria física para gestionar todas tus ventas y compras.
          </p>
        </div>

        {/* The Steps */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Guía de Configuración</h3>
          {steps.map((step, idx) => (
            <div key={idx} className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft flex items-start gap-5 group transition-all hover:border-emerald-500/30">
              <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/30 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
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

        {/* Compatibility Section */}
        <div className="bg-slate-900 dark:bg-emerald-950/20 rounded-[2.5rem] p-8 border border-white/5">
          <div className="flex items-center gap-3 mb-6">
             <Store className="text-emerald-400 size-5" />
             <h3 className="text-sm font-black text-white uppercase tracking-widest">Plataformas Soportadas</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              "MercadoLibre", "Facebook Marketplace", 
              "Amazon", "AliExpress",
              "Wallapop", "eBay Chile"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                <CheckCircle2 className="size-3 text-emerald-500" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Trust Info */}
        <div className="flex flex-col items-center text-center gap-2 py-4 opacity-30">
            <ShieldCheck className="size-6 text-slate-400" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">TELSIM SECURE TRANSACTION v1.0</p>
        </div>
      </main>

      {/* Floating CTA */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/90 dark:via-background-dark/90 to-transparent z-40">
        <button 
          onClick={() => navigate('/onboarding/region')}
          className="group w-full max-w-md mx-auto h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] flex items-center justify-between px-2 transition-all active:scale-[0.98]"
        >
          <div className="w-12"></div>
          <span className="text-[15px] uppercase tracking-widest">Activar Protección</span>
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-colors">
            <ArrowRight className="size-6" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default SecureShopping;
